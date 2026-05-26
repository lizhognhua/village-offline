import { requireAdmin } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { TEMPLATES, FAMILY_ATTR_TAGS, ATTR_NORMALIZE } from "@/lib/import-templates";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const a = await requireAdmin();
  if (a.error) return a.error;

  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const type = (fd.get("type") as string) || "";

    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!TEMPLATES[type]) return NextResponse.json({ error: `不支持的导入类型: ${type}` }, { status: 400 });

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      return NextResponse.json({ error: "仅支持 .xlsx / .xls / .csv 格式" }, { status: 400 });
    }

    // Parse Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: "未找到工作表" }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rawData.length < 2) {
      return NextResponse.json({ error: "表格至少需要包含表头和一行数据" }, { status: 400 });
    }

    // Map columns: find which header maps to which db field
    const headers = rawData[0].map((h: any) => String(h).trim());
    const fieldMap = TEMPLATES[type].fieldMap;
    const colMap: Record<number, string> = {}; // colIndex → dbField
    for (let i = 0; i < headers.length; i++) {
      const dbField = fieldMap[headers[i]];
      if (dbField) colMap[i] = dbField;
    }

    // Check required fields present
    const mappedFields = new Set(Object.values(colMap));
    const requiredFields = TEMPLATES[type].fields.filter(f => f.required).map(f => f.field);
    const missingRequired = requiredFields.filter(rf => !mappedFields.has(rf));
    if (missingRequired.length > 0) {
      const labels = missingRequired.map(f => {
        const fd = TEMPLATES[type].fields.find(tf => tf.field === f);
        return fd?.label || f;
      });
      return NextResponse.json({
        error: `Excel 表头缺少必填列: ${labels.join("、")}。请下载样表确保列名一致。`,
      }, { status: 400 });
    }

    // Skip header row, filter empty rows
    const rows = rawData.slice(1).filter((row: any[]) => row.some((cell: any) => String(cell).trim() !== ""));

    // Pre-load reference data
    const groups = type === "family"
      ? await prisma.villageGroup.findMany({ where: { type: "tun" }, select: { id: true, name: true } })
      : [];
    const familiesForMember = type === "member"
      ? await prisma.family.findMany({ select: { id: true, headName: true, familyCode: true } })
      : [];
    const existingCodes = type === "family"
      ? new Set((await prisma.family.findMany({ where: { familyCode: { not: null } }, select: { familyCode: true } })).map(f => f.familyCode!).filter(Boolean))
      : new Set<string>();

    // Pre-load existing families for duplicate detection (name + ID card)
    const existingFamilies: { headName: string; headIdCard: string | null }[] = type === "family"
      ? await prisma.family.findMany({ select: { headName: true, headIdCard: true } })
      : [];

    // Process rows
    const errors: string[] = [];     // rows that were SKIPPED
    const warnings: string[] = [];   // rows imported but with minor issues
    let imported = 0;
    let skipped = 0;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const lineNum = rowIdx + 2;
      try {
        const values: Record<string, string> = {};
        for (const [colIdxStr, dbField] of Object.entries(colMap)) {
          const colIdx = parseInt(colIdxStr);
          if (isNaN(colIdx)) continue;
          const val = String(row[colIdx] ?? "").trim();
          if (val) values[dbField] = val;
        }

        let result: { ok: boolean; warnings: string[] };
        switch (type) {
          case "family":
            result = await doImportFamily(values, lineNum, groups, existingCodes, existingFamilies);
            break;
          case "member":
            result = await doImportMember(values, lineNum, familiesForMember);
            break;
          case "party":
            result = await doImportParty(values, lineNum);
            break;
          default:
            result = { ok: false, warnings: [] };
        }
        // Safety: ensure warnings is an array
        const rowWarnings = Array.isArray(result.warnings) ? result.warnings : [];
        if (result.ok) {
          imported++;
          for (const w of rowWarnings) warnings.push(`第 ${lineNum} 行: ${w}`);
        } else {
          skipped++;
          for (const w of rowWarnings) errors.push(`第 ${lineNum} 行: ${w}`);
        }
      } catch (e: any) {
        errors.push(`第 ${lineNum} 行: 系统错误，请检查数据格式`);
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: rows.length,
      warnings: warnings.length > 0 ? warnings.slice(0, 50) : undefined,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
      hasMoreWarnings: warnings.length > 50,
      hasMoreErrors: errors.length > 50,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `导入失败: ${e.message}` }, { status: 500 });
  }
}

