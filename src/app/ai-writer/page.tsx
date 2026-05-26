"use client";

import { useState, useCallback } from "react";
import { PenLine, Sparkles, FileText, Copy, Download, Loader2, Upload, Table2, ChevronDown } from "lucide-react";
import Link from "next/link";

const TASK_TYPES = [
  { key: "summary", label: "📝 撰写工作总结/汇报材料" },
  { key: "report", label: "📊 生成防返贫监测分析报告" },
  { key: "table", label: "📑 智能填报统计表格" },
  { key: "speech", label: "🎤 起草会议发言/宣讲稿" },
  { key: "village_brief", label: "🏘️ 生成村情简报" },
  { key: "custom", label: "💬 自定义问答（根据数据回答）" },
];

const DATA_SOURCES = [
  { key: "village", label: "村情概况", desc: "全村人口、耕地、收入、各类家庭数量等基础数据" },
  { key: "families", label: "村民户情", desc: "总户数、总人口、脱贫户/监测户/低保户/五保户分类统计" },
  { key: "members", label: "家庭成员", desc: "家庭成员总数、性别比例、年龄分布、文化程度、健康状况" },
  { key: "team", label: "村委/工作队", desc: "村两委成员、驻村工作队队员名单及职务" },
  { key: "industries", label: "产业项目", desc: "产业名称、规模、效益、状态（进行中/已完成）" },
  { key: "projects", label: "项目看板", desc: "帮扶项目列表、进度、预算、优先级、完成情况" },
  { key: "visits", label: "走访记录", desc: "累计走访次数、本月走访次数" },
  { key: "condolences", label: "慰问记录", desc: "慰问总次数、慰问物品统计" },
  { key: "diaries", label: "工作日记", desc: "日记总数、本年新增、发布情况" },
  { key: "alerts", label: "预警信息", desc: "预警总数、各类型预警、待处理数量" },
  { key: "party", label: "党建数据", desc: "党员人数、党建活动次数" },
  { key: "training", label: "培训记录", desc: "培训总次数、参训人员统计" },
  { key: "accountability", label: "履职全景", desc: "四项职责任务完成统计" },
  { key: "mapmarkers", label: "卫星地图标记", desc: "地图点位总数、农户标记数、基础设施标记数、各类别分布" },
  { key: "announcements", label: "公告信息", desc: "公告总数、活跃公告、置顶公告" },
  { key: "paperless", label: "电子档案", desc: "Paperless 文档总数、各类型档案数量统计" },
];

