"use client";

import { useEffect, useState } from "react";
import { Megaphone, Pin, Bell } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: string;
  pinned: boolean;
  publishedAt: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  "紧急": "bg-red-500",
  "重要": "bg-orange-500",
  "普通": "bg-blue-500",
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    var url = "/api/announcements";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setAnnouncements(data.announcements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Megaphone size={22} />
          公告通知
        </h2>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-white/10 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (announcements.length === 0) return null;

  const pinned = announcements.filter((a) => a.pinned);
  const normal = announcements.filter((a) => !a.pinned);

  const display = [...pinned, ...normal];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Megaphone size={22} />
        公告通知
        {announcements.length > 0 && (
          <span className="text-xs font-normal bg-white/20 text-primary-200 px-2 py-0.5 rounded-full">
            {announcements.length}条
          </span>
        )}
      </h2>

      <div className="space-y-2">
        {display.slice(0, 5).map((a) => (
          <div
            key={a.id}
            className="bg-white/5 hover:bg-white/10 rounded-lg transition-colors overflow-hidden"
          >
            <button
              onClick={() =>
                setExpanded(expanded === a.id ? null : a.id)
              }
              className="w-full text-left p-3 flex items-start gap-3"
            >
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  PRIORITY_COLORS[a.priority] || "bg-blue-500"
                }`}
              >
                {a.pinned ? <Pin size={12} /> : <Bell size={12} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {a.pinned && (
                    <span className="text-xs text-yellow-400 font-medium">
                      [置顶]
                    </span>
                  )}
                  <p className="text-white text-sm font-medium truncate">
                    {a.title}
                  </p>
                  <span className="text-xs text-primary-300 shrink-0">
                    {formatDate(a.publishedAt)}
                  </span>
                </div>
                {expanded === a.id && (
                  <p className="text-primary-200 text-sm mt-2 whitespace-pre-wrap">
                    {a.content}
                  </p>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* 更多公告提示 */}
      {display.length > 5 && (
        <p className="text-center text-xs text-primary-300 mt-3">
          还有 {display.length - 5} 条公告
        </p>
      )}

      {display.length === 0 && (
        <p className="text-primary-300 text-sm py-4 text-center">
          暂无公告
        </p>
      )}
    </section>
  );
}
