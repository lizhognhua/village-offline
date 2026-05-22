"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Check, ChevronLeft, ChevronRight, Trash2, ImageIcon, Pencil, X, Save, Plus, Upload, Link as LinkIcon } from "lucide-react";

const CAT_LABELS: Record<string, string> = {
  scenery: "乡村风景",
  culture: "风土人文",
  portrait: "村民风采",
  activity: "工作活动",
};

const CAT_COLORS: Record<string, string> = {
  scenery: "bg-green-100 text-green-700",
  culture: "bg-purple-100 text-purple-700",
  portrait: "bg-blue-100 text-blue-700",
  activity: "bg-orange-100 text-orange-700",
};

interface AlbumImage {
  id: string;
  url: string;
  title: string | null;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function AlbumsPage() {
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("uncategorized");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchTargetCat, setBatchTargetCat] = useState("");

  // Add photo
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"upload" | "url">("upload");
  const [addUrl, setAddUrl] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addCategory, setAddCategory] = useState("scenery");
  const [uploading, setUploading] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  const limit = 48;

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("category", category);
      if (search) params.set("search", search);

      const res = await fetch("/api/albums?" + params.toString());
      const data = await res.json();
      if (data.success) {
        setImages(data.images || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCounts(data.counts || {});
      } else {
        alert("加载失败：" + (data.error || "未知错误"));
      }
    } catch (e) {
      alert("网络错误：" + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, category, search]);

  useEffect(() => { loadImages(); }, [loadImages]);
  useEffect(() => { setSelected(new Set()); }, [category, page, search]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Count uncategorized
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);
  const categorizedCount = (counts.scenery || 0) + (counts.culture || 0) + (counts.portrait || 0) + (counts.activity || 0);
  const uncategorizedCount = totalAll - categorizedCount;

  const tabs = [
    { key: "uncategorized", label: "未分类", count: uncategorizedCount },
    { key: "scenery", label: "乡村风景", count: counts.scenery || 0 },
    { key: "culture", label: "风土人文", count: counts.culture || 0 },
    { key: "portrait", label: "村民风采", count: counts.portrait || 0 },
    { key: "activity", label: "工作活动", count: counts.activity || 0 },
  ];

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === images.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(images.map(i => i.id)));
    }
  };

  // Batch categorize
  const batchCategorize = async (targetCat: string) => {
    if (selected.size === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/albums", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), category: targetCat }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        loadImages();
      } else {
        alert("操作失败：" + (data.error || "未知错误"));
      }
    } catch (e) {
      alert("网络错误：" + (e as Error).message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Batch delete
  const batchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除 ${selected.size} 张图片？删除后不可恢复。`)) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/albums", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected(new Set());
        loadImages();
      } else {
        alert("操作失败：" + (data.error || "未知错误"));
      }
    } catch (e) {
      alert("网络错误：" + (e as Error).message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Single image edit save
  const saveEdit = async (id: string) => {
    try {
      const body: any = {};
      if (editTitle !== undefined) body.title = editTitle;
      if (editCategory) body.category = editCategory;

      const res = await fetch("/api/carousel/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingId(null);
        loadImages();
      } else {
        const err = await res.json().catch(() => ({}));
        alert("操作失败：" + (err.error || "未知错误"));
      }
    } catch (e) {
      alert("网络错误：" + (e as Error).message);
    }
  };

  // Add photo handlers
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    setUploading(true); setAddMsg("");
    var success = 0;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData(); fd.append("file", file);
        const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) {
          await fetch("/api/carousel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: d.url, title: addTitle || file.name, category: addCategory, sortOrder: 0 }),
          });
          success++;
        }
      } catch {}
    }
    setAddMsg(success > 0 ? `成功添加 ${success} 张照片` : "上传失败");
    setUploading(false);
    if (success > 0) { setAddTitle(""); loadImages(); }
  };

  const handleAddUrl = async () => {
    if (!addUrl.trim()) { setAddMsg("请输入图片URL"); return; }
    setUploading(true); setAddMsg("");
    try {
      const r = await fetch("/api/carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addUrl.trim(), title: addTitle, category: addCategory, sortOrder: 0 }),
      });
      if (r.ok) { setAddMsg("添加成功"); setAddUrl(""); setAddTitle(""); loadImages(); }
      else { const d = await r.json(); setAddMsg(d.error || "添加失败"); }
    } catch { setAddMsg("网络错误"); }
    setUploading(false);
  };
  // Single image delete
  const deleteImage = async (id: string) => {
    if (!confirm("确定删除这张图片？")) return;
    try {
      const dr = await fetch("/api/carousel/" + id, { method: "DELETE" });
      if (dr.ok) {
        loadImages();
      } else {
        const de = await dr.json().catch(() => ({}));
        alert("删除失败：" + (de.error || "未知错误"));
      }
    } catch (e) {
      alert("网络错误：" + (e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary-600" />
          相册管理
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            共 {totalAll} 张 · 已分类 {categorizedCount} 张
          </span>
          <button onClick={() => { setShowAddForm(!showAddForm); setAddMsg(""); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
            <Plus className="w-4 h-4" /> 添加照片
          </button>
        </div>
      </div>

      {/* Add Photo Form */}
      {showAddForm && (
        <div className="p-4 bg-primary-50 border-2 border-primary-200 rounded-xl space-y-3">
          {addMsg && <div className={`text-sm ${addMsg.includes("成功") ? "text-green-600" : "text-red-600"}`}>{addMsg}</div>}
          <div className="flex gap-2">
            <button onClick={() => setAddMode("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${addMode === "upload" ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              <Upload className="w-3.5 h-3.5" /> 本地上传
            </button>
            <button onClick={() => setAddMode("url")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${addMode === "url" ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              <LinkIcon className="w-3.5 h-3.5" /> URL链接
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {addMode === "upload" ? (
              <label className={`flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm cursor-pointer hover:bg-blue-700 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="w-4 h-4" /> {uploading ? "上传中..." : "选择照片上传"}
                <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            ) : (
              <div className="flex gap-2">
                <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="粘贴图片URL地址" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <button onClick={handleAddUrl} disabled={uploading}
                  className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap">添加</button>
              </div>
            )}
            <input value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="照片标题（可选）" className="border rounded-lg px-3 py-2 text-sm" />
            <select value={addCategory} onChange={e => setAddCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="scenery">乡村风景</option>
              <option value="culture">风土人文</option>
              <option value="portrait">村民风采</option>
              <option value="activity">工作活动</option>
            </select>
          </div>
        </div>
      )}

      {/* Search + Pagination info */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索标题..."
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setPage(1); }}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <span className="text-xs text-gray-400">
          第 {page}/{totalPages} 页 · 共 {total} 条
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setCategory(tab.key); setPage(1); }}
            className={"px-3 py-1.5 text-xs rounded-full transition-colors " + (
              category === tab.key
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            )}
          >
            {tab.label} <span className="opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Batch Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <span className="text-sm font-medium text-primary-700">
            已选 {selected.size} 张
          </span>
          <button
            onClick={selectAll}
            className="text-xs text-primary-600 hover:underline"
          >
            {selected.size === images.length ? "取消全选" : "全选本页"}
          </button>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-gray-500">移动到→</span>
            <select
              value={batchTargetCat}
              onChange={e => setBatchTargetCat(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value="">选择分类</option>
              <option value="scenery">乡村风景</option>
              <option value="culture">风土人文</option>
              <option value="portrait">村民风采</option>
              <option value="activity">工作活动</option>
            </select>
            <button
              onClick={() => { if (batchTargetCat) batchCategorize(batchTargetCat); }}
              disabled={!batchTargetCat || batchLoading}
              className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {batchLoading ? "处理中..." : "批量分类"}
            </button>
          </div>
          <button
            onClick={batchDelete}
            disabled={batchLoading}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 flex items-center gap-1 ml-auto"
          >
            <Trash2 className="w-3 h-3" /> 批量删除
          </button>
        </div>
      )}

      {/* Image Grid */}
      {loading ? (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无照片</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {images.map(img => {
              const isEditing = editingId === img.id;
              const catLabel = CAT_LABELS[img.category] || img.category;
              const catColor = CAT_COLORS[img.category] || "bg-gray-100 text-gray-500";
              return (
                <div
                  key={img.id}
                  className={"relative bg-white rounded-lg border overflow-hidden group transition-all " + (
                    selected.has(img.id) ? "ring-2 ring-primary-500 border-primary-500" : "border-gray-200 hover:shadow-md"
                  )}
                >
                  {/* Checkbox overlay */}
                  <button
                    onClick={() => toggleSelect(img.id)}
                    className={"absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors " + (
                      selected.has(img.id)
                        ? "bg-primary-600 border-primary-600 text-white"
                        : "bg-white/80 border-white hover:bg-white"
                    )}
                  >
                    {selected.has(img.id) && <Check className="w-3 h-3" />}
                  </button>

                  {/* Image */}
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    <img
                      src={img.url}
                      alt={img.title || ""}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded px-1 py-0.5"
                          placeholder="标题"
                        />
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded px-1 py-0.5"
                        >
                          <option value="scenery">乡村风景</option>
                          <option value="culture">风土人文</option>
                          <option value="portrait">村民风采</option>
                          <option value="activity">工作活动</option>
                        </select>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveEdit(img.id)}
                            className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-gray-700 truncate">{img.title || "无标题"}</p>
                        <span className={"inline-block px-1 py-0.5 rounded text-[10px] mt-0.5 " + catColor}>
                          {catLabel}
                        </span>
                        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingId(img.id); setEditTitle(img.title || ""); setEditCategory(img.category); }}
                            className="text-[10px] text-gray-400 hover:text-primary-600"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteImage(img.id)}
                            className="text-[10px] text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
