'use client';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import { WeatherBadge } from './WeatherBadge';

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  member: '',
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || '';
}

export function TopBar() {
  const { data: session } = useSession();
  const userName = session?.user?.name || '';
  const roleLabel = getRoleLabel((session?.user as any)?.role || '');
  const displayName = roleLabel ? `${userName}-${roleLabel}` : userName;

  return (
    <header className="flex h-16 items-center justify-between bg-white border-b border-gray-200 px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-primary-900">驻村帮扶管理系统</h2>
      </div>
      <div className="flex items-center gap-2">
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
