"use client";
import { useState } from "react";
import { X, Upload, Link as LinkIcon, FileText, ImageIcon } from "lucide-react";

interface RecordModalProps {
  taskType: number;
  taskTitle: string;
  editRecord?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function RecordModal({ taskType, taskTitle, editRecord, onClose, onSaved }: RecordModalProps) {
  const [title, setTitle] = useState(editRecord?.title || "");
  const [date, setDate] = useState(editRecord?.date ? new Date(editRecord.date).toISOString().slice(0, 10) : "");
  const [desc, setDesc] = useState(editRecord?.description || "");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [urls, setUrls] = useState<string[]>(() => { try { return JSON.parse(editRecord?.urls || "[]"); } catch { return []; } });
  const [urlInput, setUrlInput] = useState("");
  const [fileList, setFileList] = useState<any[]>(() => { try { return JSON.parse(editRecord?.files || "[]"); } catch { return []; } });
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [msg, setMsg] = useState("");

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fls = Array.from(e.target.files || []);
    setPhotoFiles(p => [...p, ...fls]);
    fls.forEach(f => {
      const r = new FileReader();
      r.onload = ev => setPhotoPreviews(p => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };

  const removePhoto = (i: number) => {
    setPhotoFiles(p => p.filter((_, j) => j !== i));
    setPhotoPreviews(p => p.filter((_, j) => j !== i));
  };

  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    setUrls(p => [...p, u]);
    setUrlInput("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fls = Array.from(e.target.files || []);
    if (!fls.length) return;
    setUploadingFile(true);
    for (const f of fls) {
      try {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("title", f.name);
        const r = await fetch("/api/paperless/training", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) {
          setFileList(p => [...p, { docId: d.docId, title: d.title, fileName: d.fileName, downloadUrl: d.downloadUrl }]);
        }
      } catch {}
    }
    setUploadingFile(false);
  };

  const removeFile = (i: number) => {
    setFileList(p => p.filter((_, j) => j !== i));
  };

  const handleSave = async () => {
    if (!title.trim()) { setMsg("请输入标题"); return; }
    if (!date) { setMsg("请选择日期"); return; }
    setSaving(true); setMsg("");

    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("date", date);
      fd.append("taskType", String(taskType));
      fd.append("description", desc);
      fd.append("urls", JSON.stringify(urls));
      fd.append("files", JSON.stringify(fileList));
      photoFiles.forEach(f => fd.append("photos", f));

      const method = editRecord ? "PUT" : "POST";
      const url = editRecord ? `/api/accountability/records/${editRecord.id}` : "/api/accountability/records";

      const r = await fetch(url, { method, body: fd });
      if (r.ok) { onSaved(); onClose(); }
      else { const d = await r.json(); setMsg(d.error || "保存失败"); }
    } catch { setMsg("网络错误"); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#1a1a2e", borderRadius: 16, padding: 24, width: "min(600px, 90vw)", maxHeight: "85vh", overflow: "auto", border: "1px solid rgba(180,83,137,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#e8d5c4", fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            {editRecord ? "编辑" : "新增"} - {taskTitle}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a4a5a", padding: 4 }}><X size={18} /></button>
        </div>

        {msg && <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.78rem", background: msg.includes("成功") ? "rgba(0,200,160,0.1)" : "rgba(220,38,38,0.1)", color: msg.includes("成功") ? "#00c8a0" : "#ef4444" }}>{msg}</div>}

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>标题 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "white", fontSize: "0.85rem", boxSizing: "border-box" }} placeholder="请输入记录标题" />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>日期 *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "white", fontSize: "0.85rem", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>描述</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "white", fontSize: "0.85rem", boxSizing: "border-box", resize: "vertical" }} placeholder="可选描述..." />
          </div>

          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>
              <ImageIcon size={14} style={{ display: "inline", marginRight: 4 }} />本地上传照片（jpg/png/gif/webp/heic）
            </label>
            {photoPreviews.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {photoPreviews.map((p, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={p} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                    <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", border: "none", color: "white", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(180,83,137,0.12)", border: "1px dashed rgba(180,83,137,0.3)", borderRadius: 8, cursor: "pointer", color: "#b45389", fontSize: "0.78rem" }}>
              <Upload size={14} /> 选择照片
              <input type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display: "none" }} />
            </label>
          </div>

          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>
              <LinkIcon size={14} style={{ display: "inline", marginRight: 4 }} />外部链接
            </label>
            {urls.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {urls.map((u, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6, marginBottom: 4, fontSize: "0.7rem" }}>
                    <LinkIcon size={12} style={{ color: "#d97706" }} />
                    <span style={{ color: "#94a3b8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u}</span>
                    <button onClick={() => setUrls(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: "0.82rem" }} placeholder="https://..." />
              <button onClick={addUrl} style={{ background: "rgba(217,119,6,0.2)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: 8, padding: "8px 14px", color: "#d97706", cursor: "pointer", fontSize: "0.78rem", whiteSpace: "nowrap" }}>添加</button>
            </div>
          </div>

          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", marginBottom: 4 }}>
              <FileText size={14} style={{ display: "inline", marginRight: 4 }} />文件（上传至 Paperless）
            </label>
            {fileList.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {fileList.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "rgba(99,102,241,0.08)", borderRadius: 6, marginBottom: 4, fontSize: "0.7rem" }}>
                    <FileText size={12} style={{ color: "#818cf8" }} />
                    <span style={{ color: "#94a3b8", flex: 1 }}>{f.fileName || f.title}</span>
                    <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "rgba(99,102,241,0.08)", border: "1px dashed rgba(99,102,241,0.25)", borderRadius: 8, cursor: "pointer", color: "#818cf8", fontSize: "0.78rem" }}>
              <Upload size={14} /> {uploadingFile ? "上传中..." : "选择文件"}
              <input type="file" multiple onChange={handleFileUpload} style={{ display: "none" }} disabled={uploadingFile} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "8px 18px", color: "#94a3b8", fontSize: "0.82rem", cursor: "pointer" }}>取消</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: "linear-gradient(135deg, #b45389, #d97706)", border: "none", borderRadius: 20, padding: "8px 22px", color: "white", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
