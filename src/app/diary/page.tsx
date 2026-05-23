"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, Lock, Globe, Calendar, User, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useSession } from "next-auth/react";

type DiaryItem = {
  id: string;
  date: string;
  title: string;
  content: string;
  isPublic: boolean;
  source: string;
  photos?: string;
  author: { id: string; name: string; avatar?: string };
  createdAt: string;
};

type DiaryListData = {
  diaries: DiaryItem[];
  total: number;
  totalPublic: number;
  totalPrivate: number;
  page: number;
};

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, "").substring(0, 80);
}

function parsePhotos(s: string) {
  if (!s) return [];
  try {
    var arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr.filter(function(p: any) { return typeof p === "string" && p.length > 0; })
      .map(function(p: string) { return p.startsWith("/uploads/") ? p.replace("/uploads/", "/api/uploads/") : p; });
  } catch(e) {
    // Legacy string format: comma-separated URLs
    if (typeof s === "string" && s.includes("/")) {
      return s.split(",").filter(function(p: string) { return p.trim().length > 0; })
        .map(function(p: string) { return p.trim().startsWith("/uploads/") ? p.trim().replace("/uploads/", "/api/uploads/") : p.trim(); });
    }
    return [];
  }
}

export default function DiaryListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DiaryListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 24;

  const fetchDiaries = async function(p: number) {
    setLoading(true);
    try {
      var res = await fetch("/api/diary?page=" + p + "&limit=" + limit);
      var json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(function() { fetchDiaries(page); }, [page]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作日记</h1>
          <p className="text-sm text-gray-500 mt-1">
            公开 {data?.totalPublic || 0} 篇 · 私密 {data?.totalPrivate || 0} 篇 · 总计 {data?.total || 0} 篇
          </p>
        </div>
        {session?.user?.id && (<>
          <Link href="/diary/new" className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" /> 写日记
          </Link>
        </>)}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>
      ) : data && data.diaries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border shadow-sm">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg text-gray-400">暂无工作日记</p>
          {session?.user?.id && (
            <Link href="/diary/new" className="inline-block mt-4 text-primary-600 hover:text-primary-800">写第一篇日记 →</Link>
          )}
        </div>
      ) : (
        <>
          {/* Card Grid — 6 per row on large screens */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data?.diaries.map(function(diary) {
              var photos = parsePhotos(diary.photos || "");
              return (
                <Link
                  key={diary.id}
                  href={"/diary/" + diary.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-primary-200 transition-all group flex flex-col"
                >
                  {/* Photo thumbnail or placeholder */}
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {photos.length > 0 ? (
                      <img src={photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    {/* Badge overlay */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {diary.isPublic ? (
                        <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded">公开</span>
                      ) : (
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded">私密</span>
                      )}
                    </div>
                    {photos.length > 1 && (
                      <span className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                        +{photos.length - 1}
                      </span>
                    )}
                  </div>
                  {/* Card body */}
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-700 transition-colors leading-snug">
                      {diary.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(diary.date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {diary.author.name}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={function() { setPage(function(p: number) { return Math.max(1, p - 1); }); }}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">上一页</button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button onClick={function() { setPage(function(p: number) { return Math.min(totalPages, p + 1); }); }}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
