"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChevronLeft } from "lucide-react";
import { useSession } from "next-auth/react";

const HIDE_PATHS = ["/login", "/register"];

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "首页",
  "/weather": "天气预报",
  "/announcements": "公告",
  "/archive": "电子档案",
  "/party": "党建培训",
  "/village": "村情概况",
  "/visits": "走访慰问",
  "/diary": "工作日记",
  "/reports": "统计报表",
  "/industries": "产业管理",
  "/projects": "任务项目看板",
  "/knowledge": "知识库",
  "/admin/home": "系统管理",
  "/gallery": "图库",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  member: "",
};

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (HIDE_PATHS.includes(pathname)) return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/dashboard")) return null;
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const currentPage = PAGE_NAMES["/" + segments[0]] || segments[0] || "";
  const isDetailPage = segments.length > 1;

  const userName = session?.user?.name || "";
  const role = (session?.user as any)?.role || "";
  const roleLabel = ROLE_LABELS[role] || "";
  const displayName = roleLabel ? `${userName}-${roleLabel}` : userName;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isDetailPage ? (
            <button onClick={() => window.history.back()}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span>返回</span>
            </button>
          ) : (
            <>
              {session && (
                <Link href="/dashboard"
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                  <Home className="w-4 h-4" />
                  <span>首页</span>
                </Link>
              )}
              <span className="text-sm font-medium text-gray-800">{currentPage}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <span className="text-sm text-gray-600">{displayName || "用户"}</span>
          ) : (
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">登录</Link>
          )}
        </div>
      </div>
    </header>
  );
}
