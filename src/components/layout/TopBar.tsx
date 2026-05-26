'use client';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { LogOut, User, Sun, Moon } from 'lucide-react';
import { WeatherBadge } from './WeatherBadge';
import { useTheme } from '@/components/ThemeProvider';

const ROLE_LABELS: Record<string, string> = {
  superadmin: '主管理员',
  admin: '子管理员',
  member: '',
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || '';
}

export function TopBar() {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const userName = session?.user?.name || '';
  const roleLabel = getRoleLabel((session?.user as any)?.role || '');
  const displayName = roleLabel ? `${userName}-${roleLabel}` : userName;

  return (
    <header className="flex h-16 items-center justify-between bg-white border-b border-gray-200 px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-primary-900">驻村帮扶管理系统</h2>
      </div>
      <div className="flex items-center gap-2">
        {/* 日/夜切换 */}
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-100 transition-colors"
          title={theme === "dark" ? "切换日间模式" : "切换夜间模式"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-yellow-500" />
          ) : (
            <Moon className="w-4 h-4 text-gray-600" />
          )}
        </button>
        <WeatherBadge />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-4 h-4 text-primary-700" />
          </div>
          <span className="text-sm text-gray-700">{displayName || '用户'}</span>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
          <LogOut className="w-4 h-4" />
          <span>退出</span>
        </button>
      </div>
    </header>
  );
}
