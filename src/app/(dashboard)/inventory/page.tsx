"use client";

import { useEffect, useState } from "react";
import { FileCode, Terminal, RefreshCw, Clock, HardDrive, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active:   { color: "var(--success)", icon: <CheckCircle className="w-3 h-3" />, label: "Active" },
    inactive: { color: "var(--text-muted)", icon: <AlertCircle className="w-3 h-3" />, label: "Inactive" },
    failed:   { color: "var(--error)", icon: <XCircle className="w-3 h-3" />, label: "Failed" },
    unknown:  { color: "var(--text-muted)", icon: <AlertCircle className="w-3 h-3" />, label: "Unknown" },
  };
  const c = cfg[status] || cfg.unknown;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ color: c.color, backgroundColor: `${c.color}20`, border: `1px solid ${c.color}40` }}>
      {c.icon}{c.label}
    </span>
  );
}

export default function InventoryPage() {
  const [scripts, setScripts] = useState<ScriptEntry[]>([]);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannedAt, setScannedAt] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "py" | "sh">("all");
  const [svcFilter, setSvcFilter] = useState<"all" | "active" | "inactive" | "failed">("all");

  const load = () => {
    setLoading(true);
    fetch("/api/inventory")
      .then(r => r.json())
      .then(data => {
        setScripts(data.scripts || []);
        setServices(data.services || []);
        setScannedAt(data.scannedAt || "");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredScripts = scripts.filter(s => filter === "all" || s.ext === filter);
  const filteredServices = services.filter(s => svcFilter === "all" || s.status === svcFilter);

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
            📦 Inventory
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Scripts and services — nothing orphaned
            {scannedAt && <span className="ml-2 opacity-60">· scanned {timeAgo(scannedAt)}</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all disabled:opacity-50"
          style={{ backgroundColor: "var(--card-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Python Scripts", value: scripts.filter(s => s.ext === "py").length, color: "#3b82f6" },
          { label: "Shell Scripts", value: scripts.filter(s => s.ext === "sh").length, color: "#f59e0b" },
          { label: "Active Services", value: services.filter(s => s.status === "active").length, color: "var(--success)" },
          { label: "Failed Services", value: services.filter(s => s.status === "failed").length, color: "var(--error)" },
        ].map(card => (
          <div key={card.label} className="p-4 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-bold mb-1" style={{ color: card.color, fontFamily: "var(--font-heading)" }}>
              {card.value}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Scripts table */}
      <div style={cardStyle} className="mb-6">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            <FileCode className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Scripts ({filteredScripts.length})
          </h2>
          <div className="flex gap-1">
            {(["all", "py", "sh"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-xs px-2 py-1 rounded transition-all"
                style={{ backgroundColor: filter === f ? "var(--accent)" : "var(--card-elevated)", color: filter === f ? "white" : "var(--text-muted)", border: "1px solid var(--border)" }}>
                {f === "all" ? "All" : `.${f}`}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Scanning workspace…</div>
        ) : filteredScripts.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>No scripts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["File", "Path", "Size", "Last Modified", "Description"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredScripts.map((s, i) => (
                  <tr key={s.path} style={{ borderBottom: i < filteredScripts.length - 1 ? "1px solid var(--border)" : "none" }}
                    className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                      <span className="text-xs mr-2 px-1.5 py-0.5 rounded font-mono"
                        style={{ backgroundColor: s.ext === "py" ? "#3b82f620" : "#f59e0b20", color: s.ext === "py" ? "#3b82f6" : "#f59e0b" }}>
                        .{s.ext}
                      </span>
                      {s.name}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>{s.relativePath.replace(s.name, "")}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      <HardDrive className="inline w-3 h-3 mr-1" />{formatBytes(s.sizeBytes)}
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      <Clock className="inline w-3 h-3 mr-1" />{timeAgo(s.lastModified)}
                    </td>
                    <td className="px-5 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text-secondary)" }}
                      title={s.description}>{s.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Services table */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
            <Terminal className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Systemd Services ({filteredServices.length})
          </h2>
          <div className="flex gap-1">
            {(["all", "active", "inactive", "failed"] as const).map(f => (
              <button key={f} onClick={() => setSvcFilter(f)}
                className="text-xs px-2 py-1 rounded capitalize transition-all"
                style={{ backgroundColor: svcFilter === f ? "var(--accent)" : "var(--card-elevated)", color: svcFilter === f ? "white" : "var(--text-muted)", border: "1px solid var(--border)" }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading services…</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>No services found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Service", "Status", "Description"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((s, i) => (
                  <tr key={s.unit} style={{ borderBottom: i < filteredServices.length - 1 ? "1px solid var(--border)" : "none" }}
                    className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 font-mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</td>
                    <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{s.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
