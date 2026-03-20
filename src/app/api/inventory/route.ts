/**
 * Script & Service Inventory API
 * GET /api/inventory
 * Scans workspace for scripts and lists systemd user services
 */
import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";

export const dynamic = "force-dynamic";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || "/home/jasonrobey/.openclaw/workspace";
const PATH_ENV = { ...process.env, PATH: `/home/jasonrobey/.npm-global/bin:${process.env.PATH}` };

interface ScriptEntry {
  name: string;
  path: string;
  relativePath: string;
  ext: string;
  sizeBytes: number;
  lastModified: string;
  description: string;
}

interface ServiceEntry {
  name: string;
  unit: string;
  status: "active" | "inactive" | "failed" | "unknown";
  description: string;
  since: string;
}

function extractDescription(filePath: string, ext: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n").slice(0, 10);
    for (const line of lines) {
      const trimmed = line.trim();
      // Python/bash comment
      if (trimmed.startsWith("#") && !trimmed.startsWith("#!")) {
        const desc = trimmed.replace(/^#+\s*/, "").trim();
        if (desc.length > 5) return desc;
      }
    }
  } catch {}
  return "";
}

function scanScripts(dir: string, results: ScriptEntry[] = [], depth = 0): ScriptEntry[] {
  if (depth > 3) return results;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (["node_modules", ".next", "__pycache__", "venv", ".git"].includes(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanScripts(fullPath, results, depth + 1);
      } else if (entry.isFile()) {
        const ext = entry.name.split(".").pop()?.toLowerCase() || "";
        if (["py", "sh"].includes(ext)) {
          const stat = statSync(fullPath);
          results.push({
            name: entry.name,
            path: fullPath,
            relativePath: relative(WORKSPACE, fullPath),
            ext,
            sizeBytes: stat.size,
            lastModified: stat.mtime.toISOString(),
            description: extractDescription(fullPath, ext),
          });
        }
      }
    }
  } catch {}
  return results;
}

function getServices(): ServiceEntry[] {
  try {
    const output = execSync(
      "systemctl --user list-units --type=service --all --output=json --no-pager 2>/dev/null",
      { timeout: 5000, encoding: "utf-8", env: PATH_ENV }
    );
    const units = JSON.parse(output);
    return units
      .filter((u: any) => u.unit && !u.unit.startsWith("dbus") && !u.unit.includes("@"))
      .map((u: any) => ({
        name: u.unit.replace(".service", ""),
        unit: u.unit,
        status: u.active === "active" ? "active" : u.active === "failed" ? "failed" : "inactive",
        description: u.description || "",
        since: u.activesince || "",
      }));
  } catch {
    // Fallback: parse text output
    try {
      const output = execSync(
        "systemctl --user list-units --type=service --all --no-pager 2>/dev/null",
        { timeout: 5000, encoding: "utf-8", env: PATH_ENV }
      );
      const services: ServiceEntry[] = [];
      for (const line of output.split("\n")) {
        const match = line.match(/^\s*([✓●✗\s]?)\s*([\w\-\.]+\.service)\s+(\S+)\s+(\S+)\s+(.+)$/);
        if (match) {
          services.push({
            name: match[2].replace(".service", ""),
            unit: match[2],
            status: match[4] === "running" ? "active" : match[3] === "failed" ? "failed" : "inactive",
            description: match[5]?.trim() || "",
            since: "",
          });
        }
      }
      return services;
    } catch {
      return [];
    }
  }
}

export async function GET() {
  try {
    const scripts = scanScripts(WORKSPACE);
    scripts.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    const services = getServices();

    return NextResponse.json({
      scripts,
      services,
      scannedAt: new Date().toISOString(),
      workspaceRoot: WORKSPACE,
    });
  } catch (error) {
    console.error("[inventory] Error:", error);
    return NextResponse.json({ error: "Failed to scan inventory" }, { status: 500 });
  }
}
