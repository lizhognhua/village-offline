"use client";

import { useState, useCallback } from "react";
import { Upload, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import Link from "next/link";

const IMPORT_TYPES = [
  { type: "family", label: "村民户数据", icon: "🏠", desc: "导入户主信息，包含家庭成员数、家庭属性、收入等" },
  { type: "familymember", label: "家庭成员", icon: "👥", desc: "导入每户的人口明细，需包含户主姓名或家庭编码用于关联" },
  { type: "industry", label: "产业项目", icon: "🏭", desc: "导入产业项目信息，包含名称、规模、效益等" },
  { type: "partymember", label: "党员信息", icon: "🎖️", desc: "导入党员名册，包含入党日期、学历、联系方式等" },
];

interface PreviewData {
  importType: string;
  fileName: string;
  columns: string[];
  sampleRows: string[][];
  allRows: string[][];
  totalRows: number;
  importableFields: { field: string; label: string }[];
  requiredFields: string[];
  groups: { id: string; name: string }[];
  families: { id: string; headName: string; familyCode: string | null }[];
  aiSuggestion: Record<string, string>;
}

type Step = "type" | "upload" | "mapping" | "result";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("type");
  const [importType, setImportType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; total: number; errors?: string[] } | null>(null);

  // 步骤0 → 步骤1：选择类型后进入上传
  const handleSelectType = (type: string) => {
    setImportType(type);
    setFile(null);
    setPreview(null);
    setMappings({});
    setError("");
    setStep("upload");
  };

  // 步骤1 → 步骤2：上传并预览
  const handleUpload = async () => {
    if (!file || !importType) return;
    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", importType);
      const res = await fetch("/api/ai/import/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "预览失败");
      } else {
        setPreview(data);
        setMappings(data.aiSuggestion || {});
        setStep("mapping");
      }
    } catch {
      setError("网络请求失败");
    } finally {
      setLoading(false);
    }
  };

  // 步骤2 → 步骤3：执行导入
  const handleImport = async () => {
    if (!preview) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType: preview.importType,
          mappings,
          rows: preview.allRows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "导入失败");
      } else {
        setImportResult(data);
        setStep("result");
      }
    } catch {
      setError("网络请求失败");
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = useCallback((colIndex: string, dbField: string) => {
    setMappings((prev) => ({ ...prev, [colIndex]: dbField }));
  }, []);

  const resetAll = () => {
    setStep("type");
    setImportType("");
    setFile(null);
    setPreview(null);
    setMappings({});
    setError("");
    setImportResult(null);
  };

  const selectedTypeLabel = IMPORT_TYPES.find((t) => t.type === importType)?.label || "";

  return (
    <div className="flex justify-center bg-gray-50 overflow-y-auto min-h-[calc(100vh-60px)]">
      <div className="w-full max-w-3xl px-6 py-8">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              批量导入数据
              {selectedTypeLabel && (
                <span className="text-sm font-normal text-gray-400">— {selectedTypeLabel}</span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">上传 Excel 表格，自动映射字段，导入到本工作队数据库</p>
          </div>
          <Link href="/ai-writer" className="text-sm text-blue-600 hover:text-blue-800">
            ← 返回 AI 笔杆子
          </Link>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-3 mb-8">
          {[
            { key: "type", label: "选择类型" },
            { key: "upload", label: "上传文件" },
            { key: "mapping", label: "映射字段" },
            { key: "result", label: "完成导入" },
          ].map((s, i) => {
            const stepOrder = ["type", "upload", "mapping", "result"];
            const currentIdx = stepOrder.indexOf(step);
            const done = currentIdx > i;
            const active = currentIdx === i;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    active ? "bg-blue-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {done ? <CheckCircle className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`text-sm ${active ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                  {s.label}
                </span>
                {i < 3 && <div className="w-8 h-px bg-gray-300" />}
              </div>
            );
          })}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* 步骤0：选择类型 */}
        {step === "type" && (
          <div className="space-y-4">
            <p className="text-gray-600">请选择要导入的数据类型：</p>
            <div className="grid grid-cols-2 gap-4">
              {IMPORT_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => handleSelectType(t.type)}
                  className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <span className="text-3xl block mb-2">{t.icon}</span>
                  <h3 className="font-semibold text-gray-900 mb-1">{t.label}</h3>
                  <p className="text-sm text-gray-500">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 步骤1：上传 */}
        {step === "upload" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setStep("type")} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> 重新选择类型
              </button>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">当前类型：{selectedTypeLabel}</span>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                file ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="fileUpload"
              />
              <label htmlFor="fileUpload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                {file ? (
                  <>
                    <p className="text-blue-700 font-semibold">{file.name}</p>
                    <p className="text-blue-500 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB — 点击更换文件</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 font-semibold">点击选择 Excel 文件</p>
                    <p className="text-gray-400 text-sm mt-2">支持 .xlsx / .xls / .csv 格式</p>
                  </>
                )}
              </label>
            </div>

            <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-semibold mb-2">💡 导入说明</p>
              <ul className="space-y-1 text-gray-500">
                <li>• 表格第一行必须是列标题</li>
                <li>• 每行一条记录，空行自动忽略</li>
                <li>• 导入数据自动归属到当前工作队，不会串到其他队</li>
              </ul>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> 正在解析...
                </>
              ) : (
                <>
                  下一步：映射字段 <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* 步骤2：映射 */}
        {step === "mapping" && preview && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { setStep("upload"); setPreview(null); }} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> 重新上传
              </button>
            </div>

            <h2 className="font-semibold text-gray-900">
              {preview.fileName} — 共 {preview.totalRows} 行
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              请确认每列对应的数据库字段。标红色的是必填字段。
            </p>

            <div className="space-y-3 mb-6">
              {preview.columns.map((col, i) => {
                const mappedField = mappings[String(i)];
                const fieldDef = preview.importableFields.find((f) => f.field === mappedField);
                const isRequired = fieldDef?.label.includes("（必填）");
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-40 flex-shrink-0">
                      <span className={`text-sm font-medium truncate block ${isRequired ? "text-red-600" : "text-gray-700"}`} title={col}>
                        {isRequired && <span className="text-red-500 mr-0.5">*</span>}
                        {col}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    <select
                      className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                        !mappedField && isRequired !== undefined ? "border-red-300" : "border-gray-200"
                      }`}
                      value={mappedField || ""}
                      onChange={(e) => updateMapping(String(i), e.target.value)}
                    >
                      <option value="">— 跳过 —</option>
                      {preview.importableFields.map((f) => (
                        <option key={f.field} value={f.field}>{f.label}</option>
                      ))}
                    </select>
                    <div className="w-28 flex-shrink-0 text-xs text-gray-400 truncate" title={preview.sampleRows[0]?.[i] || ""}>
                      示例: {preview.sampleRows[0]?.[i] || "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 预览表格 */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">数据预览（前 5 行）</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {preview.columns.map((col, i) => {
                        const mf = mappings[String(i)];
                        const fl = mf ? preview.importableFields.find((f) => f.field === mf)?.label.split("（")[0] : null;
                        return (
                          <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap border-r border-gray-200">
                            {col}
                            {fl && <span className="ml-1 text-blue-500">→ {fl}</span>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        {preview.columns.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 text-gray-700 border-r border-gray-100 whitespace-nowrap">
                            {row[ci] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={loading || !Object.values(mappings).some((v) => v && v !== "_skip")}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 正在导入...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  确认导入 {preview.totalRows} 行数据
                </>
              )}
            </button>
          </div>
        )}

        {/* 步骤3：结果 */}
        {step === "result" && importResult && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">导入完成</h2>
            <p className="text-gray-600">
              成功导入 <span className="text-green-600 font-bold">{importResult.imported}</span> 条{selectedTypeLabel}
              {importResult.total !== importResult.imported && (
                <span className="text-gray-500">，共 {importResult.total} 条</span>
              )}
            </p>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-6 text-left bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-2">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  跳过的记录（{importResult.errors.length} 条）
                </h3>
                <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-center">
              {importType === "family" && (
                <Link href="/village" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  查看村情户情
                </Link>
              )}
              {importType === "industry" && (
                <Link href="/industries" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  查看产业管理
                </Link>
              )}
              {importType === "partymember" && (
                <Link href="/party" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  查看党建培训
                </Link>
              )}
              <button onClick={resetAll} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                继续导入其他数据
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
