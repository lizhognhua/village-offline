"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Upload, Image } from "lucide-react";
import Link from "next/link";

interface PartyMember {
  id: string; name: string; gender: string; idCard: string;
  ethnicity: string; education: string; joinDate: string;
  phone: string; avatar: string; note: string;
  _virtual?: boolean;
}

export default function PartyMembersPage() {
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PartyMember | null>(null);
  const [form, setForm] = useState({ name: "", gender: "", idCard: "", ethnicity: "", education: "", joinDate: "", phone: "", avatar: "", note: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/party-members").then(r => r.json()).then(d => setMembers(d.members || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `/api/party-members/${editing.id}` : "/api/party-members";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (r.ok) { setShowForm(false); setEditing(null); setForm({ name: "", gender: "", idCard: "", ethnicity: "", education: "", joinDate: "", phone: "", avatar: "", note: "" }); load(); }
      else alert("保存失败");
    } catch { alert("网络错误"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/party-members/${id}`, { method: "DELETE" });
    load();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
    const d = await r.json();
    if (d.success) setForm(f => ({ ...f, avatar: d.url }));
  };

  const openEdit = (m: PartyMember) => {
    setEditing(m);
    setForm({ name: m.name, gender: m.gender || "", idCard: m.idCard || "", ethnicity: m.ethnicity || "", education: m.education || "", joinDate: m.joinDate || "", phone: m.phone || "", avatar: m.avatar || "", note: m.note || "" });
    setShowForm(true);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/party" className="text-sm text-gray-500 hover:text-red-600">← 返回党建</Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">🏛️ 党员管理 · {members.length}人</h1>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: "", gender: "", idCard: "", ethnicity: "", education: "", joinDate: "", phone: "", avatar: "", note: "" }); setShowForm(true); }}
          className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          <Plus size={14} />新增党员
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl space-y-3">
          <h3 className="font-medium text-red-800">{editing ? "编辑党员" : "新增党员"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-600">姓名 *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="text-xs text-gray-600">性别</label><select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm"><option value="">请选择</option><option>男</option><option>女</option></select></div>
            <div><label className="text-xs text-gray-600">民族</label><input value={form.ethnicity} onChange={e => setForm({...form, ethnicity: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="text-xs text-gray-600">学历</label><input value={form.education} onChange={e => setForm({...form, education: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="text-xs text-gray-600">入党日期</label><input type="date" value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="text-xs text-gray-600">电话</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="text-xs text-gray-600">身份证</label><input value={form.idCard} onChange={e => setForm({...form, idCard: e.target.value})} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div>
              <label className="text-xs text-gray-600">照片 {form.avatar && <img src={form.avatar} className="w-8 h-8 rounded-full inline ml-2 object-cover" />}</label>
              <div className="flex gap-2">
                <input value={form.avatar} onChange={e => setForm({...form, avatar: e.target.value})} placeholder="照片URL" className="flex-1 border rounded px-2 py-1.5 text-sm" />
                <label className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded text-xs cursor-pointer hover:bg-blue-700"><Upload size={12} />上传<input type="file" accept="image/*" onChange={handleUpload} className="hidden" /></label>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded text-sm">取消</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm">{saving ? "保存中..." : "保存"}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {members.map(m => (
          <div key={m.id} className={"bg-white rounded-lg border p-4 shadow-sm flex gap-3 items-start " + (m._virtual ? "border-dashed border-amber-300 bg-amber-50" : "")}>
            {m.avatar ? <img src={m.avatar} className="w-12 h-12 rounded-full object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold flex-shrink-0">{m.name[0]}</div>}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{m.name}{m.gender ? " · " + m.gender : ""}</p>
              {m.idCard && <p className="text-xs text-gray-400">身份证 {m.idCard}</p>}
              {m.phone && <p className="text-xs text-gray-400">📞 {m.phone}</p>}
              {m.joinDate && <p className="text-xs text-gray-400">{m.joinDate} 入党</p>}
              {m._virtual && <p className="text-xs text-amber-600 mt-1">⚠️ {m.note}</p>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {!m._virtual && <button onClick={() => openEdit(m)} className="p-1 hover:bg-gray-100 rounded"><Pencil size={13} /></button>}
              {!m._virtual && <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={13} /></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
