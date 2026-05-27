"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, Save, Users, MapPin, Building, Info, Plus, X, Pencil, Trash2, Check, Key, Navigation, RefreshCw, Database, Upload, Bot, FileSpreadsheet, Lock, User } from "lucide-react";
import { ImportSettings } from "@/components/ImportSettings";

const TABS = [
  { key: "basic", label: "基本信息", icon: Info },
  { key: "password", label: "修改密码", icon: Lock },
  { key: "village", label: "村情概况", icon: Building },
  { key: "groups", label: "屯组管理", icon: MapPin },
  { key: "members", label: "队员管理", icon: Users },
  { key: "apikeys", label: "API 密钥", icon: Key },
  { key: "gps", label: "GPS 定位", icon: Navigation },
  { key: "backup", label: "数据备份", icon: Database },
  { key: "upgrade", label: "系统升级", icon: Upload },
  { key: "ai", label: "AI 设置", icon: Bot },
  { key: "import", label: "数据导入", icon: FileSpreadsheet },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "admin";
  const [tab, setTab] = useState("basic");

  useEffect(() => {
    if (session && !isAdmin) router.replace("/dashboard");
  }, [session, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-600" /> 系统设置
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={"flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors " +
              (tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900")}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "basic" && <BasicSettings />}
      {tab === "password" && <ChangePassword />}
      {tab === "village" && <VillageProfileSettings />}
      {tab === "groups" && <GroupSettings />}
      {tab === "members" && <MemberSettings />}
      {tab === "apikeys" && <ApiKeySettings />}
      {tab === "gps" && <GpsSettings />}
      {tab === "backup" && <BackupSettings />}
      {tab === "upgrade" && <UpgradeSettings />}
      {tab === "ai" && <AiSettings />}
      {tab === "import" && <ImportSettings />}
    </div>
  );
}

// ========== 基本信息 ==========

function BasicSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [workStartDate, setWorkStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setSettings(d);
      if (d.workStartDate) setWorkStartDate(d.workStartDate);
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg("");
    const fd = new FormData(e.target as HTMLFormElement);
    const data: Record<string, string> = {};
    for (const [k, v] of fd.entries()) data[k] = (v as string).trim();

    // 条件校验：填了就须符合格式
    if (data.secretaryPhone && !/^1[3-9]\d{9}$/.test(data.secretaryPhone)) {
      setMsg("村书记电话应为11位手机号"); setSaving(false); return;
    }
    if (data.contactPhone && !/^1[3-9]\d{9}$/.test(data.contactPhone)) {
      setMsg("联系电话应为11位手机号"); setSaving(false); return;
    }
    // 清理姓名
    if (data.villageSecretary) data.villageSecretary = data.villageSecretary.replace(/[，,]+/g, "");
    if (data.teamName) data.teamName = data.teamName.replace(/[，,]+/g, "");

    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) { setMsg("保存成功"); setTimeout(() => setMsg(""), 3000); }
    else setMsg("保存失败");
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">基本信息</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">工作队名称</label>
          <input name="teamName" defaultValue={settings.teamName || ""} placeholder="如：省机关事务管理局驻村工作队"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">帮扶村名</label>
          <input name="villageName" defaultValue={settings.villageName || ""} placeholder="如：靠山村"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
          <input name="contactPhone" defaultValue={settings.contactPhone || ""} placeholder="11位手机号" type="tel" maxLength={11}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">所属乡镇</label>
          <input name="township" defaultValue={settings.township || ""} placeholder="如：靠山乡"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">村书记姓名</label>
          <input name="villageSecretary" defaultValue={settings.villageSecretary || ""} placeholder="村书记"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">村书记电话</label>
          <input name="secretaryPhone" defaultValue={settings.secretaryPhone || ""} placeholder="11位手机号" type="tel" maxLength={11}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">驻村开始日期</label>
            <input type="date" name="workStartDate" defaultValue={workStartDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </form>
  );
}

// ========== 修改密码 ==========

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    if (newPassword.length < 6) { setMsg("新密码至少6位"); return; }
    if (newPassword !== confirmPassword) { setMsg("两次输入的新密码不一致"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await r.json();
      if (r.ok) { setMsg("密码修改成功"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
      else setMsg(d.error || "修改失败");
    } catch { setMsg("网络错误"); }
    setSaving(false);
  };

  return (
    <form onSubmit={handleChange} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">修改密码</h2>
      <div className="max-w-sm space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "修改中..." : "修改密码"}
        </button>
        {msg && <span className={"text-sm " + (msg.includes("成功") ? "text-green-600" : "text-red-500")}>{msg}</span>}
      </div>
    </form>
  );
}

// ========== 村情概况 ==========

function VillageProfileSettings() {
  const [profile, setProfile] = useState<any>({});
  const [stats, setStats] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // 可编辑字段：从 VillageProfile 读取
    fetch("/api/village/profile").then(r => r.json()).then(d => {
      if (d?.profile) setProfile(d.profile);
    }).catch(() => {});
    // 自动统计字段：从 Family 表实时计算
    fetch("/api/village/stats").then(r => r.json()).then(d => setStats(d.stats || {})).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg("");
    const fd = new FormData(e.target as HTMLFormElement);
    const data: any = {};
    // 校验整数字段
    const intFields = editFields.filter(f => f.step === "1");
    for (const f of intFields) {
      const v = fd.get(f.key) as string;
      if (v && v.includes(".")) {
        setMsg("「" + f.label + "」请录入整数"); setSaving(false); return;
      }
    }
    for (const [k, v] of fd.entries()) {
      const num = Number(v);
      data[k] = isNaN(num) || v === "" ? (v || null) : num;
    }
    const r = await fetch("/api/village/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) { setMsg("保存成功"); setTimeout(() => setMsg(""), 3000); }
    else setMsg("保存失败");
    setSaving(false);
  };

  // 仅可手动录入的字段
  const editFields = [
    { key: "administrativeArea", label: "行政面积(公顷)", type: "number", step: "any" },
    { key: "cultivatedLand", label: "耕地面积(亩)", type: "number", step: "any" },
    { key: "laborForce", label: "劳动力人数", type: "number", step: "1" },
    { key: "residentHouseholds", label: "常住户数", type: "number", step: "1" },
    { key: "residentPopulation", label: "常住人口", type: "number", step: "1" },
    { key: "villageIncome", label: "村集体收入(万元)", type: "number", step: "any" },
    { key: "operatingIncome", label: "经营性收入(万元)", type: "number", step: "any" },
    { key: "relocatedHouseholds", label: "异地搬迁户户数", type: "number", step: "1" },
    { key: "relocatedPopulation", label: "异地搬迁户人数", type: "number", step: "1" },
  ];

  // 自动统计字段（来自农户数据，只读）
  const fmtVal = (v: any) => {
    if (v === null || v === undefined || v === "") return "-";
    const n = Number(v);
    if (isNaN(n)) return "-";
    return n < 0 ? "0" : n.toLocaleString();
  };
  const autoFields = [
    { label: "户籍户数", value: fmtVal(stats.households ?? stats.totalFamilies) },
    { label: "户籍人口", value: fmtVal(stats.population) },
    { label: "脱贫户数", value: fmtVal(stats.poorHouseholds), color: "text-emerald-600" },
    { label: "监测户数", value: fmtVal(stats.monitoredHouseholds), color: "text-orange-600" },
    { label: "低保户数", value: fmtVal(stats.dibaoHouseholds), color: "text-blue-600" },
    { label: "五保户数", value: fmtVal(stats.wubaoHouseholds), color: "text-purple-600" },
    { label: "党员人数", value: fmtVal(stats.partyMembers) },
    { label: "重病人数", value: fmtVal(profile.severeIllness) },
    { label: "高龄老人数", value: fmtVal(profile.elderlyCount) },
  ];

  return (
    <div className="space-y-4">
      {/* 自动统计（只读） */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
        <h2 className="text-sm font-semibold text-blue-800 mb-3">自动统计（来自农户数据，无需手动填写）</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {autoFields.map(f => (
            <div key={f.label} className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="text-xs text-gray-500 mb-0.5">{f.label}</div>
              <div className={"text-xl font-bold " + (f.color || "text-gray-800")}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 手动录入 */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">手动录入</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {editFields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input name={f.key}
                type={f.step === "1" ? "text" : "number"}
                inputMode={f.step === "1" ? "numeric" : undefined}
                step={f.step === "1" ? undefined : "any"}
                min="0" defaultValue={profile[f.key] ?? ""}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
          </button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}

// ========== 屯组管理 ==========

function GroupSettings() {
  const [groups, setGroups] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("tun");
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/village/groups?_t=" + Date.now()).then(r => r.json()).then(d => setGroups(d.groups || d || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setName(""); setType("tun"); setSortOrder(0); setEditId(null); setShowForm(false); setError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const body = { name, type, sortOrder };
    const url = "/api/village/groups/manage";
    const method = editId ? "PUT" : "POST";
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...body } : body),
      });
      if (r.ok) { load(); reset(); } else { const d = await r.json().catch(() => ({ error: "保存失败" })); alert(d.error || "保存失败"); }
    } catch { setError("网络错误"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    setError("");
    try {
      const r = await fetch(`/api/village/groups/manage?id=${id}`, { method: "DELETE" });
      if (r.ok) { load(); }
      else { const d = await r.json().catch(() => ({})); setError(d.error || "删除失败"); }
    } catch { setError("网络错误"); }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">屯组管理</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800">
          <Plus className="w-4 h-4" /> 添加
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs text-gray-600 mb-1">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="如：靠山屯" required
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-32 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">类型</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm outline-none">
              <option value="tun">屯</option>
              <option value="zu">组</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">排序</label>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))}
              className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-16 outline-none" />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm">保存</button>
          <button type="button" onClick={reset} className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md text-sm">取消</button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </form>
      )}

      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">暂无屯组数据</p>
      ) : (
        <div className="divide-y">
          {groups.map((g: any) => (
            <div key={g.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{g.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{g.type === "tun" ? "屯" : "组"}</span>
                <span className="text-xs text-gray-400">排序: {g.sortOrder}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setName(g.name); setType(g.type); setSortOrder(g.sortOrder); setEditId(g.id); setShowForm(true); }}
                  className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(g.id)}
                  className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 队员管理 ==========

function MemberSettings() {
  const { data: session, update } = useSession();
  const [members, setMembers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState("");
  // 编辑当前账号
  const [editingSelf, setEditingSelf] = useState(false);
  const [selfName, setSelfName] = useState((session?.user as any)?.name || "");
  const [selfSaving, setSelfSaving] = useState(false);
  const [selfMsg, setSelfMsg] = useState("");
  // 本地缓存的显示名，保存后立即更新
  const [displayedName, setDisplayedName] = useState((session?.user as any)?.name || "");

  const currentUser = session?.user;
  const currentUserId = (currentUser as any)?.id;
  const currentUserName = (currentUser as any)?.name || "";
  const currentUserPhone = (currentUser as any)?.phone || "";

  const saveSelf = async () => {
    if (!selfName.trim()) { setSelfMsg("姓名不能为空"); return; }
    setSelfSaving(true); setSelfMsg("");
    try {
      const r = await fetch("/api/user/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selfName.trim() }),
      });
      if (r.ok) {
        await update(); // 刷新会话
        setDisplayedName(selfName.trim()); // 立即更新本地显示
        setSelfMsg("保存成功"); setEditingSelf(false);
        setTimeout(() => setSelfMsg(""), 3000);
      } else {
        const d = await r.json().catch(() => ({ error: "保存失败" }));
        setSelfMsg(d.error || "保存失败");
      }
    } catch { setSelfMsg("网络错误"); }
    setSelfSaving(false);
  };

  const load = () => {
    fetch("/api/team-members").then(r => r.json()).then(d => setMembers(d.members || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setName(""); setTitle(""); setIntro(""); setSortOrder(0); setAvatar(""); setEditId(null); setShowForm(false); };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
    const d = await r.json();
    if (d.success) setAvatar(d.url);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = { name, title, intro, sortOrder, isActive: true };
    if (avatar) body.avatar = avatar;
    const url = editId ? `/api/team-members/${editId}` : "/api/team-members";
    const r = await fetch(url, {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { load(); reset(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/team-members/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      {/* 当前登录账号 */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
            <User className="w-4 h-4" /> 当前登录账号
          </h3>
          {!editingSelf && (
            <button onClick={() => { setSelfName(displayedName); setEditingSelf(true); }}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Pencil className="w-3 h-3" /> 编辑
            </button>
          )}
        </div>
        {editingSelf ? (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">姓名</label>
              <input value={selfName} onChange={e => setSelfName(e.target.value)}
                className="w-full max-w-xs px-2.5 py-1.5 border border-gray-300 rounded-md text-sm outline-none" />
            </div>
            <div className="text-xs text-gray-500">手机号（不可修改）：{currentUserPhone}</div>
            <div className="flex gap-2">
              <button onClick={saveSelf} disabled={selfSaving}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-xs">{selfSaving ? "保存中..." : "保存"}</button>
              <button onClick={() => setEditingSelf(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md text-xs">取消</button>
              {selfMsg && <span className={"text-xs " + (selfMsg.includes("成功") ? "text-green-600" : "text-red-500")}>{selfMsg}</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{displayedName}</p>
              <p className="text-xs text-gray-500">{currentUserPhone}</p>
            </div>
          </div>
        )}
      </div>

      {/* 队员列表 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">队员管理</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800">
          <Plus className="w-4 h-4" /> 添加队员
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <label className="block w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 overflow-hidden">
                {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <Plus className="w-5 h-5 text-gray-400" />}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
              {uploading && <p className="text-xs text-gray-400 mt-1">上传中...</p>}
            </div>
            <div className="flex-1 space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="姓名 *" required
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm outline-none" />
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="职务（如：队长、队员）"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm outline-none" />
              <input value={intro} onChange={e => setIntro(e.target.value)} placeholder="简介（一句话）"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm outline-none" />
              <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} placeholder="排序"
                className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm w-20 outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm">保存</button>
            <button type="button" onClick={reset} className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md text-sm">取消</button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">暂无队员数据</p>
      ) : (
        <div className="divide-y">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-gray-400 m-2.5" />}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-800">{m.name}</span>
                  {m.title && <span className="text-xs text-gray-500 ml-1.5">{m.title}</span>}
                  {m.intro && <p className="text-xs text-gray-400">{m.intro}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setName(m.name); setTitle(m.title || ""); setIntro(m.intro || ""); setSortOrder(m.sortOrder); setAvatar(m.avatar || ""); setEditId(m.id); setShowForm(true); }}
                  className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(m.id)}
                  className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== API 密钥 ==========

function ApiKeySettings() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showRestart, setShowRestart] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(setKeys).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const data: Record<string, string> = {};
    for (const [k, v] of fd.entries()) data[k] = v as string;
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) { setShowRestart(true); }
    else setMsg("保存失败");
    setSaving(false);
  };

  const doRestart = async () => {
    setShowRestart(false); setMsg("系统正在重启...");
    try { await fetch("/api/system/restart", { method: "POST" }); }
    catch {}
    // Poll for server to come back
    setTimeout(() => { window.location.reload(); }, 3000);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">API 密钥配置</h2>
        <p className="text-xs text-gray-500 mb-0">以下密钥用于地图和天气功能。修改后需重启系统生效。</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">天地图 API Key</label>
            <input name="tiandituKey" defaultValue={keys.tiandituKey || ""}
              placeholder="用于卫星地图（不填则使用 ArcGIS 备用）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">申请: console.tianditu.gov.cn（免费）</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">高德地图 API Key</label>
            <input name="amapKey" defaultValue={keys.amapKey || ""}
              placeholder="用于交互地图（需在 .env 设置 NEXT_PUBLIC_AMAP_KEY）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">申请: console.amap.com（免费）</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">和风天气 API Key</label>
            <input name="qweatherKey" defaultValue={keys.qweatherKey || ""}
              placeholder="用于天气卡片（不填则显示暂无天气）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            <p className="text-xs text-gray-400 mt-1">申请: dev.qweather.com（免费版即可）</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
          </button>
          {msg && <span className={"text-sm " + (msg.includes("重启") ? "text-blue-600" : "text-green-600")}>{msg}</span>}
        </div>
      </form>

      {/* Restart confirmation modal */}
      {showRestart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <RefreshCw className="w-10 h-10 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">重启系统</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              请确认 API 密钥已正确复制。<br />重启期间系统将暂时不可用（约 5-10 秒）。
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowRestart(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                取消，稍后重启
              </button>
              <button onClick={doRestart}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> 确认重启系统
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== AI 设置 ==========

function AiSettings() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(setKeys).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const data: Record<string, string> = {};
    for (const [k, v] of fd.entries()) data[k] = v as string;
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) { setMsg("保存成功"); setTimeout(() => setMsg(""), 5000); }
    else setMsg("保存失败");
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">AI 智能笔杆子 设置</h2>
      <p className="text-xs text-gray-500">配置大模型 API Key，安全存储在本地数据库中。</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型服务商</label>
          <select name="ai_provider" defaultValue={keys.ai_provider || ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">— 请选择 —</option>
            <option value="deepseek">DeepSeek（推荐，便宜好用）</option>
            <option value="qwen">通义千问（阿里云，有免费额度）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input name="ai_api_key" defaultValue={keys.ai_api_key || ""} type="password"
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <p className="text-xs text-gray-400 mt-1">申请: platform.deepseek.com 或 dashscope.aliyun.com</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型名称（可选）</label>
          <input name="ai_model" defaultValue={keys.ai_model || ""}
            placeholder={keys.ai_provider === "qwen" ? "qwen-plus" : "deepseek-chat"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </form>
  );
}

// ========== GPS 定位 ==========

function GpsSettings() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(setKeys).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const data: Record<string, string> = {};
    for (const [k, v] of fd.entries()) data[k] = v as string;
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) { setMsg("保存成功"); setTimeout(() => setMsg(""), 3000); }
    else setMsg("保存失败");
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">GPS 定位设置</h2>
      <p className="text-xs text-gray-500">设置帮扶村和驻村工作队的 GPS 坐标，用于地图自动定位。<span className="text-red-500">两项均为必填。</span></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">🏘 帮扶村坐标</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">纬度 (Latitude) *</label>
              <input name="villageLat" type="number" step="0.000001" required
                defaultValue={keys.villageLat || "47.217881"}
                placeholder="如: 47.217881"
                className="w-full px-2.5 py-1.5 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">经度 (Longitude) *</label>
              <input name="villageLng" type="number" step="0.000001" required
                defaultValue={keys.villageLng || "127.254934"}
                placeholder="如: 127.254934"
                className="w-full px-2.5 py-1.5 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 className="text-sm font-semibold text-red-800 mb-3">🏠 驻村工作队坐标</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-red-700 mb-1">纬度 (Latitude) *</label>
              <input name="workTeamLat" type="number" step="0.000001" required
                defaultValue={keys.workTeamLat || "47.220081"}
                placeholder="如: 47.220081"
                className="w-full px-2.5 py-1.5 border border-red-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-red-700 mb-1">经度 (Longitude) *</label>
              <input name="workTeamLng" type="number" step="0.000001" required
                defaultValue={keys.workTeamLng || "127.261887"}
                placeholder="如: 127.261887"
                className="w-full px-2.5 py-1.5 border border-red-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
        <span className="text-xs text-gray-400">保存后，打开卫星地图将自动定位到此处</span>
      </div>
    </form>
  );
}

// ========== 数据备份 ==========

function BackupSettings() {
  const [info, setInfo] = useState<any>(null);
  const [backupMsg, setBackupMsg] = useState("");
  const [restoreMsg, setRestoreMsg] = useState("");
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/backup/info").then(r => r.json()).then(setInfo).catch(() => {});
  }, []);

  const handleBackup = async () => {
    setBacking(true); setBackupMsg("");
    try {
      const r = await fetch("/api/backup");
      if (!r.ok) { setBackupMsg("备份失败"); setBacking(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url; a.download = `village-backup-${date}.zip`;
      a.click(); URL.revokeObjectURL(url);
      setBackupMsg("备份成功！文件已下载到浏览器默认位置");
      // Refresh info
      fetch("/api/backup/info").then(r => r.json()).then(setInfo).catch(() => {});
    } catch { setBackupMsg("备份失败"); }
    setBacking(false);
  };

  const handleRestoreClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setRestoreFile(f); setShowRestoreConfirm(true); }
    e.target.value = "";
  };

  const doRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true); setShowRestoreConfirm(false);
    const fd = new FormData(); fd.append("file", restoreFile);
    try {
      const r = await fetch("/api/backup/restore", { method: "POST", body: fd });
      const d = await r.json();
      setRestoreMsg(d.success ? "数据已恢复！请关闭窗口后重新启动系统" : (d.error || "恢复失败"));
    } catch { setRestoreMsg("恢复失败"); }
    setRestoring(false); setRestoreFile(null);
  };

  const fmtSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">数据备份</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{fmtSize(info?.dbSize || 0)}</div>
            <div className="text-xs text-blue-600">数据库大小</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{info?.fileCount || 0}</div>
            <div className="text-xs text-green-600">上传文件数</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{fmtSize(info?.totalSize || 0)}</div>
            <div className="text-xs text-purple-600">数据总量</div>
          </div>
        </div>
        {info?.lastBackup && (
          <p className="text-xs text-gray-400 mb-4">上次备份: {info.lastBackup}</p>
        )}

        {/* Backup button */}
        <button onClick={handleBackup} disabled={backing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Database className="w-4 h-4" />
          {backing ? "正在打包..." : "一键备份（下载到浏览器）"}
        </button>
        {backupMsg && <p className="text-xs text-green-600 mt-2 text-center">{backupMsg}</p>}
      </div>

      {/* Restore */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">恢复数据</h2>
        <p className="text-xs text-red-500 mb-4">⚠ 恢复将覆盖现有全部数据，请谨慎操作</p>
        <label className="block w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 text-sm text-gray-500">
          {restoring ? "正在恢复..." : "点击选择备份文件（.zip）"}
          <input type="file" accept=".zip" onChange={handleRestoreClick} className="hidden" disabled={restoring} />
        </label>
        {restoreMsg && <p className={`text-xs mt-2 text-center ${restoreMsg.includes("成功") ? "text-green-600" : "text-red-500"}`}>{restoreMsg}</p>}
      </div>

      {/* Manual backup info */}
      <div className="bg-gray-50 rounded-xl border p-5 text-xs text-gray-500 leading-relaxed">
        <h3 className="font-semibold text-gray-700 mb-2">手动备份方法</h3>
        <p>1. 关闭系统（关闭命令行窗口）</p>
        <p>2. 找到系统文件夹下的 <code className="bg-gray-200 px-1 rounded">data\</code> 目录</p>
        <p>3. 将整个 data 文件夹复制到其他位置（U盘、其他电脑）保存</p>
        <p className="mt-2 text-gray-400">恢复时将备份的 data 文件夹复制回系统目录覆盖即可</p>
      </div>

      {/* Restore confirm modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <Database className="w-10 h-10 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认恢复数据</h3>
            <p className="text-sm text-gray-600 mb-4">
              即将从 <strong>{restoreFile?.name}</strong> 恢复数据。<br />
              <span className="text-red-500">现有数据将被覆盖，此操作不可撤销。</span>
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); }}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                取消
              </button>
              <button onClick={doRestore}
                className="px-6 py-2.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> 确认恢复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 系统升级 ==========

function UpgradeSettings() {
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { checkVersion(); }, []);

  const checkVersion = async () => {
    setChecking(true); setMsg("");
    try {
      const r = await fetch("/api/version/check");
      setInfo(await r.json());
    } catch { setMsg("检测失败"); }
    setChecking(false);
  };

  const doUpgrade = async () => {
    if (!info?.url) return;
    setUpgrading(true); setMsg("正在下载...");
    try {
      const r = await fetch("/api/system/upgrade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: info.url }),
      });
      const d = await r.json();
      setMsg(d.success ? d.message : (d.error || "升级失败"));
      if (d.success) setTimeout(() => window.close(), 3000);
    } catch { setMsg("升级失败"); }
    setUpgrading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">系统升级</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500">当前版本</div>
            <div className="text-xl font-bold text-gray-800">V{info?.current || "—"}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-xs text-blue-500">最新版本</div>
            <div className="text-xl font-bold text-blue-700">{info?.latest ? "V" + info.latest : info?.offline ? "离线" : "—"}</div>
          </div>
        </div>
        {info?.hasUpdate ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-green-800">发现新版本 V{info.latest}</p>
            {info.notes && <p className="text-xs text-green-600 mt-1">{info.notes}</p>}
            <button onClick={() => setShowModal(true)}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              <Upload className="w-4 h-4" /> 在线升级
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500">{info?.offline ? "无法连接到升级服务器" : "已是最新版本"}</p>
          </div>
        )}
        <button onClick={checkVersion} disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={"w-4 h-4" + (checking ? " animate-spin" : "")} />
          {checking ? "检测中..." : "重新检测"}
        </button>
        {msg && <p className={`text-sm mt-3 ${msg.includes("失败") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}
      </div>
      <div className="bg-gray-50 rounded-xl border p-5 text-xs text-gray-500 leading-relaxed">
        <h3 className="font-semibold text-gray-700 mb-2">在线升级说明</h3>
        <p>1. 系统启动时会自动检测新版本（需联网）</p>
        <p>2. 发现新版本后，仪表盘顶部会显示升级提示</p>
        <p>3. 升级前系统会自动备份数据到 data\backups\</p>
        <p>4. 系统自动关闭后，双击文件夹里的「update.bat」</p>
        <p>5. 升级完成，系统自动启动</p>
        <p className="mt-2 text-gray-400">整个过程约1-2分钟，数据不会丢失。如失败可手动下载覆盖安装。</p>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认在线升级</h3>
            <div className="text-sm text-gray-600 mb-4 space-y-1.5">
              <p>✅ 升级前自动备份数据</p>
              <p>📥 自动下载最新版本（约52MB）</p>
              <p>📦 下载完成后系统自动关闭</p>
              <p className="text-blue-600 font-medium">👉 系统关闭后，双击文件夹里的「update.bat」即完成升级</p>
              <p className="text-xs text-gray-400 mt-2">找不到 update.bat？它就是和「启动系统.bat」在同一个文件夹里。</p>
            </div>
            {msg && <p className="text-sm mb-3 text-blue-600">{msg}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} disabled={upgrading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm disabled:opacity-50">取消</button>
              <button onClick={doUpgrade} disabled={upgrading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {upgrading ? "升级中..." : "确认升级"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
