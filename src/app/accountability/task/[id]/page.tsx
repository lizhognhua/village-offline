"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Footprints, ExternalLink } from "lucide-react";
import RecordCard from "@/components/accountability/RecordCard";
import RecordModal from "@/components/accountability/RecordModal";
import { TEN_TASKS, FOUR_DUTIES } from "@/lib/accountability";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskType = parseInt(params.id as string);
  const task = TEN_TASKS.find(t => t.index === taskType);

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  // Related visit records
  const [relatedVisits, setRelatedVisits] = useState<any[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const duty = FOUR_DUTIES.find(d => task?.duty && d.key === task.duty);

  const loadRecords = () => {
    setLoading(true);
    fetch(`/api/accountability/records?taskType=${taskType}&page=${page}&limit=24`)
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setTotal(d.total || 0); setTotalPages(d.totalPages || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRecords(); }, [taskType, page]);

  // Load related visit records for 为民服务 tasks
  useEffect(() => {
    if (task?.duty === "为民服务") {
      setVisitsLoading(true);
      fetch("/api/records?limit=20")
        .then(r => r.json())
        .then(d => { setRelatedVisits(d.records || []); })
        .catch(() => {})
        .finally(() => setVisitsLoading(false));
    }
  }, [taskType]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该记录？")) return;
    await fetch(`/api/accountability/records/${id}`, { method: "DELETE" });
    loadRecords();
  };

  const handleEdit = (r: any) => {
    setEditRecord(r);
    setShowModal(true);
  };

  if (!task) return <div style={{ color: "white", textAlign: "center", padding: 80, background: "#0f172a", minHeight: "100vh" }}>任务不存在</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "24px", fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <button onClick={() => router.push("/accountability")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#847b8a", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4, padding: 0, marginBottom: 8 }}>
              <ArrowLeft size={14} /> 返回履职全景
            </button>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e8d5c4", margin: 0 }}>
              {task.icon} {task.title}
            </h1>
            <p style={{ fontSize: "0.75rem", color: "#5a4a5a", marginTop: 4 }}>共 {total} 条记录</p>
          </div>
          <button onClick={() => { setEditRecord(null); setShowModal(true); }}
            style={{ background: "linear-gradient(135deg, #b45389, #d97706)", border: "none", borderRadius: 20, padding: "10px 20px", color: "white", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> 新增记录
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <div style={{ width: 32, height: 32, border: "3px solid #b45389", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: "#5a4a5a" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>{task.icon}</div>
            <p style={{ fontSize: "0.9rem" }}>暂无记录</p>
            <button onClick={() => { setEditRecord(null); setShowModal(true); }}
              style={{ background: "none", border: "1px solid rgba(180,83,137,0.3)", borderRadius: 20, padding: "8px 18px", color: "#b45389", fontSize: "0.82rem", cursor: "pointer", marginTop: 12 }}>
              + 添加第一条记录
            </button>
          </div>
        ) : (
          <>
            <div style={{ columns: "3 280px", gap: 12 }}>
              {records.map((r: any) => (
                <div key={r.id} style={{ breakInside: "avoid", marginBottom: 12 }}>
                  <RecordCard record={r} onEdit={handleEdit} onDelete={handleDelete} />
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, alignItems: "center" }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: page <= 1 ? "#3a3a4a" : "#94a3b8", cursor: page <= 1 ? "default" : "pointer", fontSize: "0.78rem" }}>上一页</button>
                <span style={{ color: "#5a4a5a", fontSize: "0.78rem" }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 14px", color: page >= totalPages ? "#3a3a4a" : "#94a3b8", cursor: page >= totalPages ? "default" : "pointer", fontSize: "0.78rem" }}>下一页</button>
              </div>
            )}
          </>
        )}

        {/* 关联走访记录 */}
        {task?.duty === "为民服务" && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ color: "#e8d5c4", fontSize: "1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Footprints size={18} style={{ color: "#d97706" }} /> 关联走访记录
              </h3>
              <button onClick={() => router.push("/visits")}
                style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: 16, padding: "5px 14px", color: "#d97706", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                查看全部 <ExternalLink size={12} />
              </button>
            </div>
            {visitsLoading ? (
              <div style={{ textAlign: "center", padding: 24, color: "#5a4a5a", fontSize: "0.78rem" }}>加载中...</div>
            ) : relatedVisits.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#5a4a5a", fontSize: "0.78rem", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                暂无关联走访记录
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {relatedVisits.slice(0, 10).map((v: any) => (
                  <div key={v.id}
                    onClick={() => router.push("/visits")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      background: "rgba(255,255,255,0.03)", borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                    }}>
                    <span style={{
                      fontSize: "0.65rem", padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                      background: v.type === "visit" ? "rgba(16,185,129,0.15)" : v.type === "condolence" ? "rgba(244,63,94,0.15)" : "rgba(59,130,246,0.15)",
                      color: v.type === "visit" ? "#10b981" : v.type === "condolence" ? "#f43f5e" : "#3b82f6",
                    }}>
                      {v.type === "visit" ? "走访" : v.type === "condolence" ? "慰问" : "来访"}
                    </span>
                    <span style={{ color: "#e0d0c0", fontSize: "0.82rem", flex: 1 }}>
                      {v.family?.headName || "未知农户"}
                    </span>
                    <span style={{ color: "#5a4a5a", fontSize: "0.68rem" }}>
                      {new Date(v.recordDate).toLocaleDateString("zh-CN")}
                    </span>
                    <span style={{ color: "#847b8a", fontSize: "0.7rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.content?.replace(/<[^>]*>/g, "") || ""}
                    </span>
                  </div>
                ))}
                {relatedVisits.length > 10 && (
                  <button onClick={() => router.push("/visits")}
                    style={{ textAlign: "center", padding: 8, color: "#d97706", fontSize: "0.72rem", background: "none", border: "none", cursor: "pointer" }}>
                    还有 {relatedVisits.length - 10} 条，查看全部 →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {showModal && (
          <RecordModal
            taskType={taskType}
            taskTitle={task.title}
            editRecord={editRecord}
            onClose={() => { setShowModal(false); setEditRecord(null); }}
            onSaved={loadRecords}
          />
        )}
      </div>
    </div>
  );
}
