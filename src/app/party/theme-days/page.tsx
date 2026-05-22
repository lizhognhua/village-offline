"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Upload, FileText, Image, ChevronDown, ChevronRight, Users, MapPin, Calendar, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitize";

const ACTIVITY_TYPE = "themeDay";
const PAGE_TITLE = "主题党日";
const PAGE_ICON = "📅";
const ACCENT = "amber";

export default function ThemeDayPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fDate, setFDate] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fContent, setFContent] = useState("");
  const [fParticipants, setFParticipants] = useState<string[]>([]);
  const [fPhotos, setFPhotos] = useState<File[]>([]);
  const [fPhotoPreviews, setFPhotoPreviews] = useState<string[]>([]);
  const [fFiles, setFFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRecords = () => {
    setLoading(true);
    fetch(`/api/party/activities?type=${ACTIVITY_TYPE}&limit=50`).then(r => r.json()).then(d => setRecords(d.records || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecords();
    fetch("/api/party-members").then(r => r.json()).then(d => setMembers(d.members || [])).catch(() => {});
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fls = Array.from(e.target.files || []);
    setFPhotos(p => [...p, ...fls]);
    fls.forEach(f => {
      const r = new FileReader();
      r.onload = ev => setFPhotoPreviews(p => [...p, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };

  const removePhoto = (i: number) => {
    setFPhotos(p => p.filter((_, j) => j !== i));
    setFPhotoPreviews(p => p.filter((_, j) => j !== i));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fls = Array.from(e.target.files || []);
    if (!fls.length) return;
    setUploadingFile(true);
    for (const f of fls) {
      try {
        const fd = new FormData(); fd.append("file", f); fd.append("title", f.name);
        const r = await fetch("/api/files", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) setFFiles(p => [...p, { docId: d.docId, title: d.title, fileName: d.fileName, downloadUrl: d.downloadUrl }]);
      } catch {}
    }
    setUploadingFile(false);
  };

  const removeFile = (i: number) => { setFFiles(p => p.filter((_, j) => j !== i)); };

  const handleSave = async () => {
    if (!fTitle.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", fTitle.trim());
      fd.append("date", fDate);
      fd.append("type", ACTIVITY_TYPE);
      fd.append("location", fLocation);
      fd.append("content", fContent);
      fd.append("participants", JSON.stringify(fParticipants));
      fd.append("files", JSON.stringify(fFiles));
      fPhotos.forEach(f => fd.append("photos", f));

      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/party/activities/${editing.id}` : "/api/party/activities";

      if (editing) {
        // PUT uses JSON, not FormData (no photo re-upload on edit)
        const body: any = { title: fTitle, date: fDate, location: fLocation, content: fContent, participants: JSON.stringify(fParticipants), files: JSON.stringify(fFiles) };
        const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) { alert("保存失败"); return; }
      } else {
        const r = await fetch(url, { method, body: fd });
        if (!r.ok) { alert("保存失败"); return; }
      }

      setShowForm(false); setEditing(null);
      setFTitle(""); setFDate(""); setFLocation(""); setFContent("");
      setFParticipants([]); setFPhotos([]); setFPhotoPreviews([]); setFFiles([]);
      loadRecords();
    } catch { alert("网络错误"); }
    setSaving(false);
  };

  const openEdit = (rec: any) => {
    setEditing(rec);
    setFTitle(rec.title || "");
    setFDate(rec.date ? new Date(rec.date).toISOString().slice(0, 10) : "");
    setFLocation(rec.location || "");
    setFContent(rec.content || "");
    setFParticipants((() => { try { return JSON.parse(rec.participants || "[]"); } catch { return []; } })());
    setFFiles((() => { try { return JSON.parse(rec.files || "[]"); } catch { return []; } })());
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/party/activities/${id}`, { method: "DELETE" });
    loadRecords();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/party" className="text-sm text-gray-500 hover:text-red-600">← 返回党建</Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">{PAGE_ICON} {PAGE_TITLE}</h1>
        </div>
        <button onClick={() => { setEditing(null); setFTitle(""); setFDate(""); setFLocation(""); setFContent(""); setFParticipants([]); setFPhotos([]); setFPhotoPreviews([]); setFFiles([]); setShowForm(true); }}
          className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          <Plus size={14} />新增记录
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editing ? "编辑" : "新增"} - {PAGE_TITLE}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">标题 *</label><input value={fTitle} onChange={e => setFTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">日期 *</label><input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">地点</label><input value={fLocation} onChange={e => setFLocation(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" /></div>
              </div>
              <div>
                <label className="text-sm font-medium">参会人员</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button onClick={() => setFParticipants(p => p.length === members.length ? [] : members.map(m => m.name))}
                    className="px-2 py-1 rounded text-xs border bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">
                    {fParticipants.length === members.length ? "取消全选" : "全选"}
                  </button>
                  {members.map(m => (
                    <button key={m.id} onClick={() => setFParticipants(p => p.includes(m.name) ? p.filter(x => x !== m.name) : [...p, m.name])}
                      className={`px-2 py-1 rounded text-xs border ${fParticipants.includes(m.name) ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}>{m.name}</button>
                  ))}
                  {members.length === 0 && <span className="text-xs text-gray-400">暂无党员信息</span>}
                </div>
              </div>
              <div><label className="text-sm font-medium">内容</label><RichTextEditor content={fContent} onChange={setFContent} /></div>
              <div><label className="text-sm font-medium"><Image size={14} className="inline" /> 会议照片</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {fPhotoPreviews.map((p, i) => (
                    <div key={i} className="relative"><img src={p} className="w-16 h-16 object-cover rounded border" /><button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px]">✕</button></div>
                  ))}
                </div>
                <label className="flex items-center gap-1 px-3 py-1.5 mt-1 bg-blue-50 text-blue-600 rounded text-xs cursor-pointer hover:bg-blue-100 w-fit"><Upload size={12} />选择照片<input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" /></label>
              </div>
              <div><label className="text-sm font-medium"><FileText size={14} className="inline" /> 附件（会议通知/学习材料/笔记）</label>
                {fFiles.length > 0 && <div className="space-y-1 mt-1">{fFiles.map((f, i) => <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1"><FileText size={12} />{f.fileName || f.title}<button onClick={() => removeFile(i)} className="text-red-400">✕</button></div>)}</div>}
                <label className="flex items-center gap-1 px-3 py-1.5 mt-1 bg-indigo-50 text-indigo-600 rounded text-xs cursor-pointer hover:bg-indigo-100 w-fit"><Upload size={12} />{uploadingFile ? "上传中..." : "上传文件"}<input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploadingFile} /></label>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded text-sm">{saving ? "保存中..." : "保存"}</button>
            </div>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>暂无{PAGE_TITLE}记录</p>
          <button onClick={() => { setEditing(null); setFTitle(""); setFDate(""); setFLocation(""); setFContent(""); setFParticipants([]); setFPhotos([]); setFPhotoPreviews([]); setFFiles([]); setShowForm(true); }}
            className="text-red-600 text-sm mt-2 hover:underline">+ 新增第一条记录</button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const photos = (() => { try { return JSON.parse(rec.photos || "[]"); } catch { return []; } })();
            const files = (() => { try { return JSON.parse(rec.files || "[]"); } catch { return []; } })();
            const participants = (() => { try { return JSON.parse(rec.participants || "[]"); } catch { return []; } })();
            return (
              <div key={rec.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{rec.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <Calendar size={12} />{new Date(rec.date).toLocaleDateString("zh-CN")}
                        {rec.location && <><MapPin size={12} />{rec.location}</>}
                        {participants.length > 0 && <><Users size={12} />{participants.length}人</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {photos.length > 0 && <span className="text-xs text-green-500">📷{photos.length}</span>}
                      {files.length > 0 && <span className="text-xs text-blue-500">📎{files.length}</span>}
                      <button onClick={e => { e.stopPropagation(); openEdit(rec); }} className="p-1 hover:bg-gray-100 rounded"><Pencil size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(rec.id); }} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>
                      {expanded === rec.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>
                </div>
                {expanded === rec.id && (
                  <div className="px-4 pb-4 border-t bg-gray-50/50">
                    {rec.content && <div className="text-sm text-gray-700 mt-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(rec.content || "") }} />}
                    {photos.length > 0 && <div className="flex gap-2 mt-3 flex-wrap">{photos.map((url: string, i: number) => <img key={i} src={url} className="w-16 h-16 object-cover rounded border cursor-pointer" onClick={() => window.open(url, "_blank")} />)}</div>}
                    {files.length > 0 && <div className="mt-3 space-y-1">{files.map((f: any, i: number) => f.downloadUrl ? <a key={i} href={f.downloadUrl} target="_blank" className="flex items-center gap-1.5 text-xs text-blue-600"><Download size={12} />{f.fileName || f.title}</a> : <span key={i} className="flex items-center gap-1.5 text-xs text-gray-400"><FileText size={12} />{f.fileName || f.title}（处理中）</span>)}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
