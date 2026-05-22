"use client";
import { useState, useEffect } from "react";
import DutyCard from "@/components/accountability/DutyCard";
import TaskCard from "@/components/accountability/TaskCard";
import { FOUR_DUTIES, TEN_TASKS } from "@/lib/accountability";

const DUTY_COLORS: Record<string, string> = {
  "建强组织": "#818cf8",
  "兴村富民": "#d97706",
  "加强治理": "#b45389",
  "为民服务": "#0d9488",
};

const TASK_COLORS = ["#818cf8","#0d9488","#0d9488","#d97706","#818cf8","#d97706","#d97706","#d97706","#b45389","#818cf8"];

export default function AccountabilityDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accountability/stats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", background: "#0f172a" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #b45389", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const stats = data?.stats || {};
  const dutyStats = data?.dutyStats || {};
  const maxDuty = Math.max(...Object.values<number>(dutyStats), 1);

  const getSize = (count: number) => count >= 10 ? "lg" : count >= 3 ? "md" : "sm";

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "24px", fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#e8d5c4", letterSpacing: 3, margin: 0 }}>📊 履职全景</h1>
          <p style={{ fontSize: "0.78rem", color: "#5a4a5a", marginTop: 4 }}>
            {Object.values(stats as Record<number,number>).reduce((a:number,b:number) => a + b, 0)} 条履职记录
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
          {FOUR_DUTIES.map(d => {
            const taskNames = TEN_TASKS.filter(t => d.taskIndexes.includes(t.index)).map(t => t.title);
            return (
              <DutyCard key={d.key} label={d.label} icon={d.icon} count={dutyStats[d.key] || 0} color={DUTY_COLORS[d.key] || "#818cf8"} maxCount={maxDuty} tasks={taskNames} />
            );
          })}
        </div>

        <div style={{ columns: "3 280px", gap: 12 }}>
          {TEN_TASKS.map(t => {
            const count = stats[t.index] || 0;
            return (
              <div key={t.index} style={{ breakInside: "avoid", marginBottom: 12 }}>
                <TaskCard
                  index={t.index}
                  title={t.title}
                  icon={t.icon || "📋"}
                  count={count}
                  duty={t.duty}
                  size={getSize(count)}
                  color={TASK_COLORS[t.index - 1] || "#818cf8"}
                />
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, opacity: 0.15 }}>
            {["#b45389","#d97706","#6366f1","#0d9488","#2563eb"].map((c, i) => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: c }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
