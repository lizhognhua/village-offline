"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, GraduationCap, BookOpen, Users, Calendar, MapPin, Camera, FileText, Plus, X, ChevronDown, ChevronRight, Trash2, ExternalLink, Download, ArrowRight } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitize";

const STAFF_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

type TrainingFile = { docId: string | null; title: string; fileName: string; downloadUrl?: string };
type TrainingRecord = { id: string; time: string; endTime?: string; location: string; content: string; participants: string; photos: string | null; files: string | null; notes: string | null; };
type LocalFile = { id: string; title: string; createdAt: string; filePath: string; fileSize: number; mimeType: string };

export default function PartyPage() {
  const [tab, setTab] = useState<"party" | "training">("party");
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  // 动态获取当前工作队人员
  const [teamStaff, setTeamStaff] = useState<string[]>([]);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<TrainingRecord | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fStartTime, setFStartTime] = useState(""); const [fEndTime, setFEndTime] = useState(""); const [fLocation, setFLocation] = useState("");
  const [fContent, setFContent] = useState(""); const [fParticipants, setFParticipants] = useState<string[]>([]);
  const [fPhotos, setFPhotos] = useState<string[]>([]); const [fNotes, setFNotes] = useState("");
  const [fFiles, setFFiles] = useState<TrainingFile[]>([]);
  const [saving, setSaving] = useState(false); const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // 本地文件
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [plTotal, setPlTotal] = useState(0); const [plLoading, setPlLoading] = useState(true);

  const loadRecords = async () => {
    try { const r = await fetch("/api/training-records"); const d = await r.json(); setRecords(d.records || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadFiles = async () => {
    try { const r = await fetch("/api/files"); const d = await r.json(); setLocalFiles(d.files || []); setPlTotal(d.total || 0); }
    catch (e) { console.error(e); } finally { setPlLoading(false); }
  };
  useEffect(() => { loadRecords(); loadFiles();
    // 获取当前工作队成员
    fetch("/api/team-members").then(r => r.json()).then(d => {
      if (d.members) setTeamStaff(d.members.map((m: any) => m.name));
    }).catch(() => {});
  }, []);

  const groupedByYear: Record<string, TrainingRecord[]> = {};
  for (const rec of records) {
    const year = new Date(rec.time).getFullYear().toString();
    if (!groupedByYear[year]) groupedByYear[year] = [];
    groupedByYear[year].push(rec);
  }
  const years = Object.keys(groupedByYear).sort((a, b) => parseInt(b) - parseInt(a));

  const uploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    for (const file of Array.from(files)) {
      try { const fd = new FormData(); fd.append("file", file);
        const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) {
          setFPhotos((p) => [...p, d.url]);
        } else {
          alert("上传失败: " + (d.error || "服务器错误"));
        }
      } catch (e) {
        alert("上传网络错误: " + (e as Error).message);
      }
    }
    setUploadingPhotos(false); e.target.value = "";
  };

  const uploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploadingFiles(true);
    for (const file of Array.from(files)) {
      try { const fd = new FormData(); fd.append("file", file); fd.append("title", file.name.replace(/\.[^/.]+$/, ""));
        const r = await fetch("/api/files", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) setFFiles((p) => [...p, { docId: d.file?.id || null, title: d.file?.title || file.name, fileName: file.name, downloadUrl: "/api/files/" + d.file?.id }]);
      } catch {}
    }
    setUploadingFiles(false); e.target.value = "";
  };

  const saveRecord = async () => {
    if (!fStartTime || !fLocation || !fContent || fParticipants.length === 0) { alert("请填写培训时间、地点、内容和参与人员"); return; }
    setSaving(true);
    try {
      const body = { title: fTitle || null, time: fStartTime, endTime: fEndTime || null, location: fLocation, content: fContent, participants: fParticipants, photos: fPhotos, files: JSON.stringify(fFiles), notes: fNotes || null };
      let res;
      if (editRecord)
        res = await fetch("/api/training-records/" + editRecord.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      else
        res = await fetch("/api/training-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert("保存失败: " + (errData.error || "服务器错误"));
        return;
      }
      setFormOpen(false); setEditRecord(null); loadRecords();
    } catch (e) { alert("网络错误: " + (e as Error).message); } finally { setSaving(false); }
  };

  const openEdit = (rec: TrainingRecord) => {
    setEditRecord(rec); setFTitle(rec.title || ""); setFStartTime(new Date(rec.time).toISOString().slice(0, 16)); setFEndTime(rec.endTime ? new Date(rec.endTime).toISOString().slice(0, 16) : ""); setFLocation(rec.location);
    setFContent(rec.content); setFParticipants(JSON.parse(rec.participants || "[]"));
    setFPhotos(rec.photos ? JSON.parse(rec.photos) : []);
    try { setFFiles(JSON.parse(rec.files || "[]")); } catch { setFFiles([]); }
    setFNotes(rec.notes || ""); setFormOpen(true);
  };
  const openNew = () => {
    setEditRecord(null); setFTitle(""); setFStartTime(""); setFEndTime(""); setFLocation(""); setFContent(""); setFParticipants([]);
    setFPhotos([]); setFFiles([]); setFNotes(""); setFormOpen(true);
  };
  const deleteRecord = async (id: string) => {
    if (!confirm("确定删除？")) return; await fetch("/api/training-records/" + id, { method: "DELETE" }); loadRecords();
  };
  const fmtDate = (s: string, e?: string) => { const d = new Date(s); const base = d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日"; if (!e) return base; const d2 = new Date(e); if (d.toDateString() === d2.toDateString()) return base; return base + " ~ " + d2.getFullYear() + "年" + (d2.getMonth() + 1) + "月" + d2.getDate() + "日"; };
  const fmtMonth = (key: string) => { const [y, m] = key.split("-"); return y + "年" + parseInt(m) + "月"; };
  const parseFiles = (fj: string | null): TrainingFile[] => { try { return JSON.parse(fj || "[]"); } catch { return []; } };

  // Party building cards
  const partyCards = [
    { icon: Users, title: "党员管理", desc: "党员信息、组织关系、党费管理", color: "bg-red-50 text-red-600", href: "/party/members" },
    { icon: BookOpen, title: "三会一课", desc: "支部会议、党课学习记录", color: "bg-orange-50 text-orange-600", href: "/party/meetings" },
    { icon: Calendar, title: "主题党日", desc: "活动计划、开展记录、总结", color: "bg-amber-50 text-amber-600", href: "/party/theme-days" },
    { icon: Flag, title: "组织生活", desc: "民主生活会、组织生活会", color: "bg-rose-50 text-rose-600", href: "/party/org-life" },
  ];

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="bg-gradient-to-r from-red-700 to-red-900 rounded-2xl p-4 md:p-5 text-white shadow-lg">
        <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
          <Flag className="w-5 h-5 md:w-6 md:h-6" /> 党建培训
        </h1>
        <p className="mt-1 text-red-100 text-xs md:text-sm">靠山村驻村工作队党建学习与培训管理</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-white rounded-xl border shadow-sm p-1">
        <button onClick={() => setTab("party")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
            tab === "party" ? "bg-red-50 text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}>
          <Flag className="w-4 h-4" /> 党建模块
        </button>
        <button onClick={() => setTab("training")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
            tab === "training" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}>
          <GraduationCap className="w-4 h-4" /> 培训模块
        </button>
      </div>

      {/* ===== Party Building Tab ===== */}
      {tab === "party" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partyCards.map((c) => (
            <Link key={c.title} href={c.href}
              className="bg-white rounded-xl border shadow-sm p-4 md:p-5 hover:shadow-md hover:border-red-200 transition-all cursor-pointer group block">
              <div className="flex items-start gap-3 md:gap-4">
                <div className={`p-2.5 md:p-3 rounded-lg ${c.color.split(" ")[0]}`}>
                  <c.icon className={`w-4 h-4 md:w-5 md:h-5 ${c.color.split(" ")[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm md:text-base text-gray-900 group-hover:text-red-700 transition-colors">{c.title}</h3>
                  <p className="text-xs md:text-sm text-gray-500 mt-0.5">{c.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-300 group-hover:text-red-400 mt-1.5 flex-shrink-0 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ===== Training Tab ===== */}
      {tab === "training" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5">
          {/* LEFT: 培训记录 */}
          <div className="md:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-lg font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-red-500" /> 培训记录
              </h2>
              <button onClick={openNew}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs md:text-sm hover:bg-red-700 transition-colors">
                <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" /> 新增培训
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-b-2 border-red-600 rounded-full" /></div>
            ) : records.length === 0 ? (
              <div className="bg-white rounded-xl border shadow-sm p-6 md:p-8 text-center">
                <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">暂无培训记录</p>
                <button onClick={openNew} className="mt-2 text-xs md:text-sm text-red-600 hover:text-red-800">+ 新增第一条培训</button>
              </div>
            ) : (
              <div className="space-y-2">
                {years.map((year) => (
                  <div key={year} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <button onClick={() => setExpandedYears((p) => ({ ...p, [year]: !p[year] }))}
                      className="w-full flex items-center justify-between px-3 md:px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-xs md:text-sm">
                      <span className="font-bold text-gray-700">{year}年 ({groupedByYear[year].length}次)</span>
                      {expandedYears[year] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </button>
                    {expandedYears[year] && (
                      <div className="divide-y divide-gray-100">
                        {groupedByYear[year].map((rec) => {
                          const files = parseFiles(rec.files);
                          const isPhoto = (f: TrainingFile) => {
                            const url = (f.downloadUrl || f.fileName || "");
                            return /\.(jpg|jpeg|png|gif|webp|bmp)($|\?)/i.test(url) || (!f.docId && /\/api\/uploads\//.test(url));
                          };
                          const photos = files.filter(isPhoto);
                          const docs = files.filter(f => !isPhoto(f));
                          return (
                            <div key={rec.id}>
                              <div className="p-3 md:p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1 flex-wrap">
                                      <Calendar className="w-3 h-3" /><span>{fmtDate(rec.time, rec.endTime)}</span>
                                      <MapPin className="w-3 h-3 ml-0.5" /><span>{rec.location}</span>
                                    </div>
                                    <div className="text-xs md:text-sm text-gray-700 line-clamp-2 font-medium">{rec.title || (rec.content||"").replace(/<[^>]+>/g, "").substring(0, 100) || "未命名培训"}</div>
                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                      {(JSON.parse(rec.participants || "[]") as string[]).map((name, i) => (
                                        <span key={name} className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                          style={{ background: STAFF_COLORS[i % STAFF_COLORS.length] }}>{name}</span>
                                      ))}
                                      {docs.length > 0 && <span className="text-xs text-blue-500 ml-1">📎{docs.length}份</span>}
                                      {photos.length > 0 && <span className="text-xs text-green-500">📷{photos.length}张</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); openEdit(rec); }}
                                      className="p-1 hover:bg-blue-50 rounded text-blue-500"><GraduationCap className="w-3.5 h-3.5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteRecord(rec.id); }}
                                      className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              </div>
                              {expandedRec === rec.id && (
                                <div className="px-3 md:px-4 pb-3 md:pb-4 bg-gray-50/50 border-t border-gray-100">
                                  <div className="text-xs md:text-sm text-gray-700 mt-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(rec.content || "") }} />
                                  {photos.length > 0 && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                      {photos.map((f: TrainingFile, i: number) => (
                                        <img key={i} src={f.downloadUrl || f.fileName || ""} alt="" className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-lg border cursor-pointer"
                                          onClick={() => window.open(f.downloadUrl || f.fileName || "", "_blank")} />
                                      ))}
                                    </div>
                                  )}
                                  {docs.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <p className="text-xs text-gray-500 font-medium">📎 培训文件</p>
                                      {docs.map((f, i) => (
                                        f.downloadUrl && f.downloadUrl !== "#" ? (
                                          <a key={i} href={f.downloadUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 py-0.5">
                                            <FileText className="w-3 h-3" />{f.fileName || f.title}
                                          </a>
                                        ) : (
                                          <span key={i} className="flex items-center gap-1.5 text-xs text-gray-400 py-0.5">
                                            <FileText className="w-3 h-3" />{f.fileName || f.title}（处理中...）
                                          </span>
                                        )
                                      ))}
                                    </div>
                                  )}
                                  {rec.notes && <div className="mt-2 text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: sanitizeHtml((rec.notes||"").replace(/<[^>]+>/g, "").substring(0, 200)) }} />}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: 学习资料 */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm md:text-lg font-bold text-gray-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-blue-600" /> 学习资料
              </h2>
              <label className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs md:text-sm cursor-pointer hover:bg-blue-700 transition-colors">
                <FileText className="w-3 h-3 md:w-3.5 md:h-3.5" /> 上传
                <input type="file" onChange={uploadFiles} className="hidden" disabled={uploadingFiles} multiple />
              </label>
            </div>
            {plLoading ? (
              <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>
            ) : localFiles.length === 0 ? (
              <div className="bg-white rounded-xl border shadow-sm p-6 md:p-8 text-center">
                <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">暂无学习资料</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {localFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white rounded-lg border hover:bg-blue-50 transition-colors">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs md:text-sm text-gray-700 flex-1 truncate">{file.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
                      {file.fileSize ? (file.fileSize / 1024).toFixed(0) + "KB" : ""}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{new Date(file.createdAt).toLocaleDateString("zh-CN")}</span>
                    <a href={"/api/files/" + file.id} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-100 flex-shrink-0 flex items-center gap-0.5">
                      <ExternalLink className="w-3 h-3" />预览
                    </a>
                    <a href={"/api/files/" + file.id} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                      <Download className="w-3 h-3 text-gray-300 hover:text-blue-500" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== FORM MODAL ===== */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-4 md:p-6 space-y-3 md:space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                {editRecord ? "编辑培训记录" : "新增培训记录"}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-medium mb-0.5">培训标题</label>
                <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="留空则自动取培训内容前100字" />
              </div>
              <div><label className="block text-xs md:text-sm font-medium mb-0.5">培训时间 *</label>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs text-gray-400 mb-0.5">开始日期</label>
                  <input type="date" value={fStartTime} onChange={(e) => setFStartTime(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-0.5">结束日期（可选）</label>
                  <input type="date" value={fEndTime} onChange={(e) => setFEndTime(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                </div></div>
              <div><label className="block text-xs md:text-sm font-medium mb-0.5">培训地点 *</label>
                <input type="text" value={fLocation} onChange={(e) => setFLocation(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="如：县委组织部会议室" /></div>
            </div>
            <div><label className="block text-xs md:text-sm font-medium mb-0.5">培训内容 *</label>
              <RichTextEditor content={fContent} onChange={(html: string) => setFContent(html)} placeholder="请输入培训内容..." /></div>
            <div><label className="block text-xs md:text-sm font-medium mb-0.5">参与人员 *</label>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {teamStaff.length > 0 ? teamStaff.map((name: string, i: number) => (
                  <button key={name} type="button" onClick={() => setFParticipants((p) => p.includes(name) ? p.filter((x) => x !== name) : [...p, name])}
                    className={`px-3 py-1.5 rounded-lg text-xs md:text-sm border transition-colors ${fParticipants.includes(name) ? "text-white font-medium" : "text-gray-600 bg-white hover:bg-gray-50 border-gray-300"}`}
                    style={fParticipants.includes(name) ? { background: STAFF_COLORS[i % STAFF_COLORS.length], borderColor: STAFF_COLORS[i % STAFF_COLORS.length] } : {}}>{name}</button>
                )) : <span className="text-xs text-gray-400">暂无工作队成员信息，请先在首页内容管理中添加</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-xs md:text-sm font-medium mb-0.5">培训照片（可多选）</label>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 text-xs md:text-sm">
                  <Camera className="w-3.5 h-3.5" /> {uploadingPhotos ? "上传中..." : "上传照片"}
                  <input type="file" accept="image/*" onChange={uploadPhotos} className="hidden" disabled={uploadingPhotos} multiple /></label>
                {fPhotos.length > 0 && <div className="flex gap-1.5 mt-1.5 flex-wrap">{fPhotos.map((url, i) => (<div key={i} className="relative group">
                  <img src={url} alt="" className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-lg border" />
                  <button onClick={() => setFPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
                </div>))}</div>}
              </div>
              <div><label className="block text-xs md:text-sm font-medium mb-0.5">培训文件（可多选上传）</label>
                <label className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 text-xs md:text-sm">
                  <FileText className="w-3.5 h-3.5" /> {uploadingFiles ? "上传中..." : "上传文件（多选）"}
                  <input type="file" onChange={uploadFiles} className="hidden" disabled={uploadingFiles} multiple /></label>
                {uploadingFiles && <p className="text-xs text-blue-500 mt-1">⏳ 正在上传...</p>}
                {fFiles.length > 0 && <div className="mt-1.5 space-y-1">{fFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="truncate flex-1">{f.fileName || f.title}</span>
                    <button onClick={() => setFFiles((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>
                  </div>
                ))}</div>}
              </div>
            </div>
            <div><label className="block text-xs md:text-sm font-medium mb-0.5">备注</label>
              <RichTextEditor content={fNotes} onChange={(html: string) => setFNotes(html)} placeholder="补充说明..." /></div>
            <div className="flex gap-2 justify-end pt-1 md:pt-2">
              <button onClick={() => setFormOpen(false)} className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-xs md:text-sm">取消</button>
              <button onClick={saveRecord} disabled={saving}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs md:text-sm">{saving ? "保存中..." : "保存"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
