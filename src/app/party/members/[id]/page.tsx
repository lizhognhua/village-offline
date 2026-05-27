"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Upload } from "lucide-react";
import Link from "next/link";

export default function PartyMemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "", gender: "", idCard: "", ethnicity: "",
    joinDate: "", phone: "", avatar: "", note: "",
  });

  useEffect(() => {
    fetch("/api/party-members/" + id)
      .then(r => r.json())
      .then(d => {
        if (d.error) { alert(d.error); router.push("/party/members"); return; }
        setMember(d);
        setForm({
          name: d.name || "", gender: d.gender || "", idCard: d.idCard || "",
          ethnicity: d.ethnicity || "", joinDate: d.joinDate || "",
          phone: d.phone || "", avatar: d.avatar || "", note: d.note || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg("请输入姓名"); return; }
    setSaving(true); setMsg("");
    try {
      const r = await fetch("/api/party-members/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok) { setMsg("保存成功"); setTimeout(() => setMsg(""), 2000); }
      else { setMsg(d.error || "保存失败"); }
    } catch { setMsg("网络错误"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("确定删除该党员？")) return;
    await fetch("/api/party-members/" + id, { method: "DELETE" });
    router.push("/party/members");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
    const d = await r.json();
    if (d.success || d.url) setForm(f => ({ ...f, avatar: d.url }));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div>;
  if (!member) return <div className="text-center py-20 text-gray-400">党员不存在</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/party/members" className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> 返回党员管理
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">党员详情 · {member.name}</h1>
        </div>
        <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
          <Trash2 size={14} /> 删除
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {form.avatar ? (
              <img src={form.avatar} className="w-20 h-20 rounded-full object-cover border-2 border-red-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl font-bold">
                {(member.name || "?")[0]}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700">
              <Upload size={12} className="text-white" />
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>
          <div>
            <p className="text-sm text-gray-500">党员档案</p>
            {member._virtual && <p className="text-xs text-amber-600 mt-1">来自农户标记，信息需在农户详情页修改</p>}
          </div>
        </div>

        {member._virtual ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
            此党员来自农户属性标记，基本信息请在
            <Link href={"/village/families/" + member.id} className="text-blue-600 underline mx-1">农户详情页</Link>
            中修改。修改农户信息后此处自动同步。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">姓名 *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">性别</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">请选择</option><option>男</option><option>女</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">民族</label>
              <input value={form.ethnicity} onChange={e => setForm({...form, ethnicity: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">入党日期</label>
              <input type="date" value={form.joinDate} onChange={e => setForm({...form, joinDate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">电话（11位手机号）</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="1开头11位数字" maxLength={11}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">身份证号（18位）</label>
              <input value={form.idCard} onChange={e => setForm({...form, idCard: e.target.value})}
                placeholder="18位数字或17位+X" maxLength={18}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {!member._virtual && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">备注</label>
            <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
          </div>
        )}

        {!member._virtual && (
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
            </button>
            {msg && <span className={"text-sm " + (msg.includes("成功") ? "text-green-600" : "text-red-600")}>{msg}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
