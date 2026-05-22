"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Pin, Plus, Calendar, User, AlertCircle, Info, ChevronRight, Settings } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  pinned: boolean;
  publisher: { name: string; avatar: string | null };
  publishedAt: string;
  expiresAt: string | null;
};

const PRIORITY_STYLES: Record<string, string> = {
  "紧急": "bg-red-100 text-red-700 border-red-200",
  "重要": "bg-orange-100 text-orange-700 border-orange-200",
  "普通": "bg-gray-100 text-gray-600 border-gray-200",
};

const PRIORITY_ICONS: Record<string, any> = {
  "紧急": AlertCircle,
  "重要": Info,
  "普通": ChevronRight,
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("全部");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => {
        setAnnouncements(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "全部"
    ? announcements
    : announcements.filter((a) => a.priority === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-7 h-7 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">公告</h1>
        </div>
        <div className="flex items-center gap-2"><Link
          href="/admin/announcements"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          管理
        </Link><Link
          href="/announcements/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          发布公告
        </Link></div>
      </div>

      {/* 优先级筛选 */}
      <div className="flex gap-2">
        {["全部", "紧急", "重要", "普通"].map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === p
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 公告列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="mt-3 text-gray-400">暂无公告</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann) => {
            const PriIcon = PRIORITY_ICONS[ann.priority] || ChevronRight;
            const isExpanded = expandedId === ann.id;
            return (
              <div
                key={ann.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start gap-3">
                    {ann.pinned && (
                      <Pin className="w-4 h-4 text-primary-500 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_STYLES[ann.priority] || "bg-gray-100 text-gray-600"}`}
                        >
                          <PriIcon className="w-3 h-3 inline mr-0.5" />
                          {ann.priority}
                        </span>
                        <h3 className="font-semibold text-gray-900 truncate">{ann.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ann.publisher.name || "未知"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ann.publishedAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-3">
                          <div dangerouslySetInnerHTML={{__html: sanitizeHtml(ann.content)}} />
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 mt-1 transition-transform flex-shrink-0 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
