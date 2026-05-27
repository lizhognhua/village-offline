"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Users, Search, ChevronLeft, ChevronRight, Plus,
  MapPin, LandPlot, UserCheck, DollarSign,
  Phone, Home, Footprints, Heart, Wheat
} from "lucide-react";

var CATS = ["全部","一般农户","脱贫户","监测户","低保户","五保户","党员","村委会成员","高龄老人","残疾","重疾重病","赡养儿童","丧失劳动能力"];
var attrColor: Record<string,string> = {
  "脱贫户":"bg-green-100 text-green-700",
  "监测户":"bg-orange-100 text-orange-700",
  "低保户":"bg-blue-100 text-blue-700",
  "五保户":"bg-purple-100 text-purple-700",
  "一般农户":"bg-gray-100 text-gray-600",
  "党员":"bg-red-100 text-red-700",
  "村委会成员":"bg-indigo-100 text-indigo-700",
  "高龄老人":"bg-amber-100 text-amber-700",
  "残疾":"bg-pink-100 text-pink-700",
  "重疾重病":"bg-rose-100 text-rose-700",
  "赡养儿童":"bg-cyan-100 text-cyan-700",
  "丧失劳动能力":"bg-slate-100 text-slate-700"
};

interface VillageGroup {
  id: string; name: string; sortOrder: number;
  _count: { families: number };
}

interface VillageStats {
  households: number; population: number; cultivatedLand: number;
  totalFamilies: number; recentVisits: number;
  poorHouseholds: number; monitoredHouseholds: number;
  dibaoHouseholds: number; wubaoHouseholds: number;
  relocatedHouseholds: number; relocatedPopulation: number;
  villageIncome: number;
  activeProjects: number;
  severeIllness: number; elderlyCount: number;
}

