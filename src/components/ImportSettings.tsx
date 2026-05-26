"use client";
import { useState, useRef } from "react";
import { Download, Upload, Loader2, CheckCircle, AlertCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";

type ImportResult = {
  imported: number;
  skipped: number;
  total: number;
  warnings?: string[];
  errors?: string[];
  hasMoreWarnings?: boolean;
  hasMoreErrors?: boolean;
};

export function ImportSettings() {
  return (
    <div className="space-y-6">
      {/* 村民户数据 */}
      <ImportSection
        type="family"
        title="村民户数据导入"
        desc="批量导入户主信息。下载样表 → 填入数据 → 上传导入。"
        headers={["户主姓名","户主性别","户主身份证号","户主电话","配偶姓名","配偶电话","配偶身份证号","家庭地址","户籍地址","实际住址","家庭人口数","家庭属性","居住状态","风险等级","年收入(元)","收入来源","所在自然屯","备注"]}
      />

      {/* 家庭成员 */}
      <ImportSection
        type="member"
        title="家庭成员导入"
        desc="批量导入每户成员。需填写户主姓名用于关联。"
        headers={["户主姓名","成员姓名","与户主关系","性别","身份证号","电话","出生日期","文化程度","职业","健康状况","健康备注"]}
      />

      {/* 党员信息 */}
      <ImportSection
        type="party"
        title="党员信息导入"
        desc="批量导入党员名册。"
        headers={["姓名","性别","身份证号","民族","学历","入党日期","电话","地址","备注"]}
      />
    </div>
  );
}

function ImportSection({ type, title, desc, headers }: {
  type: string; title: string; desc: string; headers: string[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const r = await fetch(`/api/import/template?type=${type}`);
      if (!r.ok) throw new Error("下载失败");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const names: Record<string, string> = {
        family: "村民户数据导入样表.xlsx",
        member: "家庭成员导入样表.xlsx",
        party: "党员信息导入样表.xlsx",
      };
      a.download = names[type] || "样表.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError("下载样表失败"); }
    setDownloading(false);
  };

  const handleImport = async () => {
    if (!file) { setError("请先选择文件"); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const r = await fetch("/api/import/execute", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "导入失败"); }
      else { setResult(d); setFile(null); if (fileRef.current) fileRef.current.value = ""; }
    } catch { setError("网络请求失败"); }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
        <button onClick={handleDownload} disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          <Download className="w-4 h-4" /> {downloading ? "生成中..." : "下载样表"}
        </button>
      </div>

      {/* Column preview */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">字段列表（{headers.length} 列）</summary>
        <div className="flex flex-wrap gap-1 mt-2">
          {headers.map((h, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">{h}</span>
          ))}
        </div>
      </details>

      {/* Upload */}
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
          onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError(""); }}
          className="hidden" id={`file-${type}`} />
        <label htmlFor={`file-${type}`}
          className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer text-sm transition-colors ${file ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-500 hover:border-gray-400"}`}>
          <FileSpreadsheet className="w-4 h-4" />
          {file ? file.name : "选择 Excel 文件"}
        </label>
        {file && (
          <button onClick={handleImport} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 导入中...</> : <><Upload className="w-4 h-4" /> 开始导入</>}
          </button>
        )}
      </div>

      {/* 导入结果规则说明 */}
      <details className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">📋 导入结果怎么看？</summary>
        <div className="mt-2 space-y-1.5">
          <p><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" /><b>成功导入 X 条</b> — 数据已正常写入系统，可在对应页面查看</p>
          <p><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" /><b>⚠ 警告（黄色）</b> — 该行已导入，但部分字段有异常（如：未知标签已忽略、身份证/手机号格式不符、屯名未匹配已置空），数据仍可使用</p>
          <p><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" /><b>❌ 跳过（红色）</b> — 该行未导入，原因包括：缺少必填字段（户主姓名等）、与已有数据重复（姓名+身份证号均相同）、户主未匹配到</p>
          <p className="text-gray-400 mt-1">村民户导入特有规则：① 姓名+身份证号均相同视为重复，自动跳过。② 身份证18位校验、手机号11位校验，不符会警告提醒但不阻止导入。</p>
          <p className="text-gray-400">提示：下载样表填写可避免大部分错误，样表的"填写说明"sheet 页有完整的字段规范和示例。</p>
        </div>
      </details>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 border ${result.imported > 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-sm">
              成功导入 <span className="text-green-700">{result.imported}</span> 条
              {result.skipped > 0 && (
                <span className="text-gray-500">，跳过 <span className="text-red-600">{result.skipped}</span> 条</span>
              )}
              <span className="text-gray-400 font-normal">（共 {result.total} 行）</span>
            </span>
          </div>

          {/* Warnings: imported but with minor issues */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {w}
                </p>
              ))}
              {result.hasMoreWarnings && <p className="text-xs text-gray-400">...更多提示已省略</p>}
            </div>
          )}

          {/* Errors: rows that were skipped */}
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {err}
                </p>
              ))}
              {result.hasMoreErrors && <p className="text-xs text-gray-400">...更多错误已省略</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