export default function AiWriterPage() {
  const [taskType, setTaskType] = useState("summary");
  const [dataSources, setDataSources] = useState<string[]>(["village", "families"]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const toggleSource = useCallback((key: string) => {
    setDataSources((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleFillTable = async () => {
    if (!templateFile) {
      setError("请先上传表格模板");
      return;
    }
    if (dataSources.length === 0) {
      setError("请至少选择一个数据来源");
      return;
    }
    setError("");
    setResult("");
    setGenerating(true);

    try {
      const fd = new FormData();
      fd.append("file", templateFile);
      fd.append("dataSources", JSON.stringify(dataSources));
      fd.append("prompt", prompt);

      const res = await fetch("/api/ai/fill-table", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "填表失败" }));
        setError(data.error || "填表失败");
        setGenerating(false);
        return;
      }

      // 下载文件
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disp = res.headers.get("Content-Disposition") || "";
      const m = disp.match(/filename="?(.+?)"?$/);
      a.download = m ? m[1] : (templateFile.name.replace(/\.(xlsx|xls)$/, "_已填写.xlsx"));
      a.click();
      URL.revokeObjectURL(url);
      setResult("✅ 表格已填写完成，文件已自动下载。如需调整，修改要求后重新上传。");
    } catch {
      setError("网络请求失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (dataSources.length === 0) {
      setError("请至少选择一个数据来源");
      return;
    }
    setError("");
    setResult("");
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType, dataSources, prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "生成失败");
      } else {
        setResult(data.content || "");
      }
    } catch {
      setError("网络请求失败，请检查网络连接");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      alert("已复制到剪贴板");
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = result;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("已复制到剪贴板");
    });
  };

  const handleExportWord = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:SimSun,serif;line-height:1.8;padding:40px 60px;font-size:15px;}h1{text-align:center;font-size:20px;}p{text-indent:2em;margin:8px 0;}</style></head><body>${result.replace(/\n/g, "<br>")}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "AI笔杆子生成文档.doc"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    // 简单导出为 CSV（Excel 可直接打开）
    const BOM = "﻿";
    const csv = BOM + "生成内容\n" + result.replace(/\n/g, "\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "AI笔杆子生成表格.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-60px)]">
      {/* 左栏 — 桌面侧栏 / 移动端折叠 */}
      <div className="w-full md:w-[400px] flex-shrink-0 bg-white md:border-r border-b md:border-b-0 border-gray-200 flex flex-col overflow-y-auto max-h-[50vh] md:max-h-full">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI 智能笔杆子
          </h2>
          <p className="text-sm text-gray-500 mt-1">自动调用系统数据，生成公文材料</p>
        </div>

        {/* 任务类型 — 下拉选择 */}
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> 选择生成任务
          </h3>
          <div className="relative">
            <select
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 cursor-pointer"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            >
              {TASK_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* 数据引用 */}
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
            <Table2 className="w-4 h-4" /> 引用系统数据
          </h3>
          <div className="flex flex-wrap gap-2">
            {DATA_SOURCES.map((ds) => (
              <button
                key={ds.key}
                onClick={() => toggleSource(ds.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  dataSources.includes(ds.key)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={ds.desc}
              >
                {ds.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            已选 {dataSources.length} 项，系统将自动查询对应数据库表
          </p>
        </div>

        {/* 具体要求 */}
        <div className="p-5 border-b border-gray-100 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">补充具体要求</h3>
          <textarea
            className="flex-1 w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            placeholder={`例如：\n- 重点突出今年大棚蔬菜产业的增收情况\n- 字数控制在1500字左右\n- 语气正式、客观\n- 按季度分段描述\n\n留空则由 AI 根据数据自动生成`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
          />
        </div>

        {/* 上传模板（可选） */}
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> 上传模板（可选）
          </h3>
          <div
            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
              templateFile ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.docx,.doc"
              onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
              className="hidden"
              id="templateUpload"
            />
            <label htmlFor="templateUpload" className="cursor-pointer">
              {templateFile ? (
                <>
                  <p className="text-blue-700 font-semibold text-sm">{templateFile.name}</p>
                  <p className="text-blue-500 text-xs mt-1">{(templateFile.size / 1024).toFixed(0)} KB — 点击更换</p>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                  <p className="text-sm text-gray-500">上传表格或文档模板</p>
                  <p className="text-xs text-gray-400 mt-1">支持 .xlsx 填表 / .docx 报告模板</p>
                </>
              )}
            </label>
          </div>
          {templateFile && (
            <p className="text-xs text-gray-400 mt-2">
              {templateFile.name.endsWith(".xlsx") || templateFile.name.endsWith(".xls")
                ? "将根据模板结构自动填写空单元格，填完后自动下载"
                : "将参照模板格式生成文档内容，自动下载 .docx 文件"}
            </p>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="px-5 py-3">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          </div>
        )}

        {/* 操作区 */}
        <div className="p-5 space-y-2">
          {templateFile ? (
            <button
              onClick={handleFillTable}
              disabled={generating}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-base hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 正在填写模板...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  上传模板并自动填写
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 正在生成...
                </>
              ) : (
                <>
                  <PenLine className="w-5 h-5" />
                  开始智能生成
                </>
              )}
            </button>
          )}
          <Link
            href="/ai-writer/import"
            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            批量导入村民数据
          </Link>
        </div>
      </div>

      {/* 右栏：预览 */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0 min-h-[40vh] md:min-h-0">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-gray-800">生成结果预览</span>
            {result && (
              <span className="text-xs text-gray-400">
                字数：{result.length}
              </span>
            )}
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-4 h-4" /> 复制文本
              </button>
              <button
                onClick={handleExportWord}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> 导出 Word
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> 导出 Excel
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-[800px]">
            {generating ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-500">AI 正在根据系统数据生成材料，请稍候...</p>
                <p className="text-gray-400 text-sm mt-2">通常需要 5-15 秒</p>
              </div>
            ) : result ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 leading-8 text-[15px] text-gray-800 whitespace-pre-wrap">
                {result}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                <PenLine className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 text-base">在左侧配置任务并点击"开始智能生成"</p>
                <p className="text-gray-300 text-sm mt-2">
                  系统将自动调取数据库中的真实数据，结合大模型为您撰写材料
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
