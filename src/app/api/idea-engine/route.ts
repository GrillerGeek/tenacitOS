/**
 * Idea Engine Status API
 * GET /api/idea-engine
 * Reads sparks from the jason-idea-engine repo
 */
import { NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const IDEA_ENGINE = "/home/jasonrobey/.openclaw/workspace/jason-idea-engine/pipeline/01-sparks";

const DOMAINS = ["personal", "family", "work", "community", "church", "ventures"];

interface IdeaSpark {
  filename: string;
  title: string;
  domain: string;
  status: string;
  scope: string;
  created: string;
  daysOld: number;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w[\w_-]*):\s*(.+)$/);
    if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return fm;
}

export async function GET() {
  try {
    if (!existsSync(IDEA_ENGINE)) {
      return NextResponse.json({ error: "Idea engine not found", path: IDEA_ENGINE }, { status: 404 });
    }

    const files = readdirSync(IDEA_ENGINE).filter(f => f.endsWith(".md"));
    const sparks: IdeaSpark[] = files.map(f => {
      try {
        const content = readFileSync(join(IDEA_ENGINE, f), "utf-8");
        const fm = parseFrontmatter(content);
        const created = fm.created || "";
        const daysOld = created
          ? Math.floor((Date.now() - new Date(created).getTime()) / 86400000)
          : 0;
        return {
          filename: f,
          title: fm.title || f.replace(/^spark-|\.md$/g, "").replace(/-/g, " "),
          domain: fm.domain || "unknown",
          status: fm.status || "spark",
          scope: fm.scope || "",
          created,
          daysOld,
        };
      } catch { return null; }
    }).filter(Boolean) as IdeaSpark[];

    // Domain breakdown
    const domainCounts: Record<string, number> = {};
    for (const s of sparks) {
      const d = s.domain.toLowerCase();
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }

    // Missing domains
    const missingDomains = DOMAINS.filter(d => !domainCounts[d]);

    // Aging sparks (>30 days old)
    const agingSparks = sparks
      .filter(s => s.daysOld > 30)
      .sort((a, b) => b.daysOld - a.daysOld);

    // Recent sparks (last 7 days)
    const recentSparks = sparks
      .filter(s => s.daysOld <= 7)
      .sort((a, b) => a.daysOld - b.daysOld);

    // All sparks sorted by domain then age
    const byDomain: Record<string, IdeaSpark[]> = {};
    for (const d of DOMAINS) {
      byDomain[d] = sparks.filter(s => s.domain === d).sort((a, b) => a.daysOld - b.daysOld);
    }
    const other = sparks.filter(s => !DOMAINS.includes(s.domain));
    if (other.length) byDomain["other"] = other;

    return NextResponse.json({
      total: sparks.length,
      domainCounts,
      missingDomains,
      agingSparks: agingSparks.slice(0, 10),
      recentSparks,
      byDomain,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[idea-engine] Error:", error);
    return NextResponse.json({ error: "Failed to read idea engine" }, { status: 500 });
  }
}