export default function VillagePage() {
  var [groups, setGroups] = useState<VillageGroup[]>([]);
  var [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  var [stats, setStats] = useState<VillageStats | null>(null);
  var [data, setData] = useState<any[]>([]);
  var [loading, setLoading] = useState(true);
  var [page, setPage] = useState(1);
  var [total, setTotal] = useState(0);
  var [totalPages, setTotalPages] = useState(0);
  var [villageName, setVillageName] = useState("");
  var [cat, setCat] = useState("全部");
  var [search, setSearch] = useState("");
  var limit = 25;
  var catRef = useRef<HTMLDivElement>(null);

  var scrollToCat = function(c: string) {
    setCat(c);
    setPage(1);
    setTimeout(function() {
      catRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(function() {
    fetch("/api/village/groups").then(function(r) { return r.json(); }).then(setGroups).catch(console.error);
    fetch("/api/village/stats").then(function(r) { return r.json(); }).then(function(d) { setStats(d.stats); }).catch(console.error);
  }, []);

  var loadFamilies = function() {
    setLoading(true);
    var url = "/api/village/families?limit=" + limit + "&page=" + page;
    if (cat !== "全部") url += "&attr=" + encodeURIComponent(cat);
    if (search) url += "&search=" + encodeURIComponent(search);
    if (selectedGroup) url += "&groupId=" + selectedGroup;
    fetch(url).then(function(r) { return r.json(); })
      .then(function(d) {
        setData(d.families || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(console.error).finally(function() { setLoading(false); });
  };

  useEffect(function() { loadFamilies(); }, [page, cat, selectedGroup]);
  useEffect(function() { fetch("/api/team/profile").then(function(r) { return r.json(); }).then(function(d) { setVillageName(d?.team?.villageName || ""); }).catch(function() {}); }, []);

  var handleSearch = function() { setPage(1); loadFamilies(); };

  return (
    <div className="space-y-5">
      {/* Title — centered */}
      <div className="text-center py-2">
        <h1 className="text-2xl font-bold text-gray-900">{villageName || "村情"}概况</h1>
      </div>

      {/* Stats Cards — 4列×3行 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <StatCard icon={<Home className="w-5 h-5" />} label="户籍户数" value={stats.households} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard icon={<Users className="w-5 h-5" />} label="户籍人口" value={stats.population} color="text-blue-600" bg="bg-blue-50" />
          <StatCard icon={<LandPlot className="w-5 h-5" />} label="耕地(亩)" value={stats.cultivatedLand} color="text-green-600" bg="bg-green-50" />
          <StatCard icon={<DollarSign className="w-5 h-5" />} label="集体收入" value={stats.villageIncome} color="text-rose-600" bg="bg-rose-50" suffix="万" />
          <StatCard icon={<UserCheck className="w-5 h-5" />} label="脱贫户" value={stats.poorHouseholds} color="text-emerald-600" bg="bg-emerald-50" onClick={function() { scrollToCat("脱贫户"); }} clickable />
          <StatCard icon={<UserCheck className="w-5 h-5" />} label="监测户" value={stats.monitoredHouseholds} color="text-orange-600" bg="bg-orange-50" onClick={function() { scrollToCat("监测户"); }} clickable />
          <StatCard icon={<Home className="w-5 h-5" />} label="异地搬迁户" value={stats.relocatedHouseholds} color="text-teal-600" bg="bg-teal-50" suffix={"户/" + (stats.relocatedPopulation || 0) + "人"} />
          <StatCard icon={<Wheat className="w-5 h-5" />} label="产业项目" value={stats.activeProjects} color="text-purple-600" bg="bg-purple-50" />
          <StatCard icon={<Heart className="w-5 h-5" />} label="低保户" value={stats.dibaoHouseholds} color="text-blue-600" bg="bg-blue-50" onClick={function() { scrollToCat("低保户"); }} clickable />
          <StatCard icon={<Heart className="w-5 h-5" />} label="重病人数" value={stats.severeIllness} color="text-red-600" bg="bg-red-50" suffix="人" />
          <StatCard icon={<Users className="w-5 h-5" />} label="高龄老人数" value={stats.elderlyCount} color="text-amber-600" bg="bg-amber-50" suffix="人" />
          <StatCard icon={<Footprints className="w-5 h-5" />} label="本年走访" value={stats.recentVisits} color="text-indigo-600" bg="bg-indigo-50" suffix="次" />
        </div>
      )}

      {/* Search + Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/village/families/new"
          className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 transition-colors flex-shrink-0">
          <Plus className="w-4 h-4" /> 新增农户
        </Link>
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {Array.isArray(groups) && groups.filter(function(g:any) { return g.sortOrder < 10; }).map(function(g:any) {
            return (
              <button key={g.id} onClick={function() { setSelectedGroup(g.id === selectedGroup ? null : g.id); setPage(1); }}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " + (selectedGroup === g.id ? "bg-primary-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100")}>
                {g.name} {g._count?.families || 0}户
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="搜索姓名..." value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter") handleSearch(); }}
            className="pl-9 pr-3 py-2 border-2 border-blue-400 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-40" />
        </div>
      </div>

      {/* Category filter */}
      <div ref={catRef} className="flex gap-1.5 flex-wrap">
        {CATS.map(function(c) {
          return (
            <button key={c} onClick={function() { setCat(c); setPage(1); }}
              className={"px-3 py-1.5 text-xs rounded-full border transition-colors " + (cat === c ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
              {c}
            </button>
          );
        })}
      </div>

      {/* Family Cards — 5 per row, info-rich */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">暂无农户数据</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3">
            {data.map(function(f) {
              return (
                <Link key={f.id} href={"/village/families/" + f.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-primary-200 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    {function() {
                      try {
                        var photos = JSON.parse(f.photos || "[]");
                        var photoUrl = photos.length > 0 ? photos[0] : null;
                        if (photoUrl && photoUrl.startsWith("/uploads/")) { photoUrl = photoUrl.replace("/uploads/", "/api/uploads/"); }
                        if (photoUrl) {
                          return <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 group-hover:border-primary-300 transition-colors"><img src={photoUrl} alt="" className="w-full h-full object-cover" /></div>;
                        }
                      } catch(e) {}
                      return <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0"><span className="text-primary-700 font-bold">{f.headName.charAt(0)}</span></div>;
                    }()}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-primary-700">{f.headName}</p>
                      <p className="text-xs text-gray-400">
                        {[f.headGender, f.population ? f.population + "人" : ""].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    {f.familyAttr && (
                      <div className="flex flex-wrap gap-1">
                        {f.familyAttr.split(",").map(function(tag: string) {
                          var t = tag.trim();
                          return (
                            <span key={t} className={"inline-block px-1.5 py-0.5 rounded text-[10px] " + (attrColor[t] || "bg-gray-100 text-gray-500")}>
                              {t}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {f.headPhone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{f.headPhone}</p>}
                    {f.address && <p className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 flex-shrink-0" />{f.address}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={function() { setPage(function(p: number) { return Math.max(1, p - 1); }); }}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-gray-500">{page} / {totalPages} · 共{total}户</span>
              <button onClick={function() { setPage(function(p: number) { return Math.min(totalPages, p + 1); }); }}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, bg, suffix, onClick, clickable }: {
  icon: React.ReactNode; label: string; value: number; color: string; bg: string; suffix?: string;
  onClick?: () => void; clickable?: boolean;
}) {
  return (
    <div
      className={"bg-white rounded-lg border shadow-sm p-3 hover:shadow-md transition-all text-center" + (clickable ? " cursor-pointer hover:border-primary-300" : "")}
      onClick={onClick}
    >
      <div className={"p-1.5 rounded-lg inline-block " + bg}>
        <span className={color}>{icon}</span>
      </div>
      <p className="mt-1.5 text-base font-bold text-gray-900">{value != null ? value.toLocaleString() : "--"}{suffix || ""}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}