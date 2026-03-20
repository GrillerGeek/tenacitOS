"use client";

import { useEffect, useState } from "react";
import { RefreshCw, FileText, PenTool, CheckCircle, BookOpen, ArrowRight, AlertCircle } from "lucide-react";

interface ContentItem {
  filename: string;
  title: string;
  pillar: string;
  status: string;
  platform: string;
  created: string;
  published?: string;
}

interface ContentData {
  counts: { sparks: number; drafts: number; review: number; published: number; repurposed: number };
  lastPublished: string | null;
  daysSincePublish: number | null;
  pillarCounts: Record<string, number>;
  recentSparks: ContentItem[];
  recentPublished: ContentItem[];
  missingPillars: string[];
}

const PILLAR_COLORS: Record<string, string> = {
  "practical-ai": "#3b82f6",
  "automation-first": "#f59e0b",
  "builder-leader": "#10b981",
  "maker-leader": "#8b5cf6",
  "whole-person": "#ec4899",
  "data-governance": "#6b7280",
  "other": "#94a3b8",
};

const PILLAR_LABELS: Record<string, string> = {
  "practical-ai": "Practical AI",
  "automation-first": "Automation First",
  "builder-leader": "Builder Leader",
  "maker-leader": "Maker Leader",
  "whole-person": "Whole Person",
  "data-governance": "Data & Governance",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const ms = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

function PillarBadge({ pillar }: { pillar: string }) {
  const raw = pillar.toLowerCase();
  const key = Object.keys(PILLAR_COLORS).find(k => raw.includes(k)) || "other";
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{
      backgroundColor: PILLAR_COLORS[key] + "25",
      color: PILLAR_COLORS[key],
      border: `1px solid ${PILLAR_COLORS[key]}50`,
    }}>
      {PILLAR_LABELS[key] || pillar}
    </span>
  );
}

export default function ContentEnginePage() {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/content-engine").then(r => r.json()).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const cardStyle = { backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" };
  const totalPillarSparks = Object.values(data?.pillarCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-1.5px" }}>
            ✍️ Content Engine
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Still Building — Substack + LinkedIn pipeline</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {/* Pipeline stage counts */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: "Sparks", value: data?.counts.sparks, icon: <FileText className="w-4 h-4" />, color: "#f59e0b" },
          { label: "Drafts", value: data?.counts.drafts, icon: <PenTool className="w-4 h-4" />, color: "#3b82f6" },
          { label: "Review", value: data?.counts.review, icon: <CheckCircle className="w-4 h-4" />, color: "#8b5cf6" },
          { label: "Published", value: data?.counts.published, icon: <BookOpen className="w-4 h-4" />, color: "var(--success)" },
          { label: "Repurposed", value: data?.counts.repurposed, icon: <ArrowRight className="w-4 h-4" />, color: "#6b7280" },
        ].map(c => (
          <div key={c.label} className="p-4 rounded-xl" style={{ backgroundColor: "var(--card)", border: `2px solid ${c.color}40` }}>
            <div className="flex items-center gap-1.5 mb-2" style={{ color: c.color }}>{c.icon}<span className="text-xs font-medium">{c.label}</span></div>
            <div className="text-3xl font-bold" style={{ color: c.color, fontFamily: "var(--font-heading)" }}>{c.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Last published + alert */}
        <div style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Publishing Cadence</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Last published</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {data?.lastPublished ? `${data.lastPublished} (${timeAgo(data.lastPublished)})` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Days since publish</span>
              <span className="text-sm font-bold" style={{ color: (data?.daysSincePublish ?? 0) > 14 ? "var(--error)" : "var(--success)" }}>
                {data?.daysSincePublish != null ? `${data.daysSincePublish} days` : "—"}
              </span>
            </div>
            {(data?.daysSincePublish ?? 0) > 14 && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--error)20", color: "var(--error)", border: "1px solid var(--error)40" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Overdue — {data?.counts.drafts ?? 0} draft(s) waiting
              </div>
            )}
            {data?.missingPillars && data.missingPillars.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b40" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Missing pillars: {data.missingPillars.map(p => PILLAR_LABELS[p] || p).join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pillar balance */}
        <div style={cardStyle}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Pillar Balance</h2>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(PILLAR_COLORS).filter(([k]) => k !== "other").map(([key, color]) => {
              const count = data?.pillarCounts[key] || 0;
              const pct = totalPillarSparks > 0 ? Math.round((count / totalPillarSparks) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-secondary)" }}>{PILLAR_LABELS[key]}</span>
                    <span style={{ color }}>{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "var(--card-elevated)" }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent sparks */}
      <div style={cardStyle} className="mb-6">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Recent Sparks</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {loading ? <div className="p-6 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
            : (data?.recentSparks || []).map(s => (
            <div key={s.filename} className="px-5 py-3 flex items-center justify-between hover:bg-white/5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{s.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{timeAgo(s.created)}</div>
              </div>
              <div className="ml-3 flex-shrink-0"><PillarBadge pillar={s.pillar} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently published */}
      <div style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Recently Published</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {loading ? <div className="p-6 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
            : (data?.recentPublished || []).length === 0 ? <div className="p-6 text-center" style={{ color: "var(--text-muted)" }}>No published posts yet</div>
            : (data?.recentPublished || []).map(s => (
            <div key={s.filename} className="px-5 py-3 flex items-center justify-between hover:bg-white/5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{s.title}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.published ? timeAgo(s.published) : "—"}</div>
              </div>
              <div className="ml-3 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--success)20", color: "var(--success)" }}>Published</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
