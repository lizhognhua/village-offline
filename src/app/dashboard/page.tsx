"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home, Users, Footprints, Heart, BookOpen, Wheat,
  Activity, Calendar, ArrowRight, CloudSun, Megaphone,
  ChevronLeft, ChevronRight, FolderArchive, Map, MapPin,
  AlertTriangle, Flag,
} from "lucide-react";

type StatsData = {
  stats: {
    totalFamilies: number; totalVisits: number; totalVisitsThisMonth: number;
    totalCondolences: number; totalDiaries: number; totalDiariesThisYear: number;
    totalMembers: number; totalActiveIndustries: number; totalAnnouncements: number;
  };
  recentRecords: { id: string; date: string; type: string; familyName: string; creatorName: string | null; staff: string | null; photo: string | null }[];
  recentDiaries: { id: string; date: string; title: string; authorName: string }[];
};

type CurrentWeather = { temp: number; condition: string; icon: string };

type Announcement = {
  id: string; title: string; priority: string; pinned: boolean;
  publisher: { name: string }; publishedAt: string;
};

type QAItem = {
  id: string; category: string; question: string; answer: string;
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月" + dt.getDate() + "日";
}

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [qaPage, setQaPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [villageName, setVillageName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then(r => r.json()),
      fetch("/api/weather").then(r => r.json()).catch(() => ({ current: null })),
      fetch("/api/announcements").then(r => r.json()).catch(() => []),
      fetch("/api/settings").then(r => r.json()).catch(() => ({})),
    ]).then(([statsRes, weatherRes, annData, settings]) => {
      setData(statsRes);
      setWeather(weatherRes.current || null);
      setAnnouncements(Array.isArray(annData) ? annData.slice(0, 3) : []);
      if (settings.teamName) setTeamName(settings.teamName);
      if (settings.villageName) setVillageName(settings.villageName);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Version check
  useEffect(() => {
    fetch("/api/version/check").then(r => r.json()).then(d => {
      if (d.hasUpdate) setUpdateInfo(d);
    }).catch(() => {});
  }, []);

  // Auto-rotate QA every 5 seconds
  useEffect(() => {
    if (qaItems.length === 0) return;
    const timer = setInterval(() => {
      setQaPage(p => (p + 1) % Math.ceil(qaItems.length / 3));
    }, 5000);
    return () => clearInterval(timer);
  }, [qaItems.length]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
    </div>
  );

  const s = data?.stats;

  // Build timeline from recentRecords
  const recentActivities = (data?.recentRecords || []).slice(0, 6).map(function(r) {
    return {
      id: r.id, date: r.date, familyName: r.familyName,
      _type: r.type === "condolence" ? "condolence" : "visit",
      _date: r.date, visitorName: r.creatorName || r.staff || "",
    };
  });

  const quickActions = [
    { label: "电子档案", href: "/archive", icon: FolderArchive, color: "bg-blue-600" },
    { label: "村情概况", href: "/village", icon: Map, color: "bg-emerald-600" },
    { label: "村庄地图", href: "/village/satellite-map", icon: MapPin, color: "bg-teal-600" },
    { label: "天气预警", href: "/weather", icon: AlertTriangle, color: "bg-amber-600" },
    { label: "走访慰问", href: "/visits", icon: Footprints, color: "bg-primary-700" },
    { label: "工作日记", href: "/diary", icon: BookOpen, color: "bg-amber-500" },
    { label: "新增农户", href: "/village/families/new", icon: Home, color: "bg-rose-500" },
    { label: "党建培训", href: "/party", icon: Flag, color: "bg-red-600" },
  ];

  const qaPerPage = 3;
  const qaTotalPages = Math.max(1, Math.ceil(qaItems.length / qaPerPage));
  const currentQas = qaItems.slice(qaPage * qaPerPage, (qaPage + 1) * qaPerPage);

  return (
    <div className="space-y-6">
      {/* Village / Team header */}
      {villageName ? (
        <div className="bg-white rounded-xl border shadow-sm px-5 py-3">
          <h2 className="text-lg font-bold text-gray-800">
            {teamName || "驻村工作队"}<span className="text-gray-400 mx-2">·</span>{villageName}
          </h2>
        </div>
      ) : null}

      {/* Version update banner */}
      {updateInfo && <UpdateBanner info={updateInfo} onDismiss={() => setUpdateInfo(null)} />}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 overflow-hidden">
          <Megaphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="overflow-hidden flex-1">
            <div className="flex gap-8 animate-marquee whitespace-nowrap">
              {announcements.map(function(a) {
                return (
                  <Link key={a.id} href="/announcements" className="text-sm text-amber-800 hover:text-amber-950 transition-colors">
                    {a.priority === "紧急" ? "🔴 " : a.priority === "重要" ? "🟡 " : ""}
                    {a.title}
                  </Link>
                );
              })}
            </div>
          </div>
          <Link href="/announcements" className="text-xs text-amber-600 hover:text-amber-800 flex-shrink-0">查看全部</Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {quickActions.map(function(action) {
          const IconComp = action.icon;
          return (
            <Link key={action.label} href={action.href} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all">
              <div className={action.color + " p-2.5 rounded-lg text-white"}><IconComp className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Stats Cards — all clickable */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link href="/village" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-primary-200 transition-all group">
          <div className="p-2.5 rounded-lg inline-block bg-blue-50"><Home className="w-5 h-5 text-blue-600" /></div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{s?.totalFamilies ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">总户数 <ArrowRight className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" /></p>
        </Link>
        <Link href="/visits" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-emerald-200 transition-all group">
          <div className="p-2.5 rounded-lg inline-block bg-emerald-50"><Footprints className="w-5 h-5 text-emerald-600" /></div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{(s?.totalVisitsThisMonth ?? 0) + (s?.totalCondolencesThisMonth ?? 0)}</p>
          <p className="text-sm text-gray-500 mt-1">本月走访慰问 <ArrowRight className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" /></p>
        </Link>
        <Link href="/diary" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-amber-200 transition-all group">
          <div className="p-2.5 rounded-lg inline-block bg-amber-50"><BookOpen className="w-5 h-5 text-amber-600" /></div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{s?.totalDiaries ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">工作日记 <ArrowRight className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" /></p>
        </Link>
        <Link href="/industries" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition-all group">
          <div className="p-2.5 rounded-lg inline-block bg-green-50"><Wheat className="w-5 h-5 text-green-600" /></div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{s?.totalActiveIndustries ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">产业项目 <ArrowRight className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" /></p>
        </Link>
        <Link href="/weather" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all">
          {weather ? (
            <>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-blue-50"><CloudSun className="w-5 h-5 text-blue-600" /></div>
                <span className="text-3xl">{weather.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{weather.temp}°</p>
              <p className="text-sm text-gray-500 mt-1">{weather.condition}</p>
            </>
          ) : (
            <>
              <div className="p-2.5 rounded-lg inline-block bg-blue-50"><CloudSun className="w-5 h-5 text-blue-600" /></div>
              <p className="mt-3 text-sm text-gray-400">暂无天气</p>
            </>
          )}
        </Link>
      </div>

      {/* Recent Visits + Condolences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900">最近走访慰问</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/visits" className="text-xs text-emerald-600 hover:text-emerald-800">走访</Link>
              <Link href="/visits" className="text-xs text-rose-600 hover:text-rose-800">慰问</Link>
            </div>
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无记录</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map(function(item: any) {
                  const href = item._type === "visit"
                    ? "/visits/" + item.id
                    : "/visits/" + item.id;
                  return (
                    <Link key={item.id + item._type} href={href} className="flex items-center gap-3 text-sm hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                      {item._type === "visit" ? (
                        <Footprints className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Heart className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      )}
                      <span className="text-gray-800 flex-1 truncate">
                        {item._type === "visit"
                          ? item.visitorName + " 走访 " + item.familyName
                          : "慰问 " + item.familyName}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(item._date)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Diaries */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-600" /><h2 className="font-semibold text-gray-900">最近工作日记</h2></div>
            <Link href="/diary" className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">查看全部 <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="p-6">
            {(!data?.recentDiaries || data.recentDiaries.length === 0) ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无工作日记</p>
            ) : (
              <div className="space-y-3">
                {data.recentDiaries.map(function(d: any) {
                  return (
                    <Link key={d.id} href={"/diary/" + d.id} className="flex items-start gap-3 text-sm hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-medium truncate">{d.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{d.authorName} · {fmtDate(d.date)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 应知应会知识问答 — carousel + click to knowledge */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">应知应会知识问答</h2>
          </div>
          <div className="flex items-center gap-2">
            {qaItems.length > qaPerPage && (
              <div className="flex items-center gap-1 mr-2">
                <button onClick={() => setQaPage(p => (p - 1 + qaTotalPages) % qaTotalPages)}
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400">{qaPage + 1}/{qaTotalPages}</span>
                <button onClick={() => setQaPage(p => (p + 1) % qaTotalPages)}
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <Link href="/knowledge" className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
              查看全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
        <div className="p-4">
          {qaItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentQas.map(function(qa: QAItem) {
                return (
                  <Link key={qa.id} href={"/knowledge?q=" + encodeURIComponent(qa.question)}
                    className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors group">
                    <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{qa.category}</span>
                    <p className="text-xs font-medium text-gray-800 mt-1.5 group-hover:text-primary-700">{qa.question}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{qa.answer}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <StaticQA title="防返贫监测" q="监测对象包括几类？" a="三类：脱贫不稳定户、边缘易致贫户、突发严重困难户。监测范围：人均纯收入8400元。" />
              <StaticQA title="驻村帮扶" q="每年驻村不少于多少天？" a="不少于240天。每季度一般户全覆盖走访1遍，每月重点户走访1遍。" />
              <StaticQA title="教育帮扶" q="雨露计划补助多少？" a="每生每年3000元，分春秋两季补助。寄宿生生活费：小学1250元/年，初中1500元/年。" />
              <StaticQA title="健康帮扶" q="大病救治多少种？" a="30种。脱贫人口享受先诊疗后付费，县域内住院免押金。" />
              <StaticQA title="住房保障" q="危房改造补贴多少？" a="C级和无房户14000元，D级28000元，公租房再加9000元。" />
              <StaticQA title="金融帮扶" q="小额信贷政策要点？" a="5万元以下、3年期以内、免抵押免担保。面向脱贫户和监测户。" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaticQA({ title, q, a }: { title: string; q: string; a: string }) {
  return (
    <Link href={"/knowledge?q=" + encodeURIComponent(q)}
      className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer group">
      <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{title}</span>
      <p className="text-xs font-medium text-gray-800 mt-1.5 group-hover:text-primary-700">{q}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{a}</p>
    </Link>
  );
}

// ========== 版本升级横幅 ==========

function UpdateBanner({ info, onDismiss }: { info: any; onDismiss: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [msg, setMsg] = useState("");

  const doUpgrade = async () => {
    setUpgrading(true); setMsg("正在下载更新包...");
    try {
      const r = await fetch("/api/system/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: info.url }),
      });
      const d = await r.json();
      if (d.success) {
        setMsg(d.message);
        setTimeout(() => { window.close(); }, 2000);
      } else {
        setMsg(d.error || "升级失败");
        setUpgrading(false);
      }
    } catch {
      setMsg("网络错误，升级失败");
      setUpgrading(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🆕</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">发现新版本 V{info.latest}</p>
            {info.notes && <p className="text-xs text-blue-600">{info.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            在线升级
          </button>
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">在线升级到 V{info.latest}</h3>
            <div className="text-sm text-gray-600 mb-4 space-y-2">
              <p>✅ 升级前会自动备份当前数据</p>
              <p>📥 将从服务器下载更新包（约{info.size ? (info.size / 1024 / 1024).toFixed(0) + "MB" : "未知大小"}）</p>
              <p>🔄 升级过程中系统将暂时不可用（约1-2分钟）</p>
              <p>📂 升级后数据完整保留</p>
              <p className="text-amber-600 font-medium">⚠ 升级后需要手动重新双击「启动系统.bat」</p>
            </div>
            {msg && <p className={`text-sm mb-3 ${msg.includes("失败") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} disabled={upgrading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                取消
              </button>
              <button onClick={doUpgrade} disabled={upgrading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {upgrading ? "升级中..." : "确认升级"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
