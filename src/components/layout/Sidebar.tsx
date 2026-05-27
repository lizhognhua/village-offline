"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderArchive, Map, Footprints, Heart, BookOpen, Wheat, Kanban, ChevronLeft, ChevronRight, Flag, MapPin, ImageIcon, BarChart3, Settings, PenLine } from "lucide-react";
import { useSession } from "next-auth/react";

const items = [
  { i: LayoutDashboard, l: "首页", h: "/dashboard" },
  { i: Map, l: "村情概况", h: "/village" },
  { i: MapPin, l: "村庄地图", h: "/village/satellite-map" },
  { i: Flag, l: "党建培训", h: "/party" },
  { i: BookOpen, l: "工作日记", h: "/diary" },
  { i: Footprints, l: "走访慰问", h: "/visits" },
  { i: Heart, l: "百姓办事", h: "/public-service" },
  { i: Wheat, l: "产业管理", h: "/industries" },
  { i: Kanban, l: "任务看板", h: "/projects" },
  { i: PenLine, l: "AI 笔杆子", h: "/ai-writer" },
  { i: FolderArchive, l: "文件档案", h: "/archive" },
  { i: ImageIcon, l: "相册管理", h: "/dashboard/albums" },
  { i: BarChart3, l: "履职全景", h: "/accountability" },
];

export function Sidebar() {
  const [col, setCol] = useState(false);
  const p = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "admin";
  const [teamName, setTeamName] = useState("驻村工作队");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.teamName) setTeamName(d.teamName);
    }).catch(() => {});
  }, []);

  const w = col ? "w-16" : "w-64";

  return (
    <aside className={"flex flex-col bg-primary-900 text-white transition-all " + w}>
      <div className="flex h-16 items-center px-4 border-b border-primary-800">
        {!col && <h1 className="text-lg font-bold flex-1 truncate">{teamName}</h1>}
        <button onClick={() => setCol(!col)} className="p-1 hover:bg-primary-800">
          {col ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {items.map(it => {
          const active = p === it.h || p?.startsWith(it.h + "/");
          return (
            <Link key={it.l} href={it.h}
              className={"flex items-center gap-3 px-4 py-3 " + (active ? "bg-primary-700" : "hover:bg-primary-800")}>
              <it.i className="w-5 h-5" />
              {!col && <span className="text-sm">{it.l}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <Link href="/dashboard/settings"
            className={"flex items-center gap-3 px-4 py-3 mt-2 border-t border-primary-800 " + (p === "/dashboard/settings" ? "bg-primary-700" : "hover:bg-primary-800")}>
            <Settings className="w-5 h-5" />
            {!col && <span className="text-sm">系统设置</span>}
          </Link>
        )}
      </nav>
      {!col && (
        <div className="p-4 border-t border-primary-800 text-xs text-primary-300">
          <p>驻村帮扶管理系统</p>
          <p className="mt-1">V2.6</p>
          <p className="mt-0.5 text-primary-400">本系统由省机关局驻村工作队开发@2026</p>
        </div>
      )}
    </aside>
  );
}
