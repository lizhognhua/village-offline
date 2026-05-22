"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Plus, Check, Circle } from "lucide-react";

type Project = {
  id: string; title: string; description: string | null;
  category: string; status: string; priority: string; progress: number;
  startDate: string | null; endDate: string | null; deadline: string | null;
  responsiblePerson: string | null; budget: number | null;
  milestones: Milestone[]; activities: Activity[];
};
type Milestone = { id: string; title: string; done: boolean; date: string | null };
type Activity = { id: string; content: string; createdAt: string };

const stC: Record<string,string> = { pending:"bg-gray-100 text-gray-600", active:"bg-green-100 text-green-700", completed:"bg-blue-100 text-blue-700", paused:"bg-amber-100 text-amber-700" };
const stL: Record<string,string> = { pending:"待启动", active:"进行中", completed:"已完成", paused:"已暂停" };

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [p, setP] = useState<Project | null>(null);
  const [load, setLoad] = useState(true);
  const [pct, setPct] = useState("");
  const [nm, setNm] = useState("");
  const [na, setNa] = useState("");

  useEffect(() => {
    fetch("/api/projects/"+params.id).then(r=>r.json()).then(d=>{ setP(d); setPct(String(d.progress)); }).catch(console.error).finally(()=>setLoad(false));
  }, [params.id]);

  const upd = async (data: any) => {
    const r = await fetch("/api/projects/"+params.id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    if (r.ok) setP(prev => prev ? { ...prev, ...data } : prev);
  };

  const addM = async () => {
    if (!nm.trim()) return;
    const r = await fetch("/api/projects/"+params.id+"/milestones", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title:nm}) });
    if (r.ok) { const m = await r.json(); setP(x => x ? {...x, milestones:[...x.milestones,m]} : x); setNm(""); }
  };

  const togM = async (m: any) => {
    await fetch("/api/milestones/"+m.id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({done:!m.done}) });
    setP(x => x ? {...x, milestones: x.milestones.map(y => y.id===m.id ? {...y, done:!y.done} : y)} : x);
  };

  const addA = async () => {
    if (!na.trim()) return;
    const r = await fetch("/api/projects/"+params.id+"/activities", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({content:na}) });
    if (r.ok) { const a = await r.json(); setP(x => x ? {...x, activities:[a,...x.activities]} : x); setNa(""); }
  };

  const del = async () => {
    if (!confirm("确定删除此项目？")) return;
    await fetch("/api/projects/"+params.id, { method:"DELETE" });
    router.push("/projects");
  };

  if (load) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>;
  if (!p) return <div className="text-center py-20 text-gray-400">项目不存在</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={()=>router.push("/projects")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> 返回看板</button>
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{p.title}</h1>
              <span className={"text-xs px-2 py-0.5 rounded "+stC[p.status]}>{stL[p.status]}</span>
            </div>
            {p.description && <p className="text-gray-600 mt-2 text-sm">{p.description}</p>}
          </div>
          <button onClick={del} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          {p.responsiblePerson && <div><span className="text-gray-400">负责人</span><p className="font-medium">{p.responsiblePerson}</p></div>}
          {p.budget!=null && <div><span className="text-gray-400">预算</span><p className="font-medium">¥{p.budget.toLocaleString()}</p></div>}
          {p.startDate && <div><span className="text-gray-400">启动</span><p className="font-medium">{new Date(p.startDate).toLocaleDateString("zh-CN")}</p></div>}
          {p.deadline && <div><span className="text-gray-400">截止</span><p className="font-medium">{new Date(p.deadline).toLocaleDateString("zh-CN")}</p></div>}
        </div>
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">进度</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={"h-full rounded-full "+(p.progress>=80?"bg-green-500":p.progress>=40?"bg-amber-500":"bg-red-400")} style={{width:p.progress+"%"}} />
            </div>
            <input value={pct} onChange={e=>setPct(e.target.value)} className="w-16 border rounded px-2 py-1 text-sm text-center" />
            <button onClick={()=>{ const v=Math.min(100,Math.max(0,parseInt(pct)||0)); upd({progress:v}); }} className="text-xs bg-gray-100 px-3 py-1.5 rounded hover:bg-gray-200">更新</button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">{[["pending","待启动"],["active","进行中"],["completed","已完成"],["paused","已暂停"]].map(([k,v]) => (
          <button key={k} onClick={()=>upd({status:k})} className={"text-xs px-3 py-1.5 rounded border "+(p.status===k ? stC[k]+" border-transparent" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>{v}</button>
        ))}</div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">里程碑 ({p.milestones.length})</h2>
        <div className="space-y-2">
          {p.milestones.length===0 && <p className="text-sm text-gray-400">暂无里程碑</p>}
          {p.milestones.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <button onClick={()=>togM(m)} className={"p-1 rounded-full "+(m.done?"text-green-500":"text-gray-300 hover:text-gray-500")}>
                {m.done ? <Check className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <span className={"text-sm flex-1 "+(m.done?"line-through text-gray-400":"text-gray-700")}>{m.title}</span>
              {m.date && <span className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString("zh-CN")}</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={nm} onChange={e=>setNm(e.target.value)} placeholder="添加里程碑..." className="flex-1 border rounded-lg px-3 py-2 text-sm" onKeyDown={e=>e.key==="Enter"&&addM()} />
          <button onClick={addM} className="px-3 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">项目动态</h2>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {p.activities.length===0 && <p className="text-sm text-gray-400">暂无动态</p>}
          {p.activities.map(a => (
            <div key={a.id} className="flex items-start gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
              <span className="text-gray-700 flex-1">{a.content}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString("zh-CN")}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={na} onChange={e=>setNa(e.target.value)} placeholder="添加动态..." className="flex-1 border rounded-lg px-3 py-2 text-sm" onKeyDown={e=>e.key==="Enter"&&addA()} />
          <button onClick={addA} className="px-3 py-2 bg-primary-700 text-white rounded-lg text-sm hover:bg-primary-800">发表</button>
        </div>
      </div>
    </div>
  );
}
