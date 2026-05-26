"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { ClipboardCheck, Plus, Loader2, Edit3, Camera, Upload, X, Hash } from "lucide-react";

const REQUEST_TYPES = ["基础设施", "医疗教育", "农业支持", "民生保障", "纠纷调解", "其他"];
const STATUS_OPTIONS = ["待处理", "处理中", "已解决"];
const STATUS_COLORS: Record<string, string> = { "待处理": "#fef3c7", "处理中": "#dbeafe", "已解决": "#dcfce7" };
const STATUS_TEXT: Record<string, string> = { "待处理": "#92400e", "处理中": "#2563eb", "已解决": "#16a34a" };

export default function PublicServicePage() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTag, setActiveTag] = useState("");
  const [searchResults, setSearchResults] = useState<{ name: string; phone: string; label: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    name: "", phone: "", requestType: "其他", description: "",
    staffIds: [] as string[], staffOther: "", photos: "", tags: "",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editPhotos, setEditPhotos] = useState("");

  useEffect(() => {
    fetch("/api/team-members").then(r => r.json()).then(d => {
      setMembers((d.members || []).map((m: any) => ({ id: m.id, name: m.name })));
    }).catch(() => {});
  }, []);

  // Parse all unique tags from items
  const allTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    items.forEach(item => {
      const raw = item.tags || "";
      if (!raw.trim()) return;
      raw.split(/[\s,，]+/).filter(Boolean).forEach((t: string) => {
        const clean = t.replace(/^#/, "").trim();
        if (clean && clean !== "[]" && clean.length >= 1) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    });
    return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    if (activeTag) params.set("tag", activeTag);
    fetch(`/api/public-service?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, activeTag]);

  const handleUpload = async (setter: (url: string) => void) => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const resp = await fetch("/api/photos/upload", { method: "POST", body: fd });
      const data = await resp.json();
      if (data.success && data.url) setter(data.url);
    } catch {}
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const insertTag = (tagName: string, target: any, setter: any) => {
    const current = (target.tags || "").trim();
    const tag = tagName.startsWith("#") ? tagName : `#${tagName}`;
    const newTags = current ? `${current} ${tag}` : tag;
    setter({ ...target, tags: newTags });
  };

  const handleNameSearch = (value: string) => {
    setForm({ ...form, name: value });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length < 1) { setSearchResults([]); setShowSearch(false); return; }
    searchTimer.current = setTimeout(() => {
      fetch(`/api/public-service/search-families?q=${encodeURIComponent(value)}`)
        .then(r => r.json()).then(d => {
          setSearchResults(d || []);
          setShowSearch((d || []).length > 0);
        }).catch(() => {});
    }, 200);
  };

  const selectVillager = (item: { name: string; phone: string }) => {
    setForm({ ...form, name: item.name, phone: item.phone });
    setShowSearch(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) { setError("村民姓名和办事内容不能为空"); return; }
    setSubmitting(true); setError("");
    try {
      const resp = await fetch("/api/public-service", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          requestType: form.requestType,
          description: form.description,
          staffIds: form.staffIds.join(","),
          staffOther: form.staffOther,
          photos: form.photos,
          tags: form.tags,
          createdAt: form.createdAt,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) { setSubmitted(true); setForm(emptyForm); fetchData(); }
      else setError(data.error || "提交失败");
    } catch (err: any) { setError(err.message || "网络错误"); }
    setSubmitting(false);
  };

  const handleSaveEdit = async (id: string) => {
    setSubmitting(true);
    try {
      const resp = await fetch("/api/public-service", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm, photos: editPhotos,
          staffIds: Array.isArray(editForm.staffIds) ? editForm.staffIds.join(",") : (editForm.staffIds || ""),
        }),
      });
      if (resp.ok) { setEditingId(null); fetchData(); }
    } catch {}
    setSubmitting(false);
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name, phone: item.phone || "", requestType: item.requestType || "其他",
      description: item.description || "", status: item.status || "待处理",
      staffIds: (item.staffIds || "").split(",").filter(Boolean),
      staffOther: item.staffOther || "", tags: item.tags || "",
    });
    setEditPhotos(item.photos || "");
  };

  const toggleStaff = (target: any, setter: any, id: string) => {
    setter((prev: any) => ({ ...prev, staffIds: (prev.staffIds || []).includes(id) ? prev.staffIds.filter((s: string) => s !== id) : [...(prev.staffIds || []), id] }));
  };

  const parseTags = (tagStr: string) => {
    if (!tagStr || tagStr === "[]") return [];
    return tagStr.split(/[\s,，]+/).filter(Boolean)
      .map((t: string) => t.replace(/^#/, "").trim())
      .filter((t: string) => t && t !== "[]" && t.length > 0);
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      {/* ====== Left Sidebar: Tag Cloud ====== */}
      <div style={{ width: 210, minWidth: 210, background: "#f8fafc", borderRight: "1px solid #e2e8f0", padding: "16px 12px", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Hash style={{ width: 16, height: 16, color: "#2563eb" }} />
          <h3 style={{ fontSize: "0.8rem", fontWeight: 700, margin: 0, color: "#1e293b" }}>标签分类</h3>
        </div>
        <button
          onClick={() => setActiveTag("")}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 8px", marginBottom: 4, borderRadius: 4, border: "none", background: activeTag === "" ? "#eff6ff" : "transparent", color: activeTag === "" ? "#2563eb" : "#64748b", fontSize: "0.72rem", cursor: "pointer", fontWeight: activeTag === "" ? 600 : 400 }}>
          全部标签 ({total})
        </button>
        {allTags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", padding: "3px 8px", marginBottom: 2, borderRadius: 4, border: "none", background: activeTag === tag ? "#eff6ff" : "transparent", color: activeTag === tag ? "#2563eb" : "#64748b", fontSize: "0.7rem", cursor: "pointer", fontWeight: activeTag === tag ? 600 : 400 }}>
            <span># {tag}</span>
            <span style={{ fontSize: "0.6rem", color: "#94a3b8", background: "#e2e8f0", borderRadius: 8, padding: "0 6px", minWidth: 18, textAlign: "center" }}>{count}</span>
          </button>
        ))}
        {allTags.length === 0 && <p style={{ fontSize: "0.65rem", color: "#94a3b8", padding: "4px 8px" }}>暂无标签</p>}
      </div>

      {/* ====== Right: Main Content ====== */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "#1e293b" }}>百姓办事登记</h1>
            <p style={{ fontSize: "0.7rem", color: "#64748b", margin: "2px 0 0" }}>
              共 {total} 条{activeTag && activeTag !== "[]" ? ` · 标签: #${activeTag}` : ""}
            </p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setSubmitted(false); setError(""); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", background: showForm ? "#e2e8f0" : "#2563eb", color: showForm ? "#475569" : "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
            <Plus style={{ width: 16, height: 16 }} /> {showForm ? "关闭" : "记录办事"}
          </button>
        </div>

        {/* New record form */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: "#f8fafc", borderRadius: 10, padding: 20, marginBottom: 20, border: "1px solid #e2e8f0" }}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: 16 }}>
                <ClipboardCheck style={{ width: 32, height: 32, color: "#22c55e", margin: "0 auto 6px" }} />
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#16a34a" }}>已记录</p>
                <button type="button" onClick={() => setSubmitted(false)} style={{ marginTop: 8, padding: "4px 16px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: "0.7rem" }}>继续记录</button>
              </div>
            ) : (
              <>
                {error && <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", fontSize: "0.75rem", marginBottom: 12 }}>{error}</div>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: 4 }}>日期 *</label>
                    <input type="date" required value={form.createdAt} onChange={e => setForm({ ...form, createdAt: e.target.value })}
                      style={{ width: "100%", padding: "7px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ position: "relative" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: 4 }}>村民姓名 *</label>
                    <input required value={form.name} onChange={e => handleNameSearch(e.target.value)}
                      onFocus={() => { if (searchResults.length > 0) setShowSearch(true); }}
                      onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                      placeholder="输入姓名搜索..."
                      style={{ width: "100%", padding: "7px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem", boxSizing: "border-box" }} />
                    {showSearch && searchResults.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, maxHeight: 180, overflow: "auto" }}>
                        {searchResults.map((item, i) => (
                          <div key={i} onMouseDown={() => selectVillager(item)}
                            style={{ padding: "8px 10px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: "0.78rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ fontWeight: 500, color: "#1e293b" }}>{item.label || item.name}</span>
                            {item.phone && <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{item.phone}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: 4 }}>联系方式</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: "100%", padding: "7px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: 4 }}>类型</label>
                    <select value={form.requestType} onChange={e => setForm({ ...form, requestType: e.target.value })} style={{ width: "100%", padding: "7px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem", boxSizing: "border-box" }}>
                      {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Tags input — Obsidian style */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    标签（用空格或 # 分隔，如: #基础设施 #紧急）
                  </label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input ref={tagInputRef} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                      placeholder="输入 #标签 或用空格分隔"
                      style={{ flex: 1, padding: "7px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.78rem", boxSizing: "border-box" }} />
                    {/* Quick-tag buttons from existing tags */}
                    {allTags.slice(0, 5).map(([t]) => (
                      <button key={t} type="button" onClick={() => insertTag(t, form, setForm)}
                        style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: "0.65rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                        # {t}
                      </button>
                    ))}
                  </div>
                  {form.tags && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {parseTags(form.tags).map(t => (
                        <span key={t} style={{ padding: "2px 8px", borderRadius: 3, background: "#eff6ff", color: "#2563eb", fontSize: "0.65rem", fontWeight: 500 }}>
                          # {t}
                          <button type="button" onClick={() => {
                            const current = parseTags(form.tags).filter(x => x !== t);
                            setForm({ ...form, tags: current.map(x => `#${x}`).join(" ") });
                          }} style={{ marginLeft: 4, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.6rem", padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Staff */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: 4 }}>工作人员（可多选）</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
                    {members.map(m => (
                      <button key={m.id} type="button" onClick={() => toggleStaff(form, setForm, m.id)}
                        style={{ padding: "3px 8px", borderRadius: 3, border: `1px solid ${form.staffIds.includes(m.id) ? "#2563eb" : "#e2e8f0"}`, background: form.staffIds.includes(m.id) ? "#eff6ff" : "#fff", color: form.staffIds.includes(m.id) ? "#2563eb" : "#64748b", fontSize: "0.7rem", cursor: "pointer", fontWeight: form.staffIds.includes(m.id) ? 600 : 400 }}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <input value={form.staffOther} onChange={e => setForm({ ...form, staffOther: e.target.value })} placeholder="其他工作人员" style={{ width: "100%", padding: "6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.75rem", boxSizing: "border-box" }} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: 4 }}>办事内容 *</label>
                  <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ width: "100%", padding: "7px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.8rem", boxSizing: "border-box", resize: "vertical" }} />
                </div>

                <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={() => handleUpload(url => setForm({ ...form, photos: url }))} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.7rem", color: "#475569" }}>
                    <Upload style={{ width: 13, height: 13 }} /> {uploading ? "上传中..." : form.photos ? "已上传 ✓" : "上传照片"}
                  </button>
                  {form.photos && (
                    <>
                      <img src={form.photos} alt="预览" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => window.open(form.photos, "_blank")} />
                      <button type="button" onClick={() => setForm({ ...form, photos: "" })} style={{ padding: "2px 6px", border: "none", background: "#fef2f2", color: "#dc2626", borderRadius: 4, cursor: "pointer", fontSize: "0.6rem" }}>移除</button>
                    </>
                  )}
                </div>

                <button type="submit" disabled={submitting} style={{ padding: "8px 20px", background: submitting ? "#94a3b8" : "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: submitting ? "not-allowed" : "pointer", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  {submitting && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />} {submitting ? "保存中..." : "保存记录"}
                </button>
              </>
            )}
          </form>
        )}

        {/* Records table */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "55px 75px 70px 70px 1fr 80px 70px 80px 55px", padding: "8px 12px", background: "#f1f5f9", fontSize: "0.66rem", fontWeight: 700, color: "#475569" }}>
            <div>状态</div><div>姓名</div><div>类型</div><div>标签</div><div>办事内容</div><div>工作人员</div><div>照片</div><div>日期</div><div></div>
          </div>
          {loading ? <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>加载中...</div>
          : items.length === 0 ? <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>{activeTag ? `没有标签 #${activeTag} 的记录` : "暂无记录"}</div>
          : items.map(item => {
            const staffNames = (item.staffIds || "").split(",").filter(Boolean).map((sid: string) => members.find(m => m.id === sid)?.name || sid).join("、");
            const allStaff = [staffNames, item.staffOther].filter(Boolean).join("、");
            const itemTags = parseTags(item.tags);

            if (editingId === item.id) {
              return (
                <div key={item.id} style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div><label style={{ fontSize: "0.62rem", color: "#94a3b8", display: "block" }}>姓名</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.75rem", boxSizing: "border-box" }} /></div>
                    <div><label style={{ fontSize: "0.62rem", color: "#94a3b8", display: "block" }}>联系方式</label><input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.75rem", boxSizing: "border-box" }} /></div>
                    <div><label style={{ fontSize: "0.62rem", color: "#94a3b8", display: "block" }}>状态</label><select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.75rem", boxSizing: "border-box" }}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  </div>
                  <div style={{ marginBottom: 8 }}><label style={{ fontSize: "0.62rem", color: "#94a3b8", display: "block" }}>类型</label><select value={editForm.requestType} onChange={e => setEditForm({ ...editForm, requestType: e.target.value })} style={{ padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.75rem" }}>{REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div style={{ marginBottom: 8 }}><label style={{ fontSize: "0.62rem", color: "#94a3b8", display: "block" }}>标签</label><input value={editForm.tags || ""} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} placeholder="#标签1 #标签2" style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.75rem", boxSizing: "border-box" }} /></div>
                  <div style={{ marginBottom: 8 }}><label style={{ fontSize: "0.62rem", color: "#94a3b8", display: "block" }}>工作人员</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 3 }}>{members.map(m => <button key={m.id} type="button" onClick={() => toggleStaff(editForm, setEditForm, m.id)} style={{ padding: "2px 6px", borderRadius: 3, border: `1px solid ${(editForm.staffIds || []).includes(m.id) ? "#2563eb" : "#e2e8f0"}`, background: (editForm.staffIds || []).includes(m.id) ? "#eff6ff" : "#fff", color: (editForm.staffIds || []).includes(m.id) ? "#2563eb" : "#64748b", fontSize: "0.62rem", cursor: "pointer" }}>{m.name}</button>)}</div>
                    <input value={editForm.staffOther || ""} onChange={e => setEditForm({ ...editForm, staffOther: e.target.value })} placeholder="其他" style={{ width: "100%", padding: "3px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.7rem", boxSizing: "border-box" }} /></div>
                  <div style={{ marginBottom: 8 }}><label style={{ fontSize: "0.62rem", color: "#94a3b8", display: "block" }}>办事内容</label><textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} style={{ width: "100%", padding: "4px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: "0.75rem", boxSizing: "border-box", resize: "vertical" }} /></div>
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={() => handleUpload(url => setEditPhotos(url))} /><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: "3px 8px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: "0.62rem" }}><Upload style={{ width: 11, height: 11, display: "inline" }} /> {editPhotos ? "已上传" : "照片"}</button>{editPhotos && <><img src={editPhotos} alt="预览" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 3, border: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => window.open(editPhotos, "_blank")} /><button type="button" onClick={() => setEditPhotos("")} style={{ padding: "2px 5px", border: "none", background: "#fef2f2", color: "#dc2626", borderRadius: 4, cursor: "pointer", fontSize: "0.58rem" }}>移除</button></>}</div>
                  <div style={{ display: "flex", gap: 6 }}><button onClick={() => handleSaveEdit(item.id)} disabled={submitting} style={{ padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}>{submitting ? "保存中..." : "保存"}</button><button onClick={() => setEditingId(null)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: "0.7rem" }}>取消</button></div>
                </div>
              );
            }

            return (
              <div key={item.id} onClick={() => { if (!activeTag) startEdit(item); }} style={{ display: "grid", gridTemplateColumns: "55px 75px 70px 70px 1fr 80px 70px 80px 55px", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "0.7rem", color: "#334155", alignItems: "center", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }} onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                <div><span style={{ padding: "2px 5px", borderRadius: 3, fontSize: "0.58rem", fontWeight: 600, background: STATUS_COLORS[item.status] || "#fef3c7", color: STATUS_TEXT[item.status] || "#92400e" }}>{item.status || "待处理"}</span></div>
                <div style={{ fontWeight: 500 }}>{item.name}</div>
                <div><span style={{ padding: "1px 4px", borderRadius: 3, background: "#eff6ff", color: "#2563eb", fontSize: "0.6rem" }}>{item.requestType}</span></div>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {itemTags.slice(0, 3).map((t: string) => (
                    <span key={t} onClick={(e) => { e.stopPropagation(); setActiveTag(activeTag === t ? "" : t); }}
                      style={{ padding: "1px 5px", borderRadius: 3, background: activeTag === t ? "#dbeafe" : "#f1f5f9", color: activeTag === t ? "#2563eb" : "#64748b", fontSize: "0.58rem", fontWeight: 500, cursor: "pointer" }}>
                      {t}
                    </span>
                  ))}
                  {itemTags.length > 3 && <span style={{ fontSize: "0.55rem", color: "#94a3b8" }}>+{itemTags.length - 3}</span>}
                </div>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.62rem", color: "#64748b" }}>{allStaff || "-"}</div>
                <div>{item.photos ? <span style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); window.open(item.photos, "_blank"); }} title="点击查看照片"><Camera style={{ width: 12, height: 12, color: "#2563eb" }} /></span> : <span style={{ color: "#cbd5e1" }}>—</span>}</div>
                <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>{item.createdAt?.slice(0, 10)}</div>
                <div><button onClick={(e) => { e.stopPropagation(); startEdit(item); }} style={{ padding: "2px 6px", border: "1px solid #e2e8f0", borderRadius: 3, background: "#fff", cursor: "pointer", fontSize: "0.58rem", color: "#64748b" }}><Edit3 style={{ width: 9, height: 9, display: "inline" }} /> 编辑</button></div>
              </div>
            );
          })}
        </div>

        {total > 15 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 12, fontSize: "0.72rem" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 4, background: page === 1 ? "#f8fafc" : "#fff", cursor: page === 1 ? "default" : "pointer" }}>上一页</button>
            <span style={{ padding: "4px 8px", color: "#64748b" }}>{page} / {Math.ceil(total / 15)}</span>
            <button onClick={() => setPage(p => Math.min(Math.ceil(total / 15), p + 1))} disabled={page >= Math.ceil(total / 15)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 4, background: page >= Math.ceil(total / 15) ? "#f8fafc" : "#fff", cursor: page >= Math.ceil(total / 15) ? "default" : "pointer" }}>下一页</button>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
