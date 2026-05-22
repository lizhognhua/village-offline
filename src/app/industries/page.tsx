"use client";
import { useEffect, useState } from "react";
import { Wheat, Plus, Clock, CheckCircle2, Save, X, FileText, Image as ImageIcon, Link, Pencil, Upload } from "lucide-react";

type Industry = {
  id: string; name: string; description: string | null; status: string;
  scale: string | null; startDate: string | null; icon: string | null;
  benefit: string | null; detail: string | null;
  images: string | null; videos: string | null; links: string | null;
};

const emptyForm = {
  name: "", description: "", status: "进行中", scale: "",
  startDate: "", benefit: "", detail: "",
  icon: "🌾", images: "", videos: "", links: ""
};

export default function IndustriesPage() {
  const [data, setData] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Industry | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({...emptyForm});
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/industries").then(r => {
      if (!r.ok) { console.warn("加载产业数据失败:", r.status); return []; }
      return r.json();
    }).then(d => {
      if (!Array.isArray(d)) { console.warn("产业数据格式异常:", d); d = []; }
      setData(d);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openEdit = (ind: Industry) => {
    setEditing(ind);
    setForm({
      name: ind.name, description: ind.description || "", status: ind.status,
      scale: ind.scale || "", startDate: ind.startDate?.split("T")[0] || "",
      benefit: ind.benefit || "", detail: ind.detail || "",
      icon: ind.icon || "🌾", images: ind.images || "", videos: ind.videos || "", links: ind.links || ""
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({...emptyForm});
    setShowForm(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body: any = {
        name: form.name.trim(), status: form.status, icon: form.icon,
        description: form.description, scale: form.scale, startDate: form.startDate || null,
        benefit: form.benefit, detail: form.detail, images: form.images, videos: form.videos, links: form.links
      };
      const url = editing ? `/api/industries/${editing.id}` : "/api/industries";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) {
        setShowForm(false);
        setEditing(null);
        load();
      } else {
        const d = await r.json();
        alert("失败: " + (d.error || ""));
      }
    } catch (e: any) { alert("提交失败: " + e.message); }
    finally { setSaving(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("album_id", "9"); // 驻村-工作活动
      const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.url) {
        const current = form.images ? form.images + "\n" + d.url : d.url;
        setForm(f => ({...f, images: current}));
      } else {
        alert("上传失败: " + (d.error || "未知"));
      }
    } catch (e: any) { alert("上传失败: " + e.message); }
    setUploading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-green-700 rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wheat className="w-6 h-6 text-green-600" /> 产业管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">共 {data.length} 项产业</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
          <Plus className="w-4 h-4" /> 新增产业
        </button>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <Wheat className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-lg">暂无产业数据</p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700">
            <Plus className="w-4 h-4" /> 新增第一个产业
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(ind => {
            const imgs = (() => { try { return JSON.parse(ind.images||"[]"); } catch { return []; } })();
            return (
              <div key={ind.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {imgs[0] && <img src={imgs[0]} className="w-full h-40 object-cover" alt={ind.name} />}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{ind.icon || "🌾"}</span>
                    <h3 className="font-semibold text-gray-900">{ind.name}</h3>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded ${ind.status === "进行中" ? "bg-green-100 text-green-700" : ind.status === "已完成" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {ind.status}
                    </span>
                  </div>
                  {ind.scale && <p className="text-xs text-gray-500 mb-1">规模: {ind.scale}</p>}
                  {ind.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{ind.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-xs text-gray-400">
                      {ind.images && <span><ImageIcon className="w-3 h-3 inline mr-0.5" />图片</span>}
                      {ind.links && <span><Link className="w-3 h-3 inline mr-0.5" />链接</span>}
                    </div>
                    <button onClick={() => openEdit(ind)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Pencil className="w-3 h-3" /> 编辑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editing ? <><Pencil className="w-5 h-5 inline mr-1 text-blue-600" />编辑产业</> : <><Plus className="w-5 h-5 inline mr-1 text-green-600" />新增产业</>}
              </h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产业名称 *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                  <input type="text" value={form.icon} onChange={e => setForm(f => ({...f, icon: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="进行中">进行中</option>
                    <option value="已完成">已完成</option>
                    <option value="规划中">规划中</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规模</label>
                <input type="text" value={form.scale} onChange={e => setForm(f => ({...f, scale: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><FileText className="w-4 h-4 inline mr-1" />简介</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><FileText className="w-4 h-4 inline mr-1" />详情</label>
                <textarea value={form.detail} onChange={e => setForm(f => ({...f, detail: e.target.value}))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产业效益</label>
                <textarea value={form.benefit} onChange={e => setForm(f => ({...f, benefit: e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><Upload className="w-4 h-4 inline mr-1" />上传图片</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading}
                  className="w-full text-sm border rounded-lg px-3 py-2" />
                {uploading && <p className="text-xs text-blue-600 mt-1">上传中...</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><ImageIcon className="w-4 h-4 inline mr-1" />图片URL（每行一个）</label>
                <textarea value={form.images} onChange={e => setForm(f => ({...f, images: e.target.value}))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs" />
                {form.images && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {form.images.split("\n").filter(Boolean).map((url, i) => (
                      <img key={i} src={url} className="w-16 h-16 object-cover rounded border" />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">视频URL（每行一个）</label>
                <textarea value={form.videos} onChange={e => setForm(f => ({...f, videos: e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><Link className="w-4 h-4 inline mr-1" />相关链接（每行一个）</label>
                <textarea value={form.links} onChange={e => setForm(f => ({...f, links: e.target.value}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">取消</button>
                <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? "保存中..." : editing ? "更新" : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
