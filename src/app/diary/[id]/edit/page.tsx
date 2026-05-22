"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Globe, Lock } from "lucide-react";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";


function mdToHtml(md: string): string {
  if (!md) return "";
  // If already HTML, return as-is
  if (/<\/(p|h[1-6]|ul|ol|li|blockquote|pre|div)>/.test(md)) return md;
  let html = md;
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Images
  html = html.replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1" />');
  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  // Paragraphs - split by double newlines
  const blocks = html.split(/\n\n+/);
  html = blocks.map(function(b) { 
    const trimmed = b.trim();
    if (!trimmed) return "";
    if (/^<h[1-6]>/.test(trimmed) || /^<(ul|ol|pre|blockquote|img)/.test(trimmed)) return trimmed;
    return "<p>" + trimmed.replace(/\n/g, "<br />") + "</p>";
  }).join("");
  return html;
}

export default function EditDiaryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/diary/${id}`)
      .then(r => { if (!r.ok) throw new Error("无权编辑"); return r.json(); })
      .then(d => { setTitle(d.title); setContent(mdToHtml(d.content)); setIsPublic(d.isPublic); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) { alert("请输入标题"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/diary/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), isPublic }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || "保存失败"); return; }
      router.push(`/diary/${id}`);
    } catch (e) {
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">{error}</p>
        <Link href="/diary" className="inline-block mt-4 text-primary-600 hover:text-primary-800">← 返回</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/diary/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <input
            type="text"
            placeholder="日记标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-2xl font-bold border-none outline-none placeholder-gray-300 focus:ring-0"
            autoFocus
          />

          <div className="flex items-center gap-2">
            <button onClick={() => setIsPublic(!isPublic)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                isPublic ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}>
              {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isPublic ? "公开" : "私密"}
            </button>
            <span className="text-xs text-gray-400">{isPublic ? "所有人可见" : "仅自己可见"}</span>
          </div>

          <div>
            <RichTextEditor
              content={content}
              onChange={(html) => setContent(html)}
              placeholder="编辑你的驻村工作记录..."
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <Link href={`/diary/${id}`} className="text-sm text-gray-500 hover:text-gray-700">取消</Link>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "保存日记"}
          </button>
        </div>
      </div>
    </div>
  );
}
