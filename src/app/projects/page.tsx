"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Kanban, List, MoreHorizontal, Calendar, User, GripVertical } from "lucide-react";

type Project = {
  id: string; title: string; description: string | null;
  category: string; status: string; priority: string; progress: number;
  startDate: string | null; endDate: string | null; deadline: string | null;
  responsiblePerson: string | null; budget: number | null;
  _count: { milestones: number; activities: number };
  createdAt: string;
};

const stL: Record<string,string> = { pending:"待启动", active:"进行中", completed:"已完成", paused:"已暂停" };
const stC: Record<string,string> = {
  pending: { bg: "bg-slate-50", badge: "bg-slate-200 text-slate-600", bar: "bg-slate-300" },
  active: { bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", bar: "bg-blue-500" },
  completed: { bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  paused: { bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
};
const cols = ["pending","active","completed","paused"];

const priC: Record<string,string> = { high:"text-red-500", medium:"text-amber-500", low:"text-gray-400" };
const catC: Record<string,string> = { industry:"🏭", infrastructure:"🏗️", assistance:"🤝", other:"📋" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board"|"list">("board");
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ title:"", description:"", category:"industry", responsiblePerson:"", priority:"medium" });
  const [staffOptions, setStaffOptions] = useState<string[]>([]);

  useEffect(() => { fetch("/api/projects").then(r=>r.json()).then(setProjects).catch(console.error).finally(()=>setLoading(false)); }, []);

  useEffect(() => {
    fetch("/api/team-members").then(r => r.json()).then(d => {
      setStaffOptions((d.members || []).map((m: any) => m.name).filter(Boolean));
    }).catch(() => {});
  }, []);

  const create = async () => {
    if (!f.title.trim()) return;
    const r = await fetch("/api/projects", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f) });
    if (r.ok) { const p = await r.json(); setProjects(v => [p,...v]); setShow(false); setF({title:"",description:"",category:"industry",responsiblePerson:"",priority:"medium"}); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>;

  const byStatus = (s: string) => projects.filter(p => p.status === s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">项目任务看板</h1>
          <p className="text-sm text-gray-500 mt-1">共 {projects.length} 个项目</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={()=>setView("board")} className={"p-1.5 rounded transition-colors "+(view==="board"?"bg-white shadow-sm":"hover:bg-white/50")}><Kanban className="w-4 h-4" /></button>
            <button onClick={()=>setView("list")} className={"p-1.5 rounded transition-colors "+(view==="list"?"bg-white shadow-sm":"hover:bg-white/50")}><List className="w-4 h-4" /></button>
          </div>
          <button onClick={()=>setShow(true)} className="flex items-center gap-1.5 bg-primary-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-800 transition-colors">
            <Plus className="w-4 h-4" /> 新建项目
          </button>
        </div>
      </div>

      {show && (
        <div className="bg-white rounded-xl border p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-900">新建项目</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={f.title} onChange={e=>setF(x=>({...x,title:e.target.value}))} placeholder="项目名称" className="border rounded-lg px-3 py-2 text-sm" />
            <select value={f.responsiblePerson} onChange={e=>setF(x=>({...x,responsiblePerson:e.target.value}))} className="border rounded-lg px-3 py-2 text-sm"><option value="">选择负责人</option>{staffOptions.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <select value={f.category} onChange={e=>setF(x=>({...x,category:e.target.value}))} className="border rounded-lg px-3 py-2 text-sm"><option value="industry">产业项目</option><option value="infrastructure">基础设施</option><option value="assistance">帮扶项目</option><option value="other">其他</option></select>
            <select value={f.priority} onChange={e=>setF(x=>({...x,priority:e.target.value}))} className="border rounded-lg px-3 py-2 text-sm"><option value="high">高优先级</option><option value="medium">中优先级</option><option value="low">低优先级</option></select>
          </div>
          <textarea value={f.description} onChange={e=>setF(x=>({...x,description:e.target.value}))} placeholder="项目描述" className="border rounded-lg px-3 py-2 text-sm w-full" rows={2} />
          <div className="flex gap-2 justify-end"><button onClick={()=>setShow(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">取消</button><button onClick={create} className="px-4 py-2 text-sm bg-primary-700 text-white rounded-lg hover:bg-primary-800">创建</button></div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
          <Kanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无项目</p>
          <p className="text-sm mt-1">点击「新建项目」开始创建</p>
        </div>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cols.map(col => {
            const items = byStatus(col);
            const style = stC[col];
            return (
              <div key={col} className={`rounded-xl p-3 min-h-[400px] ${style.bg}`}>
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${style.bar}`} />
                    <span className="text-sm font-semibold text-gray-700">{stL[col]}</span>
                  </div>
                  <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full text-gray-500 font-medium">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.map(p => (
                    <Link key={p.id} href={"/projects/"+p.id}
                      className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{p.title}</h3>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style.badge}`}>{stL[col]}</span>
                      </div>
                      {p.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                        {p.responsiblePerson && <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.responsiblePerson}</span>}
                        {p.priority && <span className={priC[p.priority]}>{"●".repeat(p.priority==="high"?3:p.priority==="medium"?2:1)}</span>}
                        <span className="ml-auto">{catC[p.category]||""}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${p.progress>=80?"bg-emerald-500":p.progress>=40?"bg-amber-500":"bg-red-400"}`} style={{width:p.progress+"%"}} />
                        </div>
                        <span className="text-xs font-medium text-gray-500 w-8 text-right">{p.progress}%</span>
                      </div>
                      {p.deadline && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(p.deadline).toLocaleDateString("zh-CN")}
                        </div>
                      )}
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400">暂无项目</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr><th className="text-left px-4 py-3 font-medium text-gray-600">项目</th><th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">状态</th><th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">进度</th><th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">负责人</th><th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">截止</th></tr>
            </thead>
            <tbody>{projects.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3"><Link href={"/projects/"+p.id} className="font-medium text-primary-700 hover:underline">{p.title}</Link></td>
                <td className="px-4 py-3 hidden md:table-cell"><span className={"text-xs px-2 py-0.5 rounded-full "+stC[p.status].badge}>{stL[p.status]}</span></td>
                <td className="px-4 py-3 hidden md:table-cell"><div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-gray-100 rounded-full"><div className={"h-full rounded-full "+(p.progress>=80?"bg-emerald-500":"bg-amber-500")} style={{width:p.progress+"%"}} /></div><span className="text-xs">{p.progress}%</span></div></td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{p.responsiblePerson||"-"}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">{p.deadline?new Date(p.deadline).toLocaleDateString("zh-CN"):"-"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>🏭 产业项目 {projects.filter(p=>p.category==="industry").length}</span>
        <span>🏗️ 基础设施 {projects.filter(p=>p.category==="infrastructure").length}</span>
        <span>🤝 帮扶项目 {projects.filter(p=>p.category==="assistance").length}</span>
        <span>📋 其他 {projects.filter(p=>p.category==="other").length}</span>
      </div>
    </div>
  );
}

