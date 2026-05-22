"use client";
import { useRouter } from "next/navigation";

interface TaskCardProps {
  index: number;
  title: string;
  icon: string;
  count: number;
  duty: string;
  size: "sm" | "md" | "lg";
  color: string;
}

const SIZE_MAP = {
  sm: { minHeight: 100, fontSize: "0.78rem" },
  md: { minHeight: 140, fontSize: "0.85rem" },
  lg: { minHeight: 180, fontSize: "0.92rem" },
};

export default function TaskCard({ index, title, icon, count, duty, size, color }: TaskCardProps) {
  const router = useRouter();
  const s = SIZE_MAP[size];

  return (
    <div
      onClick={() => router.push(`/accountability/task/${index}`)}
      style={{
        background: count > 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
        borderRadius: 12,
        padding: "14px 16px",
        border: count > 0 ? `1px solid ${color}22` : "1px solid rgba(255,255,255,0.05)",
        cursor: "pointer",
        minHeight: s.minHeight,
        transition: "all 0.25s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = count > 0 ? `${color}22` : "rgba(255,255,255,0.05)"; e.currentTarget.style.background = count > 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}44, transparent)`, opacity: count > 0 ? 0.6 : 0.2 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: "1.2rem" }}>{icon}</div>
        <span style={{ fontSize: "1.2rem", fontWeight: 800, color: count > 0 ? color : "#3a3a4a" }}>{count || "—"}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: "0.6rem", color: "#5a4a5a", marginBottom: 2 }}>#{index}</div>
        <div style={{ fontSize: s.fontSize, fontWeight: 700, color: "#e0d0c0", lineHeight: 1.3 }}>{title}</div>
        {duty && <div style={{ fontSize: "0.6rem", color: "#847b8a", marginTop: 4 }}>{duty}</div>}
      </div>
    </div>
  );
}