// ====== 身份证号码校验 ======

function validateIdCard(idCard: string): string | null {
  if (!idCard) return null;
  const trimmed = idCard.trim().toUpperCase();
  // 18位格式
  if (/^\d{17}[\dX]$/.test(trimmed)) {
    // 校验码验证
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkMap = "10X98765432";
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += parseInt(trimmed[i]) * weights[i];
    if (checkMap[sum % 11] === trimmed[17]) return null;
    return "校验码不正确";
  }
  // 15位老号码（仅校验格式）
  if (/^\d{15}$/.test(trimmed)) return null;
  return "格式不符（应为18位数字或17位数字+X）";
}

// ====== 手机号码校验 ======

function validatePhone(phone: string): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (/^1[3-9]\d{9}$/.test(trimmed)) return null;
  if (trimmed.length !== 11) return `位数不符（当前${trimmed.length}位，应为11位）`;
  if (!trimmed.startsWith("1")) return "首位应为1";
  return "格式不正确";
}

// ====== 村民户导入 ======

async function doImportFamily(
  values: Record<string, string>,
  lineNum: number,
  groups: { id: string; name: string }[],
  existingCodes: Set<string>,
  existingFamilies: { headName: string; headIdCard: string | null }[]
): Promise<{ ok: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  if (!values.headName) return { ok: false, warnings: [`缺少户主姓名，已跳过`] };

  // Duplicate detection: same name AND same ID card
  if (values.headIdCard) {
    const dup = existingFamilies.find(
      f => f.headName === values.headName && f.headIdCard === values.headIdCard
    );
    if (dup) return { ok: false, warnings: [`"${values.headName}"（身份证 ${values.headIdCard}）已存在，重复导入已跳过`] };
  } else {
    // No ID card: warn but still import (can't accurately detect duplicates without ID)
    const sameName = existingFamilies.filter(f => f.headName === values.headName);
    if (sameName.length > 0) {
      warnings.push(`姓名"${values.headName}"在系统中已有${sameName.length}条记录，因未填身份证号无法判重，仍继续导入`);
    }
  }

  // ID card validation
  if (values.headIdCard) {
    const idErr = validateIdCard(values.headIdCard);
    if (idErr) warnings.push(`户主身份证号"${values.headIdCard}"${idErr}，已导入但请核对`);
  }

  // Phone validation
  if (values.headPhone) {
    const phoneErr = validatePhone(values.headPhone);
    if (phoneErr) warnings.push(`户主电话"${values.headPhone}"${phoneErr}，已导入但请核对`);
  }

  if (values.familyCode && existingCodes.has(values.familyCode)) {
    return { ok: false, warnings: [`家庭编码 "${values.familyCode}" 已存在，已跳过`] };
  }

  // Handle multi-tag familyAttr
  let familyAttr: string | null = null;
  if (values.familyAttr) {
    const tags = values.familyAttr.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    const normalized: string[] = [];
    for (const tag of tags) {
      const direct = FAMILY_ATTR_TAGS.find(t => t === tag);
      if (direct) { normalized.push(direct); continue; }
      const viaMap = ATTR_NORMALIZE[tag];
      if (viaMap) { normalized.push(viaMap); continue; }
      warnings.push(`未知属性标签 "${tag}"，已忽略`);
    }
    familyAttr = normalized.length > 0 ? [...new Set(normalized)].join(",") : null;
  }

  const data: any = {
    headName: values.headName,
    population: parseInt(values.population) || 0,
    tags: "[]", photos: "[]", files: "[]",
  };
  if (familyAttr) data.familyAttr = familyAttr;
  if (values.headGender) data.headGender = values.headGender;
  if (values.headIdCard) data.headIdCard = values.headIdCard;
  if (values.headPhone) data.headPhone = values.headPhone;
  if (values.familyCode) data.familyCode = values.familyCode;
  if (values.spouseName) data.spouseName = values.spouseName;
  if (values.spousePhone) data.spousePhone = values.spousePhone;
  if (values.spouseIdCard) data.spouseIdCard = values.spouseIdCard;
  if (values.address) data.address = values.address;
  if (values.registeredAddr) data.registeredAddr = values.registeredAddr;
  if (values.actualAddr) data.actualAddr = values.actualAddr;
  if (values.residenceStatus) data.residenceStatus = values.residenceStatus.includes("外出") ? "外出户" : "常住户";
  if (values.riskLevel) data.riskLevel = ["低", "中", "高"].includes(values.riskLevel) ? values.riskLevel : "低";
  if (values.income) data.income = values.income;
  if (values.incomeSource) data.incomeSource = values.incomeSource;
  if (values.notes) data.notes = values.notes;
  if (values.groupName) {
    const g = groups.find(x => x.name === values.groupName);
    if (g) data.groupId = g.id;
    else warnings.push(`自然屯 "${values.groupName}" 未找到，该字段已置空`);
  }

  await prisma.family.create({ data });
  if (values.familyCode) existingCodes.add(values.familyCode);
  // Track for duplicate detection within same batch
  existingFamilies.push({ headName: values.headName, headIdCard: values.headIdCard || null });
  return { ok: true, warnings };
}

