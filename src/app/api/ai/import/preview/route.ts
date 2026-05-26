import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { getImportType, suggestMappings } from "@/lib/import-types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const importTypeStr = formData.get("type") as string | null;
    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!importTypeStr) return NextResponse.json({ error: "请选择导入类型" }, { status: 400 });

    const importType = getImportType(importTypeStr);
    if (!importType) return NextResponse.json({ error: `不支持的导入类型: ${importTypeStr}` }, { status: 400 });

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      return NextResponse.json({ error: "仅支持 .xlsx / .xls / .csv 格式" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: "未找到工作表" }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rawData.length < 2) {
      return NextResponse.json({ error: "表格至少需要包含表头和一行数据" }, { status: 400 });
    }

    const headers = rawData[0].map((h: any) => String(h).trim()).filter((h: string) => h.length > 0);
    const rows = rawData.slice(1).filter((row: any[]) => row.some((cell: any) => String(cell).trim() !== ""));

    // 自然屯列表（村民户导入时需要）
    const groups = await prisma.villageGroup.findMany({
      where: { type: "tun" },
      select: { id: true, name: true },
    });

    // 已有的户列表（家庭成员导入时需要）
    const families =
      importTypeStr === "familymember"
        ? await prisma.family.findMany({
            where: {},
            select: { id: true, headName: true, familyCode: true },
          })
        : [];

    // AI 列名建议
    const rawSuggestion = suggestMappings(importType, headers);
    const aiSuggestion: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      if (rawSuggestion[headers[i]]) {
        aiSuggestion[String(i)] = rawSuggestion[headers[i]];
      }
    }

    return NextResponse.json({
      importType: importTypeStr,
      fileName: file.name,
      columns: headers,
      sampleRows: rows.slice(0, 5),
      allRows: rows,
      totalRows: rows.length,
      importableFields: importType.fields.map((f) => ({
        field: f.field,
        label: f.label + (f.required ? "（必填）" : ""),
      })),
      requiredFields: importType.fields.filter((f) => f.required).map((f) => f.field),
      groups: groups.map((g) => ({ id: g.id, name: g.name })),
      families: families.map((f) => ({ id: f.id, headName: f.headName, familyCode: f.familyCode })),
      aiSuggestion,
    });
  } catch (e) {
    return NextResponse.json({ error: `解析文件失败: ${(e as Error).message}` }, { status: 500 });
  }
}
