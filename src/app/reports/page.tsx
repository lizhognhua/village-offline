"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Home, Footprints, Heart, BookOpen,
  Wheat, Building2, Users, Calendar, Clock, ArrowUpRight
} from "lucide-react";

type ReportData = {
  totalFamilies: number; totalVisits: number; totalCondolences: number;
  totalDiaries: number; totalProjects: number; totalIndustries: number;
  totalMembers: number; totalGroups: number;
  familyAttrStats: { familyAttr: string | null; _count: number }[];
  monthlyVisits: { month: string; count: number }[];
  projectStats: { status: string; _count: number }[];
  recentVisits: { id: string; familyName?: string; visitorName?: string; visitDate: string; content?: string }[];
  recentDiaries: { id: string; title: string; authorName?: string; createdAt: string }[];
};

const ATTR_LABELS: Record<string, string> = {
  "脱贫户": "脱贫户", "监测户": "监测户", "低保户": "低保户",
  "五保户": "五保户", "一般农户": "一般农户"
};
const ATTR_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#f43f5e"];
const STATUS_LABELS: Record<string, string> = {
  "pending": "待启动", "active": "进行中", "completed": "已完成", "paused": "已暂停"
};
const STATUS_COLORS: Record<string, string> = {
  "pending": "#94a3b8", "active": "#3b82f6", "completed": "#22c55e", "paused": "#f59e0b"
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    fetch("/api/reports").then(function(r) { return r.json(); })
      .then(setData).catch(console.error).finally(function() { setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" />
    </div>
  );

  const statCards = [
    { label: "总户数", value: data?.totalFamilies || 0, icon: Home, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "走访记录", value: data?.totalVisits || 0, icon: Footprints, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "慰问记录", value: data?.totalCondolences || 0, icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "工作日记", value: data?.totalDiaries || 0, icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "项目数", value: data?.totalProjects || 0, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "产业数", value: data?.totalIndustries || 0, icon: Wheat, color: "text-green-600", bg: "bg-green-50" },
    { label: "工作队员", value: data?.totalMembers || 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "村民小组", value: data?.totalGroups || 0, icon: Building2, color: "text-cyan-600", bg: "bg-cyan-50" },
  ];

  const attrStats = data?.familyAttrStats || [];
  const totalAttr = attrStats.reduce(function(s, a) { return s + a._count; }, 0) || 1;
  const maxMonthlyVisit = Math.max.apply(null, (data?.monthlyVisits || []).map(function(v) { return v.count; }).concat([1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> 报表统计
        </h1>
        <p className="mt-1 text-primary-100 text-sm">驻村帮扶工作数据总览</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(function(s) {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                  <p className={"text-2xl font-bold mt-1 " + s.color}>{s.value}</p>
                </div>
                <div className={"p-3 rounded-lg " + s.bg}>
                  <Icon className={"w-5 h-5 " + s.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" /> 月度走访趋势
          </h2>
          <div className="flex items-end gap-2 h-48">
            {(data?.monthlyVisits || []).map(function(v, i) {
              const h = v.count > 0 ? Math.max((v.count / maxMonthlyVisit) * 100, 4) : 0;
              return (
                <div key={v.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-xs font-medium text-gray-700">{v.count}</span>
                  <div
                    className="w-full bg-primary-500 rounded-t-md transition-all hover:bg-primary-600 min-h-[4px]"
                    style={{ height: h + "%" }}
                    title={v.month + ": " + v.count + "次"}
                  />
                  <span className="text-[10px] text-gray-400">{v.month.slice(5)}月</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Home className="w-4 h-4 text-primary-600" /> 农户分类分布
          </h2>
          <div className="space-y-3">
            {attrStats.map(function(a, i) {
              const pct = Math.round((a._count / totalAttr) * 100);
              const label = ATTR_LABELS[a.familyAttr || ""] || a.familyAttr || "未知";
              return (
                <div key={a.familyAttr || "未知"}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{label}</span>
                    <span className="text-gray-500">{a._count}户 ({pct}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: pct + "%", backgroundColor: ATTR_COLORS[i % ATTR_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data?.projectStats && data.projectStats.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600" /> 项目状态
            </h2>
            <div className="flex gap-4 flex-wrap">
              {data.projectStats.map(function(p) {
                return (
                  <div key={p.status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] || "#94a3b8" }} />
                    <span className="text-sm text-gray-700">{STATUS_LABELS[p.status] || p.status}</span>
                    <span className="text-lg font-bold text-gray-900">{p._count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-600" /> 最近走访
          </h2>
          {(data?.recentVisits || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无走访记录</p>
          ) : (
            <div className="space-y-3">
              {(data?.recentVisits || []).map(function(v) {
                return (
                  <Link key={v.id} href={"/visits/" + v.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Footprints className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {v.visitorName || "工作人员"} 走访 {v.familyName || "农户"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(v.visitDate).toLocaleDateString("zh-CN")}
                        {v.content ? " · " + v.content : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary-600" /> 最近工作日记
        </h2>
        {(data?.recentDiaries || []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无日记</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data?.recentDiaries || []).map(function(d) {
              return (
                <Link key={d.id} href={"/diary/" + d.id}
                  className="block p-4 rounded-lg border hover:border-primary-300 hover:shadow-sm transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      {new Date(d.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{d.title}</p>
                  {d.authorName && (
                    <p className="text-xs text-gray-500 mt-1">{d.authorName}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
