"use client";
import { useState } from "react";
import Link from "next/link";
import { Upload, ArrowLeft, FileText, CheckCircle, XCircle } from "lucide-react";

export default function ArchiveUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadOk, setUploadOk] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!form.get("file")) {
      setUploadMsg("请选择文件");
      setUploadOk(false);
      return;
    }
    setUploading(true);
    setUploadMsg("");
    setUploadOk(false);
    try {
      const r = await fetch("/api/files", { method: "POST", body: form });
      const d = await r.json();
      if (d.success) {
        setUploadMsg("上传成功！");
        setUploadOk(true);
        setFiles([]);
        (e.target as HTMLFormElement).reset();
        setTimeout(function() { setUploadMsg(""); }, 5000);
      } else {
        setUploadMsg("失败: " + (d.error || "未知错误"));
        setUploadOk(false);
      }
    } catch (e: any) {
      setUploadMsg("失败: " + e.message);
      setUploadOk(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/archive" className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <Upload className="w-6 h-6 text-primary-600" />
        <h1 className="text-xl font-bold text-gray-900">上传文件</h1>
      </div>

      <form onSubmit={handleUpload} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">文档标题</label>
          <input
            type="text" name="title" placeholder="请输入文档标题"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标签（可选，用逗号分隔）</label>
          <input
            type="text" name="tags" placeholder="如：农户档案,靠山村"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">选择文件</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-2">支持 PDF、Word、Excel、图片等格式</p>
            <label className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg text-sm cursor-pointer hover:bg-primary-700 transition-colors">
              选择文件
              <input
                type="file" name="file"
                onChange={function(e) { if (e.target.files) setFiles(Array.from(e.target.files)); }}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <p className="text-sm text-gray-700 mt-3">
                {files.map(function(f) { return f.name; }).join(", ")}
              </p>
            )}
          </div>
        </div>

        {uploadMsg && (
          <div className={"flex items-center gap-2 px-4 py-3 rounded-lg text-sm " + (uploadOk ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700")}>
            {uploadOk ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {uploadMsg}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/archive" className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            返回
          </Link>
          <button
            type="submit"
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "上传中..." : "开始上传"}
          </button>
        </div>
      </form>
    </div>
  );
}
