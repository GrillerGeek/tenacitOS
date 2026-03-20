"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Lightbulb, AlertCircle, Clock } from "lucide-react";

interface IdeaSpark {
  filename: string;
  title: string;
  domain: string;
  status: string;
  scope: string;
  created: string;
  daysOld: number;
}

interface IdeaData {
  total: number;
  domainCounts: Record<string, number>;
  missingDomains: string[];
  agingSparks: IdeaSpark[];
  recentSparks: IdeaSpark[];
  byDomain: Record<string, IdeaSpark[]>;
  scannedAt: string;
}

const DOMAIN_COLORS: Record<string, string> = {
  personal:  "#3b82f6",
  family:    "#ec4899",
  work:      "#f59e0b",
  community: "#10b981",
  church:    "#8b5cf6",
  ventures:  "#f97316",
  other:     "#6b7280",
};

const DOMAIN_EMOJI: Record<string, string> = {
  personal:  "🧘",
  family:    "👨‍👩‍👧",
  work:      "💼",
  community: "🤝",
  church:    "⛪",
  ventures:  "🚀",
  other:     "📌",
};

const DOMAINS = ["personal", "family", "work", "community", "church", "ventures"];

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export default function IdeaEnginePage() {
  const [data, setData] = useState<IdeaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/idea-engine").then(r => r.json()).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const cardStyle = { backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" };
  const activeDomain = selected || DOMAINS.find(d => (data?.domainCounts[d] ?? 0) > 0) || "personal";
  const domainSparks = data?.byDomain[activeDomain] || [];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-1.5px" }}>
            💡 Idea Engine
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Personal idea pipeline — {data?.total ?? "…"} sparks across 6 domains
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </button>
      </div>

      {/* Domain summary tiles */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {DOMAINS.map(d => {
          const count = data?.domainCounts[d] || 0;
          const color = DOMAIN_COLORS[d];
          const isActive = d === activeDomain;
          return (
            <button key={d} onClick={() => setSelected(d)}
              className="p-3 rounded-xl text-center transition-all hover:scale-105"
              style={{ backgroundColor: isActive ? color + "25" : "var(--card)", border: `2px solid ${isActive ? color : "var(--border)"}` }}>
              <div className="text-2xl mb-1">{DOMAIN_EMOJI[d]}</div>
              <div className="text-xl font-bold" style={{ color, fontFamily: "var(--font-heading)" }}>{count}</div>
              <div className="text-xs capitalize mt-0.5" style={{ color: isActive ? color : "var(--text-muted)" }}>{d}</div>
            </button>
          );
        })}
      </div>

      {/* Missing domains + aging alerts */}
      {((data?.missingDomains?.length ?? 0) > 0 || (data?.agingSparks?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {(data?.missingDomains?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 p-4 rounded-xl text-sm" style={{ backgroundColor: "#f59e0b15", border: "1px solid #f59e0b40", color: "#f59e0b" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>No sparks in: <strong>{data?.missingDomains.join(", ")}</strong></span>
            </div>
          )}
          {(data?.agingSparks?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 p-4 rounded-xl text-sm" style={{ backgroundColor: "var(--error)15", border: "1px solid var(--error)40", color: "var(--error)" }}>
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>{data?.agingSparks.length}</strong> spark(s) aging 30+ days — oldest: <em>{data?.agingSparks[0]?.title}</em> ({data?.agingSparks[0]?.daysOld}d)</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domain spark list */}
        <div style={cardStyle} className="lg:col-span-2">
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-lg">{DOMAIN_EMOJI[activeDomain]}</span>
            <h2 className="text-base font-semibold capitalize" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {activeDomain} ({domainSparks.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading…</div>
          ) : domainSparks.length === 0 ? (
            <div className="p-8 text-center">
              <Lightbulb className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-muted)" }}>No sparks in this domain yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {domainSparks.map(s => (
                <div key={s.filename} className="px-5 py-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.title}</div>
                      <div className="flex items-center gap-3 mt-1">
                        {s.scope && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--card-elevated)", color: "var(--text-muted)" }}>{s.scope}</span>}
                      </div>
                    </div>
                    <div className="text-xs whitespace-nowrap flex-shrink-0 mt-0.5" style={{ color: s.daysOld > 30 ? "var(--error)" : "var(--text-muted)" }}>
                      {timeAgo(s.created)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent + aging sidebar */}
        <div className="space-y-4">
          <div style={cardStyle}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>🆕 Recent (7 days)</h3>
            </div>
            {loading ? <div className="p-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>Loading…</div>
              : (data?.recentSparks || []).length === 0 ? <div className="p-4 text-xs text-center" style={{ color: "var(--text-muted)" }}>None this week</div>
              : (data?.recentSparks || []).map(s => (
              <div key={s.filename} className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span>{DOMAIN_EMOJI[s.domain] || "📌"}</span>
                  <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{s.title}</span>
                </div>
                <span className="text-xs ml-2 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{timeAgo(s.created)}</span>
              </div>
            ))}
          </div>

          {(data?.agingSparks?.length ?? 0) > 0 && (
            <div style={cardStyle}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--error)", fontFamily: "var(--font-heading)" }}>⏳ Aging (30d+)</h3>
              </div>
              {(data?.agingSparks || []).slice(0, 5).map(s => (
                <div key={s.filename} className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{DOMAIN_EMOJI[s.domain] || "📌"}</span>
                    <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{s.title}</span>
                  </div>
                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: "var(--error)" }}>{s.daysOld}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
