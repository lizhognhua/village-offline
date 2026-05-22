"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Globe, Calendar, User, Edit3, Trash2, Clock, X } from "lucide-react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DiaryDetail = {
  id: string; date: string; title: string; content: string; images: string;
  isPublic: boolean; source: string;
  author: { id: string; name: string; avatar?: string };
  createdAt: string; updatedAt: string;
};

function fixImageSrc(src: string): string {
  return src;
}

function ImageLightbox({ src, alt }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={fixImageSrc(src)} alt={alt || ""}
        className="w-full md:w-3/4 h-auto object-cover rounded-lg my-4 cursor-zoom-in hover:opacity-90 transition-opacity"
        loading="lazy" onClick={() => setOpen(true)}
      />
      {open && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}>
          <img src={fixImageSrc(src)} alt={alt || ""}
            className="max-w-full max-h-[90vh] object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">
            <X size={28} />
          </button>
        </div>
      )}
    </>
  );
}

function isHtmlContent(content: string): boolean {
  return /<\/(p|h[1-6]|ul|ol|li|blockquote|pre|table|div)>|<(p|h[1-6]|ul|ol|blockquote|pre)\b/i.test(content);
}

function HtmlContentRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const imgs = el.querySelectorAll('img');
    const handlers: Array<{ img: HTMLImageElement; fn: () => void }> = [];
    imgs.forEach(function(img) {
      const fn = function() {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4';
        overlay.onclick = function() { overlay.remove(); };
        const bigImg = document.createElement('img');
        bigImg.src = img.src;
        bigImg.className = 'max-w-full max-h-[90vh] object-contain';
        overlay.appendChild(bigImg);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-4 right-4 text-white text-3xl hover:text-gray-300';
        closeBtn.textContent = '\u2715';
        closeBtn.onclick = function(e) { e.stopPropagation(); overlay.remove(); };
        overlay.appendChild(closeBtn);
        document.body.appendChild(overlay);
      };
      img.addEventListener('click', fn);
      (img as any).style.cursor = 'zoom-in';
      handlers.push({ img, fn });
    });
    return function() {
      handlers.forEach(function(h) { h.img.removeEventListener('click', h.fn); });
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="prose prose-sm max-w-none text-gray-700 leading-relaxed
        [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4
        [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
        [&_p]:my-2 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol]:space-y-1
        [&_blockquote]:border-l-4 [&_blockquote]:border-primary-400 [&_blockquote]:bg-primary-50/50 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:my-4 [&_blockquote]:rounded-r-lg
        [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm
        [&_code]:bg-gray-100 [&_code]:text-rose-600 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
        [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0
        [&_table]:min-w-full [&_table]:border-collapse [&_table]:border [&_table]:border-gray-200 [&_table]:text-sm [&_table]:my-4
        [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
        [&_td]:border [&_td]:border-gray-200 [&_td]:px-4 [&_td]:py-2
        [&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto
        [&_a]:text-primary-600 [&_a]:underline [&_a]:hover:text-primary-800
        [&_hr]:my-6 [&_hr]:border-gray-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function DiaryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [diary, setDiary] = useState<DiaryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/diary/${id}`)
      .then(r => { if (!r.ok) throw new Error("无权查看"); return r.json(); })
      .then(setDiary)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("确定删除这篇日记？")) return;
    const res = await fetch(`/api/diary/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/diary");
  };

  const isAuthor = diary && session?.user?.id === diary.author.id;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" />
    </div>
  );

  if (error || !diary) return (
    <div className="text-center py-20">
      <p className="text-gray-400 text-lg">{error || "日记不存在"}</p>
      <Link href="/diary" className="inline-block mt-4 text-primary-600 hover:text-primary-800">← 返回列表</Link>
    </div>
  );

  const parseImages = () => { try { return JSON.parse(diary.images || "[]"); } catch { return []; } };
  const images = parseImages();
  const isHtml = isHtmlContent(diary.content);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/diary" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回日记列表
        </Link>
      </div>

      <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {diary.isPublic ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <Globe className="w-3 h-3" /> 公开
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> 私密
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{diary.title}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1"><User className="w-4 h-4" /> {diary.author.name}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(diary.date).toLocaleDateString("zh-CN")}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(diary.createdAt).toLocaleString("zh-CN")}</span>
              </div>
            </div>
            {isAuthor && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => router.push(`/diary/${diary.id}/edit`)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {isHtml ? (
            <HtmlContentRenderer html={diary.content} />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ src, alt }) => <ImageLightbox src={src || ""} alt={alt || ""} />,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 underline">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-gray-200 text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-200 px-4 py-2 text-gray-600">
                    {children}
                  </td>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4 text-sm leading-relaxed">
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }: any) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code className="bg-gray-100 text-rose-600 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>;
                  }
                  const lang = className?.replace("language-", "");
                  return (
                    <div>
                      {lang && <div className="text-xs text-gray-400 mb-1 uppercase">{lang}</div>}
                      <code className={className} {...props}>{children}</code>
                    </div>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary-400 bg-primary-50/50 py-2 px-4 my-4 rounded-r-lg text-gray-700">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-6 border-gray-200" />,
                h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mt-5 mb-2">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1 text-gray-700">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1 text-gray-700">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                p: ({ children }) => <p className="my-2 text-gray-700 leading-relaxed">{children}</p>,
              }}
            >
              {diary.content}
            </ReactMarkdown>
          )}
        </div>

        {images.length > 0 && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">附件图片</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((url: string, i: number) => (
                <ImageLightbox key={i} src={url} alt={`附件图片 ${i + 1}`} />
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
