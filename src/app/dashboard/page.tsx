"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Home, Users, Footprints, Heart, BookOpen, Wheat,
  Calendar, ArrowRight, CloudSun, Megaphone,
  FolderArchive, Map, MapPin, Flag, Kanban, BarChart3,
  Edit3, PhoneCall, AlertTriangle,
} from "lucide-react";

type StatsData = {
  stats: {
    totalFamilies: number; totalPopulation: number;
    poorHouseholds: number; poorPopulation: number;
    monitoredHouseholds: number; monitoredPopulation: number;
    projectsDone: number; projectsActive: number;
    totalMembers: number; totalActiveIndustries: number; totalAnnouncements: number;
    totalVisits: number; totalVisitsThisMonth: number;
    totalCondolences: number; totalCondolencesThisMonth: number;
    totalDiaries: number; totalDiariesThisYear: number;
    pendingServices: number; workStartDate: string | null;
  };
  recentRecords: { id: string; date: string; type: string; familyName: string; creatorName: string | null; staff: string | null }[];
  recentDiaries: { id: string; date: string; title: string; authorName: string }[];
};

type Announcement = { id: string; title: string; priority: string; pinned: boolean; publisher: { name: string }; publishedAt: string };

function fmtNum(n: number | undefined): string {
  return (n ?? 0).toLocaleString();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<StatsData | null>(null);
  const [weather, setWeather] = useState<{ temp: number; condition: string; icon: string } | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"todo" | "activity">("todo");
  const [workDays, setWorkDays] = useState(0);

  const userName = session?.user?.name || "驻村干部";

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then(r => r.json()),
      fetch("/api/weather").then(r => r.json()).catch(() => ({ current: null })),
      fetch("/api/announcements").then(r => r.json()).catch(() => []),
    ]).then(([statsRes, weatherRes, annData]) => {
      setData(statsRes);
      setWeather(weatherRes.current || null);
      setAnnouncements(Array.isArray(annData) ? annData.slice(0, 4) : []);
      // Calculate work days
      const startDate = statsRes?.stats?.workStartDate;
      if (startDate) {
        const start = new Date(startDate);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        setWorkDays(Math.max(0, Math.ceil((today.getTime() - start.getTime()) / 86400000)));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
    </div>
  );

  const s = data?.stats;
  const activities = (data?.recentRecords || []).slice(0, 4);

  const quickActions: { label: string; href: string; icon: any; color: string }[] = [
    { label: "写工作日记", href: "/diary", icon: Edit3, color: "bg-blue-600" },
    { label: "走访慰问", href: "/visits", icon: Footprints, color: "bg-emerald-600" },
    { label: "百姓办事", href: "/public-service", icon: PhoneCall, color: "bg-amber-500" },
    { label: "电子档案", href: "/archive", icon: FolderArchive, color: "bg-red-600" },
    { label: "村情概况", href: "/village", icon: Home, color: "bg-purple-600" },
    { label: "村庄地图", href: "/village/satellite-map", icon: MapPin, color: "bg-cyan-600" },
    { label: "产业管理", href: "/industries", icon: Wheat, color: "bg-teal-600" },
    { label: "履职全景", href: "/accountability", icon: BarChart3, color: "bg-orange-600" },
  ];

  return (
    <div className="space-y-5">
      {/* Announcements marquee */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 overflow-hidden">
          <Megaphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="overflow-hidden flex-1">
            <div className="flex gap-12 animate-marquee whitespace-nowrap">
              {[...announcements, ...announcements].map((a, i) => (
                <Link key={`${a.id}-${i}`} href="/announcements" className="text-sm text-amber-800 hover:text-amber-950">
                  {a.priority === "紧急" ? "🔴 " : a.priority === "重要" ? "🟡 " : ""}{a.title}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/announcements" className="text-xs text-amber-600 hover:text-amber-800 flex-shrink-0">全部</Link>
        </div>
      )}

      {/* Header: Welcome + Stats */}
      <div className="flex gap-5">
        {/* Welcome Card */}
        <div className="flex-[2] bg-gradient-to-br from-blue-900 to-blue-600 rounded-xl p-6 text-white relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-40 h-40 bg-white/5 rounded-full translate-x-10 translate-y-10" />
          <h2 className="text-lg font-semibold mb-1.5 relative z-10 leading-relaxed">
            尊敬的<span className="text-yellow-300">{userName}</span>同志，<br />
            {workDays > 0 ? (
              <>今天是您加入驻村帮扶大家庭的第 <span className="text-yellow-300">{workDays}</span> 天</>
            ) : (
              <>欢迎使用驻村帮扶管理系统</>
            )}
          </h2>
          <p className="text-sm opacity-90 relative z-10">
            {weather ? `${weather.condition} ${weather.temp}℃ ${weather.icon}` : "加载天气中..."}
            {s?.pendingServices ? ` | ${s.pendingServices} 条待处理事务` : ""}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          <Link href="/village" className="bg-white rounded-xl border p-4 hover:border-blue-300 hover:shadow transition-all">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" /> 全村总览
            </div>
            <div className="text-xl font-bold text-gray-900">
              {fmtNum(s?.totalFamilies)}<span className="text-xs font-normal text-gray-400 ml-0.5">户</span>
              <span className="text-gray-300 mx-1 text-sm font-normal">/</span>
              {fmtNum(s?.totalPopulation)}<span className="text-xs font-normal text-gray-400 ml-0.5">人</span>
            </div>
          </Link>
          <Link href="/village" className="bg-white rounded-xl border p-4 hover:border-emerald-300 hover:shadow transition-all">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <Heart className="w-3.5 h-3.5 text-emerald-600" /> 脱贫户
            </div>
            <div className="text-xl font-bold text-gray-900">
              {fmtNum(s?.poorHouseholds)}<span className="text-xs font-normal text-gray-400 ml-0.5">户</span>
              <span className="text-gray-300 mx-1 text-sm font-normal">/</span>
              {fmtNum(s?.poorPopulation)}<span className="text-xs font-normal text-gray-400 ml-0.5">人</span>
            </div>
          </Link>
          <Link href="/village" className="bg-white rounded-xl border p-4 hover:border-amber-300 hover:shadow transition-all">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> 监测户
            </div>
            <div className="text-xl font-bold text-gray-900">
              {fmtNum(s?.monitoredHouseholds)}<span className="text-xs font-normal text-gray-400 ml-0.5">户</span>
              <span className="text-gray-300 mx-1 text-sm font-normal">/</span>
              {fmtNum(s?.monitoredPopulation)}<span className="text-xs font-normal text-gray-400 ml-0.5">人</span>
            </div>
          </Link>
          <Link href="/projects" className="bg-white rounded-xl border p-4 hover:border-red-300 hover:shadow transition-all">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <Kanban className="w-3.5 h-3.5 text-red-600" /> 任务看板
            </div>
            <div className="text-xl font-bold text-gray-900">
              {fmtNum(s?.projectsDone)}<span className="text-xs font-normal text-gray-400 ml-0.5">项已完成</span>
              <span className="text-gray-300 mx-1 text-sm font-normal">/</span>
              {fmtNum(s?.projectsActive)}<span className="text-xs font-normal text-gray-400 ml-0.5">项进行中</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Quick Actions + Todo Panel */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Quick Actions Grid */}
        <div className="flex-[1.2] bg-white rounded-xl border p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-blue-600 text-lg">⊞</span> 快捷工作台
          </h3>
          <div className="grid grid-cols-4 grid-rows-2 gap-3">
            {quickActions.map(a => (
              <Link key={a.label} href={a.href}
                className="flex flex-col items-center justify-center gap-2 p-3 bg-gray-50 border-2 border-transparent rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:-translate-y-0.5 transition-all">
                <div className={`${a.color} w-10 h-10 rounded-xl flex items-center justify-center text-white`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Todo / Activity Panel */}
        <div className="flex-[0.8] min-w-[300px] bg-white rounded-xl border p-5 flex flex-col">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-blue-600 text-lg">☰</span> 待办与动态
          </h3>
          <div className="flex gap-2 mb-4 border-b pb-3">
            <button onClick={() => setTab("todo")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === "todo" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              待处理事务 ({s?.pendingServices ?? 0})
            </button>
            <button onClick={() => setTab("activity")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === "activity" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              最近活动 ({activities.length})
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {tab === "todo" ? (
              s?.pendingServices ? (
                <Link href="/public-service" className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border-l-4 border-red-500 hover:bg-amber-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">!</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{s.pendingServices} 条待处理事务</p>
                    <p className="text-xs text-gray-400 mt-0.5">点击进入百姓办事查看详情</p>
                  </div>
                </Link>
              ) : (
                <p className="text-center text-gray-400 text-sm py-8">暂无待处理事务</p>
              )
            ) : (
              activities.length > 0 ? activities.map((item, i) => (
                <Link key={item.id + item.type} href={`/visits/${item.id}`}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500 hover:bg-gray-100 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === "visit" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                    {item.type === "visit" ? <Footprints className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {item.type === "visit" ? "走访" : "慰问"} — {item.familyName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.creatorName || item.staff || "驻村工作队"} · {new Date(item.date).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </Link>
              )) : (
                <p className="text-center text-gray-400 text-sm py-8">暂无最近活动</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
