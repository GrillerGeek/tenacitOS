/**
 * Content Engine Status API
 * GET /api/content-engine
 * Reads pipeline stages from the content-engine repo
 */
import { NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const CONTENT_ENGINE = "/home/jasonrobey/.openclaw/workspace/content-engine/pipeline";

interface ContentItem {
  filename: string;
  title: string;
  pillar: string;
  status: string;
  platform: string;
  created: string;
  published?: string;
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

function readStage(stage: string): ContentItem[] {
  const dir = join(CONTENT_ENGINE, stage);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      try {
        const content = readFileSync(join(dir, f), "utf-8");
        const fm = parseFrontmatter(content);
        return {
          filename: f,
          title: fm.title || f.replace(/^spark-|\.md$/g, "").replace(/-/g, " "),
          pillar: fm.pillar || fm.platform || "unknown",
          status: fm.status || stage,
          platform: fm.platform || "",
          created: fm.created || "",
          published: fm.published || fm.date_published || "",
        };
      } catch { return null; }
    })
    .filter(Boolean) as ContentItem[];
}

export async function GET() {
  try {
    const sparks = readStage("01-sparks");
    const drafts = readStage("02-drafts");
    const review = readStage("03-review");
    const published = readStage("04-published");
    const repurposed = readStage("05-repurposed");

    // Last published date
    const publishedDates = published
      .map(p => p.published)
      .filter(Boolean)
      .sort();
    const lastPublished = publishedDates[publishedDates.length - 1] || null;
    const daysSincePublish = lastPublished
      ? Math.floor((Date.now() - new Date(lastPublished).getTime()) / 86400000)
      : null;

    // Pillar counts from sparks
    const pillarCounts: Record<string, number> = {};
    const PILLARS = ["practical-ai", "automation-first", "builder-leader", "maker-leader", "whole-person", "data-governance"];
    for (const s of sparks) {
      const raw = s.pillar.toLowerCase();
      for (const p of PILLARS) {
        if (raw.includes(p)) {
          pillarCounts[p] = (pillarCounts[p] || 0) + 1;
        }
      }
      if (!PILLARS.some(p => raw.includes(p))) {
        pillarCounts["other"] = (pillarCounts["other"] || 0) + 1;
      }
    }

    // Most recent sparks
    const recentSparks = [...sparks]
      .sort((a, b) => (b.created > a.created ? 1 : -1))
      .slice(0, 5);

    return NextResponse.json({
      counts: {
        sparks: sparks.length,
        drafts: drafts.length,
        review: review.length,
        published: published.length,
        repurposed: repurposed.length,
      },
      lastPublished,
      daysSincePublish,
      pillarCounts,
      recentSparks,
      recentPublished: published.slice(0, 3),
      missingPillars: PILLARS.filter(p => !pillarCounts[p]),
    });
  } catch (error) {
    console.error("[content-engine] Error:", error);
    return NextResponse.json({ error: "Failed to read content engine" }, { status: 500 });
  }
}