// ====== 家庭成员导入 ======

async function doImportMember(
  values: Record<string, string>,
  lineNum: number,
  families: { id: string; headName: string; familyCode: string | null }[]
): Promise<{ ok: boolean; warnings: string[] }> {
  if (!values.name) return { ok: false, warnings: [`缺少成员姓名，已跳过`] };
  if (!values.relation) return { ok: false, warnings: [`缺少与户主关系，已跳过`] };

  let familyId = "";
  if (values.headName) {
    const f = families.find(x => x.headName === values.headName);
    if (f) familyId = f.id;
  }
  if (!familyId) {
    return { ok: false, warnings: [`户主 "${values.headName || "未指定"}" 未找到，已跳过`] };
  }

  const data: any = { name: values.name, relation: values.relation, familyId };
  if (values.gender) data.gender = values.gender;
  if (values.idCard) data.idCard = values.idCard;
  if (values.phone) data.phone = values.phone;
  if (values.birthDate) {
    const d = new Date(values.birthDate);
    if (!isNaN(d.getTime())) data.birthDate = d;
  }
  if (values.education) data.education = values.education;
  if (values.occupation) data.occupation = values.occupation;
  if (values.healthStatus) data.healthStatus = values.healthStatus;
  if (values.healthNote) data.healthNote = values.healthNote;

  await prisma.familyMember.create({ data });
  return { ok: true, warnings: [] };
}

// ====== 党员信息导入 ======

async function doImportParty(
  values: Record<string, string>,
  lineNum: number
): Promise<{ ok: boolean; warnings: string[] }> {
  if (!values.name) return { ok: false, warnings: [`缺少姓名，已跳过`] };

  const data: any = { name: values.name, isActive: true };
  if (values.gender) data.gender = values.gender;
  if (values.idCard) data.idCard = values.idCard;
  if (values.ethnicity) data.ethnicity = values.ethnicity;
  if (values.education) data.education = values.education;
  if (values.joinDate) data.joinDate = values.joinDate;
  if (values.phone) data.phone = values.phone;
  if (values.address) data.address = values.address;
  if (values.note) data.note = values.note;

  await prisma.partyMember.create({ data });
  return { ok: true, warnings: [] };
}
