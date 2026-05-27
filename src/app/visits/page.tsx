"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Heart, Plus, User, Users, Search, ChevronLeft, ChevronRight, X, Calendar, FileText } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

type RecordItem = {
  id: string; type: string; recordDate: string; content: string;
  statusTags: string; items: string; staff: string; photos: string;
  family: { headName: string; familyAttr: string | null };
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月" + dt.getDate() + "日";
}

function fmtShortDate(d: string) {
  const dt = new Date(d);
  return dt.getFullYear() + "/" + (dt.getMonth() + 1) + "/" + dt.getDate();
}

export default function VisitsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "visit" | "condolence" | "reception">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [detail, setDetail] = useState<RecordItem | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    fetch("/api/records?page=" + page + "&limit=12")
      .then(r => r.json()).then(d => { setRecords(d.records || []); setTotal(d.total || 0); setTotalPages(d.totalPages || 0); })
      .catch(console.error).finally(() => setLoading(false));
  }, [page]);

  const filtered = records.filter(r => {
    if (tab === "visit" && r.type !== "visit") return false;
    if (tab === "condolence" && r.type !== "condolence") return false;
    if (tab === "reception" && r.type !== "reception") return false;
    if (search) return (r.family?.headName || "").includes(search);
    return true;
  });

  const attrColor: Record<string, string> = {
    "脱贫户": "bg-green-100 text-green-700", "监测户": "bg-orange-100 text-orange-700",
    "低保户": "bg-blue-100 text-blue-700", "五保户": "bg-purple-100 text-purple-700",
  };

  const parseTags = (s: string) => { try { return JSON.parse(s); } catch { return []; } };
  const parsePhotos = (s: string) => {
    try { const arr = JSON.parse(s); return arr.map((p: string) => p.startsWith("/uploads/") ? p.replace("/uploads/", "/api/uploads/") : p); }
    catch { return []; }
  };
  const deleteRecord = async (id: string) => {
    const res = await fetch("/api/records/" + id, { method: "DELETE" });
    if (res.ok) { setRecords(prev => prev.filter(v => v.id !== id)); setDetail(null); setConfirmDelete(null); setTotal(prev => prev - 1); }
  };

  return (
    <div className="space-y-6">
      {/* 标题 + 新增按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Footprints className="w-6 h-6 text-emerald-600" />
            <Heart className="w-5 h-5 text-red-500 -ml-1" />
            走访慰问
          </h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 条记录</p>
        </div>
        <button onClick={() => router.push("/visits/new")}
          className="flex items-center gap-1.5 bg-primary-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-800">
          <Plus className="w-4 h-4" /> 新增
        </button>
      </div>

      {/* Tab + 搜索 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {([
            { key: "all" as const, label: "全部", icon: null },
            { key: "visit" as const, label: "👣 走访", icon: null },
            { key: "condolence" as const, label: "❤️ 慰问", icon: null },
            { key: "reception" as const, label: "👥 来访", icon: null },
          ]).map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                tab === t.key ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}>{t.label}</button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索农户姓名..." className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {/* 卡片列表 */}
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>
      : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <Footprints className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-lg">暂无记录</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(r => {
            const tags = parseTags(r.statusTags);
            const photos = parsePhotos(r.photos);
            return (
              <div key={r.id} onClick={() => setDetail(r)}
                className="bg-white rounded-xl border shadow-sm p-3 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-1.5 mb-1">
                  {r.type === "visit" ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">走访</span>
                  ) : r.type === "condolence" ? (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">慰问</span>
                  ) : (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">来访</span>
                  )}
                  <span className="text-[11px] text-gray-400 ml-auto">{fmtShortDate(r.recordDate)}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium text-gray-900 text-sm truncate">{r.family.headName}</span>
                </div>
                {r.family.familyAttr && <span className={"text-[10px] px-1.5 py-0.5 rounded " + (attrColor[r.family.familyAttr] || "bg-gray-100 text-gray-600")}>{r.family.familyAttr}</span>}
                {tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{tags.map((t: string, i: number) => (<span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">{t}</span>))}</div>}
                {photos.length > 0 && <div className="flex gap-1 mt-1.5">{photos.slice(0, 2).map((ph: string, i: number) => <img key={i} src={ph} className="w-10 h-10 object-cover rounded border" onClick={(e) => { e.stopPropagation(); setViewPhoto(ph); }} />)}{photos.length > 2 && <span className="text-[10px] text-gray-400 self-center">+{photos.length - 2}</span>}</div>}
                <p className="text-xs text-gray-500 line-clamp-2 mt-1.5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.content || "") }} />
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-gray-600">第 {page}/{totalPages} 页</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {/* 详情弹窗 */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-12 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {detail.type === "visit" ? (
                  <><Footprints className="w-5 h-5 text-emerald-600" /> 走访详情</>
                ) : detail.type === "condolence" ? (
                  <><Heart className="w-5 h-5 text-red-500" /> 慰问详情</>
                ) : (
                  <><Users className="w-5 h-5 text-blue-500" /> 来访详情</>
                )}
              </h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-gray-500">农户：</span><span className="font-medium">{detail.family.headName}</span></div>
                <div><span className="text-gray-500">日期：</span><span>{fmtDate(detail.recordDate)}</span></div>
                <div><span className="text-gray-500">走访人：</span><span>{detail.staff || "未知"}</span></div>
              </div>
              {(() => { const t = parseTags(detail.statusTags); return t.length > 0 ? <div><span className="text-gray-500">状态：</span><div className="flex flex-wrap gap-1 mt-1">{t.map((x: string, i: number) => <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{x}</span>)}</div></div> : null; })()}
              <div><span className="text-gray-500">内容：</span><div className="bg-gray-50 rounded-lg p-3 text-gray-700 mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(detail.content || "") }} /></div>
              {parsePhotos(detail.photos).length > 0 && (
                <div>
                  <span className="text-gray-500">照片/视频（{parsePhotos(detail.photos).length}）：</span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {parsePhotos(detail.photos).map((ph: string, i: number) =>
                      ph.match(/\.(mp4|mov|avi)$/i)
                        ? <video key={i} src={ph} controls className="w-full h-32 object-cover rounded-lg border" />
                        : <img key={i} src={ph} className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); setViewPhoto(ph); }} />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t flex justify-between gap-2">
              <button onClick={() => router.push("/accountability/task/2")} className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 flex items-center gap-1">
                <FileText className="w-3 h-3" /> 履职台账
              </button>
              <div className="flex gap-2">
                <button onClick={() => router.push("/visits/edit/" + detail.id)} className="text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100">编辑</button>
                <button onClick={() => setConfirmDelete(detail.id)} className="text-xs px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100">删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-gray-800 font-medium mb-4">确定删除这条记录？</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border rounded-lg">取消</button>
              <button onClick={() => deleteRecord(confirmDelete)} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 照片查看 */}
      {viewPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setViewPhoto(null)}>
          <div className="relative max-w-5xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {viewPhoto.match(/\.(mp4|mov|avi)$/i)
              ? <video src={viewPhoto} controls className="max-w-full max-h-[90vh] rounded-xl" />
              : <img src={viewPhoto} className="max-w-full max-h-[90vh] rounded-xl" />}
            <button onClick={() => setViewPhoto(null)} className="absolute top-4 right-4 text-3xl text-white hover:text-gray-300">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}
