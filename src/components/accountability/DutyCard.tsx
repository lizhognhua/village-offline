"use client";
import { useState } from "react";

interface DutyCardProps {
  label: string;
  icon: string;
  count: number;
  color: string;
  maxCount: number;
  tasks: string[];
}

export default function DutyCard({ label, icon, count, color, maxCount, tasks }: DutyCardProps) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}11, ${color}05)`,
      borderRadius: 14,
      padding: "18px 20px",
      border: `1px solid ${color}22`,
      position: "relative",
      overflow: "hidden",
      cursor: "default",
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", letterSpacing: 1 }}>{icon} {label}</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#e8d5c4", marginTop: 4 }}>{count}</div>
          <div style={{ fontSize: "0.65rem", color: "#5a4a5a", marginTop: 2 }}>项工作记录</div>
        </div>
        <div style={{ width: 48, height: 48, position: "relative" }}>
          <svg viewBox="0 0 48 48" width="48" height="48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${pct * 1.26} ${(100 - pct) * 1.26}`}
              strokeLinecap="round" transform="rotate(-90 24 24)"
              style={{ transition: "stroke-dasharray 0.5s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color }}>{pct}%</div>
        </div>
      </div>

      {/* 悬停提示 */}
      {hovered && (
        <div style={{
          position: "absolute", bottom: 8, left: 8, right: 8,
          background: "rgba(15,23,42,0.95)", borderRadius: 8, padding: "10px 12px",
          border: `1px solid ${color}33`, zIndex: 10, backdropFilter: "blur(8px)",
        }}>
          <div style={{ fontSize: "0.6rem", color: "#5a4a5a", marginBottom: 4 }}>包含任务：</div>
          {tasks.map((t, i) => (
            <div key={i} style={{ fontSize: "0.68rem", color: "#cbd5e1", lineHeight: 1.6 }}>
              · {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
