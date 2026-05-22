"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, ArrowLeft, Send } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("普通");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("标题和内容不能为空");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          priority,
          pinned,
          expiresAt: expiresAt || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发布失败");
      }

      router.push("/announcements");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <Megaphone className="w-6 h-6 text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900">发布公告</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公告标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入公告标题"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        {/* 优先级 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <div className="flex gap-2">
            {["普通", "重要", "紧急"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  priority === p
                    ? p === "紧急" ? "bg-red-600 text-white border-red-600"
                    : p === "重要" ? "bg-amber-500 text-white border-amber-500"
                    : "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 置顶 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pinned"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="pinned" className="text-sm text-gray-700">置顶公告</label>
        </div>

        {/* 过期时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">过期时间（可选）</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        {/* 内容 — Tiptap 富文本编辑器 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公告内容</label>
          <RichTextEditor
            content={content}
            onChange={(html) => setContent(html)}
            placeholder="请输入公告内容..."
          />
        </div>

        {/* 提交 */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitting ? "发布中..." : "发布公告"}
          </button>
        </div>
      </form>
    </div>
  );
}
