import type { Metadata } from 'next';
import '@/app/globals.css';
import { SessionProvider } from "next-auth/react";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: '绥棱县省派驻村工作队管理平台',
  description: '黑龙江省绥化市绥棱县省派驻村工作队数字化帮扶管理平台',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '驻村帮扶',
  },
  themeColor: '#1e3a5f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <SessionProvider>
          <SiteHeader />
          {children}
        </SessionProvider>
        <script dangerouslySetInnerHTML={{
          __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')});}"
        }} />
      </body>
    </html>
  );
}
