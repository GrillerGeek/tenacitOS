"use client";

import { useEffect, useState } from "react";
import { Home, RefreshCw, CheckCircle, XCircle, AlertCircle, Activity, RotateCcw } from "lucide-react";

interface HAEvent {
  timestamp: string;
  type: "reboot" | "failure" | "recovery" | "check";
  message: string;
}

interface UptimeSegment {
  start: string;
  end: string | null;
  status: "up" | "down";
}

interface MonitorState {
  totalReboots: number;
  lastRebootAt: string | null;
  lastFailureAt: string | null;
  lastCheckAt: string | null;
  failureCount: number;
}

interface HAHealth {
  currentStatus: "online" | "offline" | "unknown";
  latencyMs: number | null;
  monitorState: MonitorState | null;
  recentEvents: HAEvent[];
  uptimeSegments: UptimeSegment[];
  checkedAt: string;
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
    hour12: true,
  });
}

const EVENT_CONFIG = {
  failure: { color: "var(--error)", icon: <XCircle className="w-4 h-4" />, label: "Failure" },
  recovery: { color: "var(--success)", icon: <CheckCircle className="w-4 h-4" />, label: "Recovery" },
  reboot: { color: "#f59e0b", icon: <RotateCcw className="w-4 h-4" />, label: "Reboot" },
  check: { color: "var(--text-muted)", icon: <Activity className="w-4 h-4" />, label: "Check" },
};

export default function HAHealthPage() {
  const [data, setData] = useState<HAHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/ha-health")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const statusColor = data?.currentStatus === "online" ? "var(--success)"
    : data?.currentStatus === "offline" ? "var(--error)" : "var(--text-muted)";

  const cardStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    overflow: "hidden",
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-1.5px" }}>
            🏠 Home Assistant Health
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Uptime, crash history, and recovery events
            {data?.checkedAt && <span className="ml-2 opacity-60">· checked {timeAgo(data.checkedAt)}</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status + Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl col-span-2 md:col-span-1" style={{ backgroundColor: "var(--card)", border: `2px solid ${statusColor}` }}>
          <div className="flex items-center gap-2 mb-1">
            {data?.currentStatus === "online" ? <CheckCircle className="w-5 h-5" style={{ color: statusColor }} />
              : data?.currentStatus === "offline" ? <XCircle className="w-5 h-5" style={{ color: statusColor }} />
              : <AlertCircle className="w-5 h-5" style={{ color: statusColor }} />}
            <span className="text-sm font-medium" style={{ color: statusColor }}>
              {data?.currentStatus === "online" ? "Online" : data?.currentStatus === "offline" ? "Offline" : "Unknown"}
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {data?.latencyMs != null ? `${data.latencyMs}ms` : "—"}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Current latency</div>
        </div>

        {[
          { label: "Total Reboots", value: data?.monitorState?.totalReboots ?? "—", color: "#f59e0b" },
          { label: "Last Failure", value: data?.monitorState?.lastFailureAt ? timeAgo(data.monitorState.lastFailureAt) : "None", color: "var(--error)" },
          { label: "Last Reboot", value: data?.monitorState?.lastRebootAt ? timeAgo(data.monitorState.lastRebootAt) : "None", color: "#a78bfa" },
        ].map(card => (
          <div key={card.label} className="p-4 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-bold mb-1" style={{ color: card.color, fontFamily: "var(--font-heading)" }}>
              {card.value}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Uptime timeline bar */}
      {data && data.uptimeSegments.length > 0 && (
        <div style={cardStyle} className="mb-6">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              <Activity className="inline w-4 h-4 mr-2" style={{ color: "var(--accent)" }} />
              Uptime Timeline
            </h2>
          </div>
          <div className="p-5">
            <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden w-full">
              {data.uptimeSegments.map((seg, i) => {
                const start = new Date(seg.start).getTime();
                const end = seg.end ? new Date(seg.end).getTime() : Date.now();
                const total = Date.now() - new Date(data.uptimeSegments[0].start).getTime();
                const width = Math.max(((end - start) / total) * 100, 0.5);
                return (
                  <div key={i} title={`${seg.status.toUpperCase()}: ${formatTime(seg.start)} → ${seg.end ? formatTime(seg.end) : "now"}`}
                    style={{ width: `${width}%`, backgroundColor: seg.status === "up" ? "var(--success)" : "var(--error)", opacity: 0.85 }}
                    className="rounded-sm transition-all hover:opacity-100 cursor-help" />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{formatTime(data.uptimeSegments[0].start)}</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "var(--success)" }} />Up</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "var(--error)" }} />Down</span>
              </span>
              <span>Now</span>
            </div>
          </div>
        </div>
      )}

      {/* Event log */}
      <div style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            <Home className="inline w-4 h-4 mr-2" style={{ color: "var(--accent)" }} />
            Recent Events ({data?.recentEvents?.length ?? 0})
          </h2>
        </div>
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading events…</div>
        ) : !data?.recentEvents?.length ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
            No events found in journal logs.<br />
            <span className="text-xs mt-2 block opacity-60">Check that garage-monitor.service is running and has logged events.</span>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {data.recentEvents.map((evt, i) => {
              const cfg = EVENT_CONFIG[evt.type] || EVENT_CONFIG.check;
              return (
                <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
                  <span style={{ color: cfg.color, marginTop: "2px", flexShrink: 0 }}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium mb-0.5" style={{ color: cfg.color }}>{cfg.label}</div>
                    <div className="text-sm truncate" style={{ color: "var(--text-secondary)" }} title={evt.message}>
                      {evt.message || "—"}
                    </div>
                  </div>
                  <div className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {formatTime(evt.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
