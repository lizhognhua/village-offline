"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderArchive, FileText, Users, BookOpen, Upload,
  FolderOpen, Search, Download, X, Eye
} from "lucide-react";

export default function ArchivePage() {
  const [stats, setStats] = useState({ families: 0, projects: 0, diaries: 0 });
  const [files, setFiles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [previewFile, setPreviewFile] = useState<any>(null);

  useEffect(() => {
    // Load local stats
    Promise.all([
      fetch("/api/village/stats").then(r => r.json()),
      fetch("/api/files?limit=200").then(r => r.json()),
    ]).then(([statsData, filesData]) => {
      setStats({
        families: statsData?.stats?.totalFamilies || 0,
        projects: statsData?.stats?.activeProjects || 0,
        diaries: statsData?.stats?.diaries || 0,
      });
      setFiles(filesData.files || []);
      setTotal(filesData.total || 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" />
    </div>
  );

  const sections = [
    { title: "农户档案", count: stats.families, icon: Users, color: "text-blue-600", bg: "bg-blue-50", href: "/village" },
    { title: "项目档案", count: stats.projects, icon: FolderOpen, color: "text-indigo-600", bg: "bg-indigo-50", href: "/industries" },
    { title: "工作笔记", count: stats.diaries, icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50", href: "/diary" },
  ];

  // Helpers
  const parseTags = function(tagsStr: string) {
    if (!tagsStr) return [];
    try { var t = JSON.parse(tagsStr); if (Array.isArray(t)) return t; } catch {}
    return tagsStr.split(/[,，]/).map(function(s: string) { return s.trim(); }).filter(Boolean);
  };

  // Group files by category
  const groupedFiles: Record<string, any[]> = {};
  for (const f of files) {
    const cat = f.category || "未分类";
    if (!groupedFiles[cat]) groupedFiles[cat] = [];
    groupedFiles[cat].push(f);
  }

  const filteredFiles = searchInput
    ? files.filter(f => (f.title || "").toLowerCase().includes(searchInput.toLowerCase()))
    : files;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FolderArchive className="w-6 h-6 text-primary-600" /> 文件档案
        </h1>
        <Link href="/archive/upload"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800 transition-colors">
          <Upload className="w-4 h-4" /> 上传文件
        </Link>
      </div>

      {/* 系统档案卡片 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">系统档案</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map(function(s) {
            const IconComp = s.icon;
            return (
              <Link key={s.title} href={s.href}
                className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md hover:border-primary-200 transition-all">
                <div className="flex items-center justify-between">
                  <div className={"p-2.5 rounded-lg " + s.bg}><IconComp className={"w-5 h-5 " + s.color} /></div>
                  <span className="text-3xl font-bold text-gray-900">{s.count}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-700">{s.title}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 本地文件档案 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            文件档案 · 共 {total} 份
          </h2>
          <div style={{ position: "relative" }}>
            <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索文件..."
              style={{
                padding: "6px 32px 6px 30px", borderRadius: "8px", fontSize: "13px",
                border: "1px solid #d1d5db", background: "#f9fafb", color: "#1f2937",
                width: "200px", outline: "none",
              }} />
            {searchInput && (
              <button onClick={() => setSearchInput("")}
                style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {filteredFiles.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
              <FileText style={{ width: "40px", height: "40px", opacity: 0.3, margin: "0 auto 8px auto", display: "block" }} />
              <p style={{ fontSize: "14px" }}>暂无文件，点击右上角上传</p>
            </div>
          ) : (
            filteredFiles.map((file: any) => (
              <div key={file.id}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 16px", borderBottom: "1px solid #f3f4f6",
                }}>
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "13px", color: "#1f2937", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {file.title}
                  </span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {file.category || "未分类"} · {file.fileSize ? (file.fileSize / 1024).toFixed(0) + " KB" : ""} · {new Date(file.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                  {parseTags(file.tags).length > 0 && (
                    <span style={{ fontSize: "10px", display: "flex", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
                      {parseTags(file.tags).map(function(t: string, i: number) {
                        return <span key={i} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>{t}</span>;
                      })}
                    </span>
                  )}
                </div>
                <button onClick={() => setPreviewFile(file)}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 flex-shrink-0"
                  title="预览">
                  <Eye className="w-4 h-4" />
                </button>
                <a href={"/api/files/" + file.id} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-800 px-2 py-1 rounded hover:bg-primary-50 flex-shrink-0"
                  title="下载" style={{ textDecoration: "none" }}>
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setPreviewFile(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold text-gray-800 truncate">{previewFile.title}</h3>
              <button onClick={() => setPreviewFile(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
              {(() => {
                const url = "/api/files/" + previewFile.id;
                const mime = previewFile.mimeType || "";
                const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(previewFile.title);
                const isPdf = mime === "application/pdf" || /\.pdf$/i.test(previewFile.title);

                if (isImage) {
                  return <img src={url} alt={previewFile.title} className="max-w-full max-h-[70vh] object-contain rounded" />;
                }
                if (isPdf) {
                  return (
                    <iframe src={url} className="w-full h-[70vh] rounded border" title={previewFile.title} />
                  );
                }
                return (
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">此文件类型不支持在线预览</p>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm text-blue-600 hover:underline">
                      <Download className="w-4 h-4 inline mr-1" />下载后查看
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
