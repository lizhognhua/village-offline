import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-green-50/40">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 pb-16 scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
