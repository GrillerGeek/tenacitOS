/**
 * Home Assistant Health API
 * GET /api/ha-health
 * Reads ha-monitor.json state and journalctl logs
 */
import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

export const dynamic = "force-dynamic";

const HA_MONITOR_PATH = "/home/jasonrobey/.openclaw/state/ha-monitor.json";
const PATH_ENV = { ...process.env, PATH: `/home/jasonrobey/.npm-global/bin:${process.env.PATH}` };

interface HAEvent {
  timestamp: string;
  type: "reboot" | "failure" | "recovery" | "check";
  message: string;
}

function parseJournalEvents(): HAEvent[] {
  const events: HAEvent[] = [];
  try {
    const output = execSync(
      `journalctl --user -u garage-monitor.service -n 200 --no-pager --output=short-iso 2>/dev/null`,
      { timeout: 5000, encoding: "utf-8", env: PATH_ENV }
    );
    for (const line of output.split("\n")) {
      if (!line.trim()) continue;
      // Parse timestamp from short-iso format: 2026-03-19T10:00:00+0000
      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4})/);
      if (!tsMatch) continue;
      const ts = new Date(tsMatch[1]).toISOString();
      const msg = line.slice(tsMatch[1].length).trim();

      if (msg.includes("Connection refused") || msg.includes("down") || msg.includes("failed")) {
        events.push({ timestamp: ts, type: "failure", message: msg.slice(0, 120) });
      } else if (msg.includes("recovered") || msg.includes("back online") || msg.includes("reachable")) {
        events.push({ timestamp: ts, type: "recovery", message: msg.slice(0, 120) });
      } else if (msg.includes("reboot") || msg.includes("restart")) {
        events.push({ timestamp: ts, type: "reboot", message: msg.slice(0, 120) });
      }
    }
  } catch {}
  return events;
}

export async function GET() {
  try {
    // Read monitor state
    let monitorState: any = null;
    if (existsSync(HA_MONITOR_PATH)) {
      try {
        monitorState = JSON.parse(readFileSync(HA_MONITOR_PATH, "utf-8"));
      } catch {}
    }

    // Check current HA reachability
    let currentStatus: "online" | "offline" | "unknown" = "unknown";
    let latencyMs: number | null = null;
    try {
      const start = Date.now();
      execSync("curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://100.107.59.77:8123 2>/dev/null", {
        timeout: 4000, encoding: "utf-8", env: PATH_ENV
      });
      latencyMs = Date.now() - start;
      currentStatus = "online";
    } catch {
      currentStatus = "offline";
    }

    // Parse journal events
    const events = parseJournalEvents();

    // Build uptime segments from events (simplified: failures + recoveries)
    const uptimeSegments: Array<{ start: string; end: string | null; status: "up" | "down" }> = [];
    let lastStatus: "up" | "down" = "up";
    let segStart = events.length > 0
      ? events[events.length - 1].timestamp
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const event of [...events].reverse()) {
      if (event.type === "failure" && lastStatus === "up") {
        uptimeSegments.push({ start: segStart, end: event.timestamp, status: "up" });
        segStart = event.timestamp;
        lastStatus = "down";
      } else if ((event.type === "recovery" || event.type === "reboot") && lastStatus === "down") {
        uptimeSegments.push({ start: segStart, end: event.timestamp, status: "down" });
        segStart = event.timestamp;
        lastStatus = "up";
      }
    }
    uptimeSegments.push({ start: segStart, end: null, status: lastStatus });

    return NextResponse.json({
      currentStatus,
      latencyMs,
      monitorState: monitorState ? {
        totalReboots: monitorState.total_reboots || 0,
        lastRebootAt: monitorState.last_reboot_at || null,
        lastFailureAt: monitorState.last_failure_at || null,
        lastCheckAt: monitorState.last_check_at || null,
        failureCount: monitorState.failure_count || 0,
      } : null,
      recentEvents: events.slice(0, 50),
      uptimeSegments: uptimeSegments.slice(-20),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ha-health] Error:", error);
    return NextResponse.json({ error: "Failed to get HA health" }, { status: 500 });
  }
}
