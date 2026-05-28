"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User, Users, Calendar, FileText, Image as ImageIcon, X, Footprints, Heart, BookOpen, Search, Plus } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const STATUS_OPTIONS = ["在家", "外出务工", "出门", "健康", "生病", "其他"];
const GENERIC_STAFF = ["局领导", "县领导", "乡领导", "村委会", "屯组长", "医疗行业", "民政"];

export default function NewVisitPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<any[]>([]);
  const [staffOptions, setStaffOptions] = useState<string[]>(GENERIC_STAFF);
  const [saving, setSaving] = useState(false);
  const [recType, setRecType] = useState<"visit" | "condolence" | "reception">("visit");
  const [files, setFiles] = useState<File[]>([]);

  // Fetch team members for dynamic staff list
  useEffect(() => {
    fetch("/api/team-members")
      .then(r => r.json())
      .then(d => {
        const names = (d.members || []).map((m: any) => m.name).filter(Boolean);
        setStaffOptions([...GENERIC_STAFF, ...names]);
      })
      .catch(() => {});
  }, []);
  const [previews, setPreviews] = useState<string[]>([]);
  const [syncSiyuan, setSyncSiyuan] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newFamily, setNewFamily] = useState({ headName: "", phone: "", familyAttr: "一般农户" });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    familyId: "", visitDate: new Date().toISOString().split("T")[0], content: "", statusTags: [] as string[], staff: [] as string[]
  });
  const [customStaffInput, setCustomStaffInput] = useState("");
  const [otherStatusInput, setOtherStatusInput] = useState("");

  useEffect(function() {
    fetch("/api/village/families?limit=2000").then(function(r) { return r.json(); })
      .then(function(d) { setFamilies(d.families || d || []); })
      .catch(console.error);
  }, []);

  useEffect(function() {
    const handleClick = function(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return function() { document.removeEventListener("mousedown", handleClick); };
  }, []);

  const selectedFamily = families.find(function(f) { return f.id === form.familyId; });

  const filtered = families.filter(function(f) {
    const q = searchText.toLowerCase();
    return (f.headName || "").toLowerCase().includes(q) ||
           (f.idNumber || "").includes(q) ||
           (f.phone || "").includes(q) ||
           (f.familyAttr || "").includes(q);
  }).slice(0, 50);

  const toggleTag = function(tag: string) {
    if (tag === "其他") {
      const val = prompt("请输入其他状态:");
      if (val && val.trim() && !form.statusTags.includes(val.trim())) {
        setForm(function(f) { return {...f, statusTags: [...f.statusTags, val.trim()]}; });
      }
      return;
    }
    setForm(function(f) { return {...f, statusTags: f.statusTags.includes(tag) ? f.statusTags.filter(function(t) { return t !== tag; }) : [...f.statusTags, tag]}; });
  };

  const toggleStaff = function(s: string) {
    setForm(function(f) { return {...f, staff: f.staff.includes(s) ? f.staff.filter(function(x) { return x !== s; }) : [...f.staff, s]}; });
  };
  const addCustomStaff = function() {
    const name = customStaffInput.trim();
    if (name && !form.staff.includes(name)) {
      setForm(function(f) { return {...f, staff: [...f.staff, name]}; });
      setCustomStaffInput("");
    }
  };

  const handleFiles = function(e: React.ChangeEvent<HTMLInputElement>) {
    const fl = Array.from(e.target.files || []);
    setFiles(function(prev) { return [...prev, ...fl]; });
    fl.forEach(function(file) {
      const reader = new FileReader();
      reader.onload = function(ev) { setPreviews(function(p) { return [...p, ev.target?.result as string]; }); };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = function(i: number) {
    setFiles(function(f) { return f.filter(function(_, idx) { return idx !== i; }); });
    setPreviews(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
  };

  const createFamily = async function() {
    if (!newFamily.headName.trim()) return;
    try {
      const r = await fetch("/api/village/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headName: newFamily.headName,
          headPhone: newFamily.phone,
          familyAttr: newFamily.familyAttr,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setFamilies(function(prev) { return [d, ...prev]; });
        setForm(function(f) { return {...f, familyId: d.id}; });
        setShowNewFamily(false);
        setNewFamily({ headName: "", phone: "", familyAttr: "一般农户" });
        setSearchText("");
      }
    } catch(e) { console.error(e); }
  };

  const submit = async function() {
    if (!form.familyId || !form.content.trim()) {
      if (!form.familyId) alert("请选择或新增农户");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("familyId", form.familyId);
      fd.append("visitDate", form.visitDate);
      fd.append("content", form.content);
      fd.append("type", recType);
      fd.append("statusTags", JSON.stringify(form.statusTags));
      fd.append("staff", form.staff.join(","));
      fd.append("syncSiyuan", String(syncSiyuan));
      files.forEach(function(f) { fd.append("photos", f); });
      const r = await fetch("/api/records", { method: "POST", body: fd });
      if (r.ok) { router.push("/visits"); }
      else { var d = await r.json(); alert("失败: " + (d.error || "")); }
    } catch(e: any) { alert("提交失败: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={function() { router.back(); }} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          {recType === "visit" ? (
            <><Footprints className="w-6 h-6 text-emerald-600" /> 新建走访记录</>
          ) : (
            <><Heart className="w-6 h-6 text-red-500" /> 新建慰问记录</>
          )}
        </h1>
      </div>

      {/* 类型选择 */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">记录类型</label>
        <div className="flex gap-2">
          <button type="button" onClick={function() { setRecType("visit"); }}
            className={"flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors " + (recType === "visit" ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-medium" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
            <Footprints className="w-4 h-4" /> 走访
          </button>
          <button type="button" onClick={function() { setRecType("condolence"); }}
            className={"flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors " + (recType === "condolence" ? "bg-rose-50 text-rose-700 border-rose-300 font-medium" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
            <Heart className="w-4 h-4" /> 慰问
          </button>
          <button type="button" onClick={function() { setRecType("reception"); }}
            className={"flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors " + (recType === "reception" ? "bg-blue-50 text-blue-700 border-blue-300 font-medium" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
            <Users className="w-4 h-4" /> 来访
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        {/* 选择农户 */}
        <div ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 inline mr-1" />选择农户</label>
          <div className="relative">
            <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
              <Search className="w-4 h-4 text-gray-400 ml-3" />
              <input type="text" value={searchText}
                onChange={function(e) { setSearchText(e.target.value); setDropdownOpen(true); }}
                onFocus={function() { setDropdownOpen(true); }}
                placeholder={selectedFamily ? selectedFamily.headName : "搜索或输入农户姓名..."}
                className="w-full px-3 py-2.5 text-sm outline-none bg-transparent" />
            </div>
            {dropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filtered.slice(0, 30).map(function(f) {
                  return (
                    <button key={f.id} type="button"
                      onClick={function() { setForm(function(prev) { return {...prev, familyId: f.id}; }); setSearchText(f.headName); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <span className="font-medium text-gray-900">{f.headName}</span>
                      {f.familyAttr && <span className="ml-2 text-[10px] text-gray-400">({f.familyAttr})</span>}
                      {f.phone && <span className="ml-2 text-xs text-gray-400">{f.phone}</span>}
                    </button>
                  );
                })}
                <button type="button"
                  onClick={function() { setShowNewFamily(true); setDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-1 border-t border-gray-100 font-medium">
                  <Plus className="w-3.5 h-3.5" /> 新增农户
                </button>
              </div>
            )}
          </div>
          {selectedFamily && (
            <p className="text-xs text-gray-400 mt-1">
              {selectedFamily.familyAttr || "一般户"} · {selectedFamily.phone || "无电话"} · {selectedFamily.address || ""}
            </p>
          )}
        </div>

        {/* 新增农户表单 */}
        {showNewFamily && (
          <div className="border border-primary-200 rounded-lg p-4 bg-primary-50/30 space-y-3">
            <p className="text-sm font-medium text-primary-700">新增农户</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="户主姓名 *" value={newFamily.headName}
                onChange={function(e) { setNewFamily(function(f) { return {...f, headName: e.target.value}; }); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500" />
              <input type="text" placeholder="电话" value={newFamily.phone}
                onChange={function(e) { setNewFamily(function(f) { return {...f, phone: e.target.value}; }); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500" />
              <div className="flex flex-wrap gap-1.5">
                {["一般农户","脱贫户","监测户","低保户","五保户"].map(function(a) {
                  const sel = (newFamily.familyAttr || "").split(",").filter(Boolean);
                  return <label key={a} className="flex items-center gap-0.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={sel.includes(a)} onChange={function() {
                      const u = sel.includes(a) ? sel.filter(function(x){return x!==a;}) : sel.concat([a]);
                      setNewFamily(function(f) { return {...f, familyAttr: u.join(",")}; });
                    }} className="rounded" />{a}
                  </label>;
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={createFamily} disabled={!newFamily.headName.trim()}
                className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">确认新增</button>
              <button type="button" onClick={function() { setShowNewFamily(false); }}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1"><Calendar className="w-4 h-4 inline mr-1" />{recType === "visit" ? "走访" : recType === "condolence" ? "慰问" : "来访"}日期</label>
          <input type="date" value={form.visitDate} onChange={function(e) { setForm(function(f) { return {...f, visitDate: e.target.value}; }); }}
            className="w-full md:w-48 border rounded-lg px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">村民状态（可多选）</label>
          <div className="flex flex-wrap gap-2">{STATUS_OPTIONS.map(function(tag) {
            return (
              <button key={tag} type="button" onClick={function() { toggleTag(tag); }}
                className={"px-3 py-1.5 text-sm rounded-full border transition-colors " + (form.statusTags.includes(tag) ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-600 border-gray-300 hover:border-primary-400")}>{tag}</button>
            );
          })}</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">走访/慰问人员</label>
          <div className="flex flex-wrap gap-2">
            {staffOptions.map(function(s) {
              return (
                <button key={s} type="button" onClick={function() { toggleStaff(s); }}
                  className={"px-3 py-1.5 text-sm rounded-full border transition-colors " + (form.staff.includes(s) ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400")}>
                  {s}
                </button>
              );
            })}
          </div>
          {form.staff.filter(function(s) { return !GENERIC_STAFF.includes(s); }).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {form.staff.filter(function(s) { return !GENERIC_STAFF.includes(s); }).map(function(s) {
                return (
                  <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                    {s} <button onClick={function() { toggleStaff(s); }} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <input type="text" value={customStaffInput} placeholder="其他人员..."
              onChange={function(e) { setCustomStaffInput(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") addCustomStaff(); }}
              className="flex-1 border rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
            <button type="button" onClick={addCustomStaff}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">添加</button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1"><ImageIcon className="w-4 h-4 inline mr-1" />佐证照片/视频</label>
          <input type="file" multiple accept="image/*,video/*" onChange={handleFiles} className="w-full text-sm" />
          {previews.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{previews.map(function(p, i) {
            return (
              <div key={i} className="relative group"><img src={p} className="w-20 h-20 object-cover rounded-lg border" /><button onClick={function() { removeFile(i); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button></div>
            );
          })}</div>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1"><FileText className="w-4 h-4 inline mr-1" />{recType === "visit" ? "走访" : recType === "condolence" ? "慰问" : "来访"}内容</label>
          <RichTextEditor content={form.content}
            onChange={function(html) { setForm(function(f) { return {...f, content: html}; }); }}
            placeholder={recType === "visit" ? "记录走访情况..." : "记录慰问情况..."} />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input type="checkbox" id="syncSiyuan" checked={syncSiyuan} onChange={function(e) { setSyncSiyuan(e.target.checked); }} />
          <label htmlFor="syncSiyuan" className="flex items-center gap-1 text-gray-600 cursor-pointer"><BookOpen className="w-4 h-4" /> 同步到思源笔记</label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={function() { router.back(); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">取消</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}
