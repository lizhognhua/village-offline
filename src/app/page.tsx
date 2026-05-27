"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const VILLAGES = [
  { slug: "shuangxing", label: "省农担公司", sub: "驻双兴村工作队", village: "双岔河镇双兴村", url: "https://sxc.lizhonghua.vip:8002", color: "#d97706", desc: "示例：发挥农担金融优势，助力双岔河镇双兴村特色产业发展，打造「大垄双行」示范园区，以金融与产业力量带动村民增收致富。" },
  { slug: "changqing", label: "省江河流域保护中心", sub: "驻长青村工作队", village: "阁山镇长青村", url: "https://cqc.lizhonghua.vip:8002", color: "#3b82f6", desc: "示例：发挥水利专业优势，谋划以工代赈与灌区改造项目，切实改善民生，为农业增产、农民增收奠定坚实基础。" },
  { slug: "kaoshan", label: "省机关事务管理局", sub: "驻靠山村工作队", village: "靠山乡靠山村", url: "https://ksc.lizhonghua.vip:8002", color: "#0d9488", desc: "示例：省机关事务管理局对口帮扶，聚焦产业振兴，发展智能大棚与电商服务中心，推动乡村建设提质升级。" },
  { slug: "fubei", label: "黑龙江科技大学", sub: "驻扶北村工作队", village: "尼尔河乡扶北村", url: "https://fbc.lizhonghua.vip:8002", color: "#10b981", desc: "示例：发挥高校科技优势，创办「泥尔河玫瑰庄园」等科技扶贫产业，将先进种植技术引入乡村，实现科技兴农。" },
  { slug: "weixing", label: "哈铁集团", sub: "驻卫星村工作队", village: "尼尔河乡卫星村", url: "https://wxc.lizhonghua.vip:8002", color: "#6366f1", desc: "示例：自2017年进驻，发展肉鹅养殖、黏豆包加工、鲜食玉米等特色产业，并通过电商直播及消费帮扶，畅通农产品销路。" },
];

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, any[]>>({});
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [teamDesc, setTeamDesc] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/public/stats").then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/team-members").then(r => r.json()).then(d => {
      if (d.members) {
        const map: Record<string, any[]> = {};
        d.members.forEach((m: any) => {
          const key = m.teamId || "";
          if (!map[key]) map[key] = [];
          map[key].push(m);
        });
        setTeamMembers(map);
      }
    }).catch(() => {});
    fetch("/api/teams").then(r => r.json()).then(d => {
      if (d.teams) {
        const descMap: Record<string, string> = {};
        d.teams.forEach((t: any) => { descMap[t.slug] = t.description || ""; });
        setTeamDesc(descMap);
      }
    }).catch(() => {});
  }, []);

  const s = stats || { totalPopulation: 0, helpCount: 0, villageCount: 5, dutyStats: {}, taskCounts: {} };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .hp-container { min-height: 100vh; background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 30%, #1d4ed8 70%, #2563eb 100%); font-family: 'PingFang SC','Microsoft YaHei',sans-serif; color: #f1f5f9; }
        .hp-header { text-align: center; padding: 28px 16px 10px; position: relative; }
        .hp-header-links { display: flex; gap: 12px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
        .hp-title { font-size: 1.35rem; font-weight: 800; color: #e2e8f0; letter-spacing: 6px; }
        .hp-subtitle { font-size: 0.7rem; font-weight: 600; color: #dc2626; letter-spacing: 3px; margin-top: 6px; }
        .hp-divider { width: 80px; height: 1px; background: linear-gradient(90deg, transparent, #34d399, #6366f1, #fbbf24, transparent); margin: 10px auto 0; }
        .hp-stats-row { display: flex; gap: 14px; padding: 0 16px; margin: 0 auto 20px; max-width: 900px; }
        .hp-stat-card { flex: 1; min-width: 0; border-radius: 12px; padding: 16px 10px; text-align: center; position: relative; overflow: visible; cursor: default; }
        .hp-stat-topline { position: absolute; top: 0; left: 0; right: 0; height: 1px; opacity: 0.6; }
        .hp-stat-label { font-size: 0.65rem; font-weight: 500; letter-spacing: 2px; }
        .hp-stat-num { font-size: 2rem; font-weight: 900; line-height: 1.3; }
        .hp-stat-sub { font-size: 0.5rem; color: #94a3b8; margin-top: 2px; }
        .hp-cards-wrap { padding: 0 16px; display: flex; gap: 10px; flex-wrap: wrap; max-width: 1200px; margin: 0 auto 20px; }
        .hp-card-link { text-decoration: none; flex: 1 1 180px; min-width: 160px; }
        .hp-card { border-radius: 10px; padding: 14px 16px; border: 1px solid rgba(255,255,255,0.15); transition: all 0.3s; cursor: pointer; position: relative; overflow: visible; height: 100%; }
        .hp-card-topline { position: absolute; top: 0; left: 0; right: 0; height: 2px; opacity: 0.5; transition: opacity 0.3s; }
        .hp-card-label { font-size: 0.58rem; color: #cbd5e1; letter-spacing: 0.5px; margin-bottom: 2px; text-align: center; }
        .hp-card-sub { font-size: 0.78rem; font-weight: 700; color: #f1f5f9; margin-bottom: 2px; text-align: center; }
        .hp-card-village { font-size: 0.56rem; text-align: center; }
        .hp-card-members { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .hp-card-avatar-img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
        .hp-card-avatar-fb { width: 34px; height: 34px; border-radius: 50%; color: white; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .hp-card-name { font-size: 0.55rem; color: #94a3b8; max-width: 40px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
        .hp-card-desc { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 0.52rem; color: #cbd5e1; line-height: 1.5; }
        .hp-duty-row { padding: 0 16px; max-width: 900px; margin: 0 auto 20px; }
        .hp-duty-cards { display: flex; gap: 10px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }
        .hp-duty-card { border-radius: 10px; padding: 10px 16px; text-align: center; min-width: 80px; }
        .hp-duty-label { font-size: 0.6rem; font-weight: 600; }
        .hp-duty-num { font-size: 1.3rem; font-weight: 800; }
        .hp-task-row { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
        .hp-task-tag { font-size: 0.55rem; padding: 3px 8px; border-radius: 10px; }
        .hp-footer { border-top: 1px solid rgba(255,255,255,0.04); padding: 10px 16px; text-align: center; font-size: 0.58rem; color: #94a3b8; line-height: 1.6; }

        @media (max-width: 768px) {
          .hp-title { font-size: 1rem; letter-spacing: 3px; }
          .hp-subtitle { font-size: 0.6rem; letter-spacing: 1.5px; }
          .hp-header { padding: 16px 12px 8px; }
          .hp-header-links { justify-content: center; gap: 8px; margin-top: 8px; }
          .hp-header-links a, .hp-header-links span { font-size: 0.68rem !important; }
          .hp-stats-row { flex-direction: column; gap: 8px; padding: 0 12px; }
          .hp-stat-num { font-size: 1.5rem; }
          .hp-stat-label { font-size: 0.58rem; }
          .hp-cards-wrap { padding: 0 12px; gap: 8px; }
          .hp-card-link { flex: 1 1 100%; min-width: 100%; }
          .hp-card { padding: 12px 14px; }
          .hp-card-sub { font-size: 0.72rem; }
          .hp-duty-cards { gap: 6px; }
          .hp-duty-card { min-width: 60px; padding: 8px 10px; }
          .hp-duty-num { font-size: 1.1rem; }
          .hp-duty-label { font-size: 0.55rem; }
          .hp-task-tag { font-size: 0.5rem; padding: 2px 6px; }
        }
        @media (max-width: 480px) {
          .hp-title { font-size: 0.85rem; letter-spacing: 2px; }
          .hp-stat-card { padding: 10px 6px; }
          .hp-stat-num { font-size: 1.3rem; }
          .hp-card-link { min-width: 100%; }
          .hp-duty-card { min-width: 44%; flex: 1 1 44%; }
        }
      `}} />

      <div className="hp-container">
        {/* ===== 顶部标题 ===== */}
        <div className="hp-header">
          <div className="hp-header-links">
            <Link href="/download" style={{ color: "#facc15", fontSize: "0.78rem", textDecoration: "none", fontWeight: 600 }}>📥 下载离线版</Link>
            <Link href="/login" style={{ color: "#e2e8f0", fontSize: "0.78rem", textDecoration: "none", fontWeight: 500 }}>登录</Link>
            <Link href="/register" style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "5px 15px", borderRadius: 6, fontSize: "0.78rem", textDecoration: "none", fontWeight: 500 }}>注册</Link>
          </div>
          <div className="hp-title">绥棱县省级派驻工作队数据平台</div>
          <div className="hp-subtitle">驻村干多少，数据都知晓</div>
          <div className="hp-divider" />
        </div>

        {/* ===== 数据计数器 ===== */}
        <div className="hp-stats-row">
          <div className="hp-stat-card" style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.12), rgba(52,211,153,0.06))", border: "1px solid rgba(52,211,153,0.2)" }}
            onMouseEnter={e => { const t = e.currentTarget.querySelector('.tip') as HTMLElement; if(t) t.style.display='block'; }}
            onMouseLeave={e => { const t = e.currentTarget.querySelector('.tip') as HTMLElement; if(t) t.style.display='none'; }}>
            <div className="hp-stat-topline" style={{ background: "linear-gradient(90deg, transparent, #34d399, transparent)" }} />
            <div className="hp-stat-label" style={{ color: "#5eead4" }}>服务人数</div>
            <div className="hp-stat-num" style={{ background: "linear-gradient(180deg, #34d399, #0d9488)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.totalPopulation.toLocaleString()}</div>
            <div className="hp-stat-sub">覆盖 5 个行政村</div>
            <div className="tip" style={{ display: "none", position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.95)", borderRadius: 8, padding: "8px 12px", fontSize: "0.55rem", color: "#cbd5e1", whiteSpace: "nowrap", zIndex: 10, marginBottom: 6, border: "1px solid rgba(52,211,153,0.3)" }}>
              {(s.villageStats || []).map((vs: any) => <div key={vs.name}>{vs.name}: {vs.pop.toLocaleString()} 人</div>)}
            </div>
          </div>
          <div className="hp-stat-card" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))", border: "1px solid rgba(139,92,246,0.2)" }}
            onMouseEnter={e => { const t = e.currentTarget.querySelector('.tip') as HTMLElement; if(t) t.style.display='block'; }}
            onMouseLeave={e => { const t = e.currentTarget.querySelector('.tip') as HTMLElement; if(t) t.style.display='none'; }}>
            <div className="hp-stat-topline" style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }} />
            <div className="hp-stat-label" style={{ color: "#a78bfa" }}>帮扶人数</div>
            <div className="hp-stat-num" style={{ background: "linear-gradient(180deg, #a78bfa, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.helpCount.toLocaleString()}</div>
            <div className="hp-stat-sub">脱贫户 · 监测户 · 为民办实事</div>
            <div className="tip" style={{ display: "none", position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.95)", borderRadius: 8, padding: "8px 12px", fontSize: "0.55rem", color: "#cbd5e1", whiteSpace: "nowrap", zIndex: 10, marginBottom: 6, border: "1px solid rgba(139,92,246,0.3)" }}>
              {(s.villageStats || []).map((vs: any) => <div key={vs.name}>{vs.name} 脱贫户 {vs.poorPop}人 监测户 {vs.monitorPop}人</div>)}
            </div>
          </div>
          <div className="hp-stat-card" style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.12), rgba(251,191,36,0.06))", border: "1px solid rgba(251,191,36,0.2)" }}
            onMouseEnter={e => { const t = e.currentTarget.querySelector('.tip') as HTMLElement; if(t) t.style.display='block'; }}
            onMouseLeave={e => { const t = e.currentTarget.querySelector('.tip') as HTMLElement; if(t) t.style.display='none'; }}>
            <div className="hp-stat-topline" style={{ background: "linear-gradient(90deg, transparent, #fbbf24, transparent)" }} />
            <div className="hp-stat-label" style={{ color: "#fbbf24" }}>帮扶村数</div>
            <div className="hp-stat-num" style={{ background: "linear-gradient(180deg, #fbbf24, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>5</div>
            <div className="hp-stat-sub">覆盖全县 4 个乡镇</div>
            <div className="tip" style={{ display: "none", position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", background: "rgba(15,23,42,0.95)", borderRadius: 8, padding: "8px 12px", fontSize: "0.55rem", color: "#cbd5e1", whiteSpace: "nowrap", zIndex: 10, marginBottom: 6, border: "1px solid rgba(251,191,36,0.3)" }}>
              {(s.villageNames || []).map((n: string) => <div key={n}>{n}</div>)}
            </div>
          </div>
        </div>

        {/* ===== 5 队卡片 ===== */}
        <div className="hp-cards-wrap">
          {VILLAGES.map(v => {
            const members = teamMembers[v.slug] || [];
            const isHovered = hoveredSlug === v.slug;
            return (
              <a key={v.slug} href={v.url} target="_blank" rel="noopener noreferrer" className="hp-card-link"
                onMouseEnter={e => { setHoveredSlug(v.slug); const t = e.currentTarget.querySelector('.popup') as HTMLElement; if (t) t.style.display = 'block'; }}
                onMouseLeave={e => { setHoveredSlug(null); const t = e.currentTarget.querySelector('.popup') as HTMLElement; if (t) t.style.display = 'none'; }}>
                <div className="hp-card" style={{
                  background: isHovered ? `linear-gradient(135deg, ${v.color}22, ${v.color}10)` : "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                  border: isHovered ? `1px solid ${v.color}77` : "1px solid rgba(255,255,255,0.15)",
                }}>
                  <div className="hp-card-topline" style={{ background: `linear-gradient(90deg, transparent, ${v.color}, transparent)`, opacity: isHovered ? 1 : 0.5 }} />
                  <div className="hp-card-label">{v.label}</div>
                  <div className="hp-card-sub">{v.sub}</div>
                  <div className="hp-card-village" style={{ color: v.color }}>{v.village}</div>
                  {members.length > 0 && (
                    <div className="hp-card-members">
                      {members.slice(0, 5).map((m: any, j: number) => (
                        <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          {m.avatar ? (
                            <img src={m.avatar} alt="" className="hp-card-avatar-img" style={{ border: `2px solid ${v.color}44` }} />
                          ) : (
                            <div className="hp-card-avatar-fb" style={{ background: `linear-gradient(135deg, ${v.color}, ${v.color}88)` }}>
                              {(m.name || "?")[0]}
                            </div>
                          )}
                          <span className="hp-card-name">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="hp-card-desc">
                    {teamDesc[v.slug] || v.desc}
                  </div>
                  {isHovered && members.length > 0 && (
                    <div className="popup" style={{
                      position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                      background: "rgba(15,23,42,0.95)", borderRadius: 10, padding: "10px 14px",
                      border: `1px solid ${v.color}55`, zIndex: 20, marginTop: 6,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)", whiteSpace: "nowrap",
                    }}>
                      <div style={{ fontSize: "0.55rem", color: "#94a3b8", marginBottom: 6, textAlign: "center" }}>{v.sub}</div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        {members.slice(0, 6).map((m: any, j: number) => (
                          <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            {m.avatar ? (
                              <img src={m.avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${v.color}` }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${v.color}, ${v.color}88)`, color: "white", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                                {(m.name || "?")[0]}
                              </div>
                            )}
                            <span style={{ fontSize: "0.6rem", color: "white" }}>{m.name}</span>
                            {m.title && <span style={{ fontSize: "0.5rem", color: "#94a3b8" }}>{m.title}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>

        {/* ===== 四项职责 + 十项任务 ===== */}
        <div className="hp-duty-row">
          <div className="hp-duty-cards">
            <div className="hp-duty-card" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.18)" }}>
              <div className="hp-duty-label" style={{ color: "#818cf8" }}>🏛️ 建强组织</div>
              <div className="hp-duty-num" style={{ color: "#a78bfa" }}>{s.dutyStats["建强组织"] || 0}</div>
            </div>
            <div className="hp-duty-card" style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.18)" }}>
              <div className="hp-duty-label" style={{ color: "#f59e0b" }}>🌾 兴村富民</div>
              <div className="hp-duty-num" style={{ color: "#fbbf24" }}>{s.dutyStats["兴村富民"] || 0}</div>
            </div>
            <div className="hp-duty-card" style={{ background: "rgba(180,83,137,0.1)", border: "1px solid rgba(180,83,137,0.18)" }}>
              <div className="hp-duty-label" style={{ color: "#e879f9" }}>⚖️ 加强治理</div>
              <div className="hp-duty-num" style={{ color: "#f0abfc" }}>{s.dutyStats["加强治理"] || 0}</div>
            </div>
            <div className="hp-duty-card" style={{ background: "rgba(13,148,136,0.1)", border: "1px solid rgba(13,148,136,0.18)" }}>
              <div className="hp-duty-label" style={{ color: "#34d399" }}>❤️ 为民服务</div>
              <div className="hp-duty-num" style={{ color: "#5eead4" }}>{s.dutyStats["为民服务"] || 0}</div>
            </div>
          </div>
          <div className="hp-task-row">
            {[
              { n: 1, t: "帮扶计划" }, { n: 2, t: "入户走访" }, { n: 3, t: "学好政策" },
              { n: 4, t: "防止返贫" }, { n: 5, t: "建强党组织" }, { n: 6, t: "兴村产业" },
              { n: 7, t: "致富能手" }, { n: 8, t: "乡村建设" }, { n: 9, t: "移风易俗" }, { n: 10, t: "自身建设" },
            ].map(task => {
              const count = s.taskCounts[task.n] || 0;
              return (
                <span key={task.n} className="hp-task-tag" style={{
                  background: count > 0 ? "rgba(13,148,136,0.15)" : "rgba(255,255,255,0.08)",
                  color: count > 0 ? "#5eead4" : "#cbd5e1",
                  border: count > 0 ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.12)",
                }}>
                  {["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩"][task.n - 1]} {task.t}{count > 0 ? ` ${count}` : ""}
                </span>
              );
            })}
          </div>
        </div>

        {/* ===== 底部 ===== */}
        <div className="hp-footer">
          黑龙江省机关事务管理局版权所有<br />
          如需加入，请联系省机关事务管理局驻靠山村工作队
        </div>
      </div>
    </>
  );
}
