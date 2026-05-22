import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryGrid from "@/components/CategoryGrid";
import TeamMembers from "@/components/TeamMembers";
import HelpProjects from "@/components/HelpProjects";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* 导航栏 */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            驻
          </div>
          <span className="text-white font-semibold text-lg">
            驻村帮扶管理系统
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 text-sm text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 text-sm text-primary-900 bg-white hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            注册
          </Link>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-6 pb-16">
        {/* Hero 区域 - 保留所有原文字 */}
        <div className="pt-16 pb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            靠山村驻村帮扶
            <br />
            <span className="text-primary-200">数字化管理平台</span>
          </h1>
          <p className="mt-4 text-lg text-primary-200 max-w-2xl mx-auto">
            黑龙江省机关事务管理局派驻绥化市绥棱县靠山乡靠山村工作队
            <br />
            以数字化手段提升驻村帮扶工作效率，服务乡村振兴
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-primary-900 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              进入系统
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
            >
              注册账号
            </Link>
          </div>
        </div>

        {/* 超大半屏轮播 - 乡村风景 */}
        <div className="mb-10">
          <HeroCarousel />
        </div>

        {/* 分类缩略图网格 */}
        <div className="mb-10">
          <CategoryGrid />
        </div>

        {/* 工作队成员 */}
        <div className="mb-10">
          <TeamMembers />
        </div>

        {/* 帮扶项目 */}
        <div className="mb-10">
          <HelpProjects />
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-white/10 py-6 text-center text-primary-300 text-sm">
        <p>黑龙江省机关事务管理局驻绥棱县靠山乡靠山村工作队</p>
        <p className="mt-1">&copy; 2026 驻村帮扶管理系统</p>
      </footer>
    </div>
  );
}
