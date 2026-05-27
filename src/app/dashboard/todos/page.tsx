"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";

const PLAN_TYPES = ["今日计划", "周计划", "月计划", "季度计划", "年度计划", "一般任务"];
const PRIORITY_COLORS: Record<string, string> = {
  "高": "text-red-600 bg-red-50 border-red-200",
  "中": "text-yellow-600 bg-yellow-50 border-yellow-200",
  "低": "text-green-600 bg-green-50 border-green-200",
};

export default function TodosPage() {
  const { data: session } = useSession();
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState("今日计划");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "中", planType: "今日计划", deadline: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/todos?planType=" + encodeURIComponent(planType) + "&mine=1")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTodos(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [planType]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const r = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, planType }),
      });
      if (r.ok) {
        setForm({ title: "", priority: "中", planType, deadline: "" });
        setShowForm(false);
        load();
      }
    } catch {}
    setSaving(false);
  };

  const toggleStatus = async (todo: any) => {
    const newStatus = todo.status === "completed" ? "pending" : "completed";
    const newProgress = newStatus === "completed" ? 100 : 50;
    await fetch("/api/todos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: todo.id, status: newStatus, progress: newProgress }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此待办？")) return;
    await fetch("/api/todos?id=" + id, { method: "DELETE" });
    load();
  };

  const fmtDate = (d: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate();
  };

  const isOverdue = (deadline: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date(new Date().toDateString());
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">个人待办</h1>
          <p className="text-sm text-gray-500 mt-1">{session?.user?.name || ""} 的任务计划</p>
        </div>
        <button onClick={() => { setForm({ title: "", priority: "中", planType, deadline: "" }); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
          <Plus className="w-4 h-4" /> 新增待办
        </button>
      </div>

      {/* Plan type tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PLAN_TYPES.map(t => (
          <button key={t} onClick={() => setPlanType(t)}
            className={"px-3 py-1.5 text-sm rounded-full border transition-colors " +
              (planType === t ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
            {t}
          </button>
        ))}
      </div>

      {/* New todo form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="待办事项标题..." autoFocus
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }} />
          <div className="flex gap-3 items-center">
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              className="px-2 py-1.5 border rounded-lg text-sm">
              <option>高</option><option>中</option><option>低</option>
            </select>
            <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
              className="px-2 py-1.5 border rounded-lg text-sm" />
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50">
              {saving ? "保存中..." : "添加"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">取消</button>
          </div>
        </div>
      )}

      {/* Todo list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>
      ) : todos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <CheckCircle2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">暂无{planType}待办</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary-600 hover:text-primary-700">+ 添加一个</button>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map(todo => (
            <div key={todo.id}
              className={"flex items-center gap-3 bg-white rounded-lg border p-3 shadow-sm hover:shadow transition-all " +
                (todo.status === "completed" ? "opacity-60" : "")}>
              <button onClick={() => toggleStatus(todo)} className="flex-shrink-0">
                {todo.status === "completed"
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5 text-gray-300 hover:text-green-400" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={"text-sm " + (todo.status === "completed" ? "line-through text-gray-400" : "text-gray-800")}>
                  {todo.title}
                </p>
                <div className="flex gap-2 mt-0.5">
                  {todo.priority && (
                    <span className={"text-[10px] px-1.5 py-0.5 rounded border " + (PRIORITY_COLORS[todo.priority] || "bg-gray-50 text-gray-500")}>
                      {todo.priority}优先级
                    </span>
                  )}
                  {todo.deadline && (
                    <span className={"text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 " +
                      (isOverdue(todo.deadline) && todo.status !== "completed" ? "text-red-600 bg-red-50" : "text-gray-400 bg-gray-50")}>
                      <Clock className="w-3 h-3" />{fmtDate(todo.deadline)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(todo.id)}
                className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
