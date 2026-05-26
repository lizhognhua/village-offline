import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';
import { SessionProvider } from "next-auth/react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DynamicTitle } from "@/components/DynamicTitle";

export async function generateMetadata(): Promise<Metadata> {
  let title = '驻村工作队管理平台';
  try {
    const { prisma } = await import('@/lib/prisma');
    const config = await prisma.systemConfig.findUnique({ where: { key: 'teamName' } });
    if (config?.value) title = `${config.value}工作管理平台`;
  } catch {}
  return {
    title,
    description: '黑龙江省绥化市绥棱县省派驻村工作队数字化帮扶管理平台',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: '驻村帮扶',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ThemeProvider>
          <SessionProvider>
            <DynamicTitle />
            <SiteHeader />
            {children}
          </SessionProvider>
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{
          __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')});}"
        }} />
      </body>
    </html>
  );
}
