"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Globe, Lock, ImageIcon, X, Upload, Tag } from "lucide-react";
import Link from "next/link";
import RichTextEditor from "@/components/RichTextEditor";
import { RECORD_TYPES } from "@/lib/accountability";

export default function NewDiaryPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recordType, setRecordType] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", files[0]);
    try {
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        const imgHtml = `<img src="${data.url}" alt="${data.name || '图片'}" />`;
        setContent(prev => prev + (prev ? "<p></p>" : "") + imgHtml);
        setImages(prev => [...prev, data.url]);
      } else {
        alert(data.error || "上传失败");
      }
    } catch {
      alert("上传失败，请重试");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { alert("请输入标题"); return; }
    if (!content.trim()) { alert("请输入内容"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          isPublic,
          images: JSON.stringify(images),
          recordType,
        }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || "保存失败"); return; }
      const diary = await res.json();
      router.push(`/diary/${diary.id}`);
    } catch {
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/diary" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          <input type="text" placeholder="日记标题" value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-2xl font-bold border-none outline-none placeholder-gray-300 focus:ring-0" autoFocus />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <select value={recordType} onChange={e => setRecordType(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none">
                {RECORD_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
              </select>
            </div>
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
              placeholder="写下你的驻村工作记录..."
            />
          </div>

          {/* Upload toolbar */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors">
              {uploading ? (
                <><div className="animate-spin h-4 w-4 border-b-2 border-primary-600 rounded-full" /> 上传中...</>
              ) : (
                <><Upload className="w-4 h-4" /> 上传图片</>
              )}
            </button>
            <span className="text-xs text-gray-400">图片自动上传并压缩，插入到编辑器中</span>
          </div>

          {images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <Link href="/diary" className="text-sm text-gray-500 hover:text-gray-700">取消</Link>
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
