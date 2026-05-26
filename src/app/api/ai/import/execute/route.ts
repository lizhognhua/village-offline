import { requireAuth } from "@/lib/auth-utils";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getImportType } from "@/lib/import-types";

export const dynamic = "force-dynamic";

// 家庭属性归一化
const ATTR_MAP: Record<string, string> = {
  "脱贫": "脱贫户", "脱贫户": "脱贫户",
  "监测": "监测户", "监测户": "监测户",
  "低保": "低保户", "低保户": "低保户",
  "五保": "五保户", "五保户": "五保户",
  "一般": "一般农户", "一般农户": "一般农户", "一般户": "一般农户",
};

export async function POST(req: NextRequest) {
  const a = await requireAuth();
  if (a.error) return a.error;
  

  try {
    const body = await req.json();
    const { importType: typeStr, mappings, rows } = body as {
      importType: string;
      mappings: Record<string, string>;
      rows: any[][];
    };

    if (!typeStr || !mappings || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const importType = getImportType(typeStr);
    if (!importType) {
      return NextResponse.json({ error: `不支持的导入类型: ${typeStr}` }, { status: 400 });
    }

    // 获取必填字段
    const requiredFields = importType.fields.filter((f) => f.required).map((f) => f.field);
    const mappedFields = Object.values(mappings).filter((v) => v && v !== "_skip");
    const missingRequired = requiredFields.filter((rf) => !mappedFields.includes(rf));
    if (missingRequired.length > 0) {
      const labels = missingRequired.map((f) => importType.fields.find((tf) => tf.field === f)?.label || f);
      return NextResponse.json({ error: `请映射必填字段: ${labels.join("、")}` }, { status: 400 });
    }

    // 预查询（根据不同类型）
    let groups: { id: string; name: string }[] = [];
    let families: { id: string; headName: string; familyCode: string | null }[] = [];
    let existingCodes: Set<string> = new Set();

    if (typeStr === "family") {
      groups = await prisma.villageGroup.findMany({
        where: { type: "tun" },
        select: { id: true, name: true },
      });
      const codes = await prisma.family.findMany({
        where: { familyCode: { not: null } },
        select: { familyCode: true },
      });
      existingCodes = new Set(codes.map((f) => f.familyCode).filter(Boolean) as string[]);
    }

    if (typeStr === "familymember") {
      families = await prisma.family.findMany({
        where: {},
        select: { id: true, headName: true, familyCode: true },
      });
    }

    const errors: string[] = [];
    let imported = 0;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const lineNum = rowIdx + 2;

      try {
        // 提取映射值
        const values: Record<string, string> = {};
        for (const [colIdxStr, dbField] of Object.entries(mappings)) {
          if (!dbField || dbField === "_skip") continue;
          const colIdx = parseInt(colIdxStr);
          if (isNaN(colIdx)) continue;
          const val = String(row[colIdx] ?? "").trim();
          if (val) values[dbField] = val;
        }

        switch (typeStr) {
          case "family":
            await importFamily(values, lineNum, groups, existingCodes, errors);
            if (!errors.length || !errors[errors.length - 1].startsWith(`第 ${lineNum}`)) {
              imported++;
            }
            break;

          case "familymember":
            await importFamilyMember(values, lineNum, families, errors);
            if (!errors.length || !errors[errors.length - 1].startsWith(`第 ${lineNum}`)) {
              imported++;
            }
            break;

          case "industry":
            await importIndustry(values, lineNum, errors);
            if (!errors.length || !errors[errors.length - 1].startsWith(`第 ${lineNum}`)) {
              imported++;
            }
            break;

          case "partymember":
            await importPartyMember(values, lineNum, errors);
            if (!errors.length || !errors[errors.length - 1].startsWith(`第 ${lineNum}`)) {
              imported++;
            }
            break;
        }
      } catch (e) {
        errors.push(`第 ${lineNum} 行: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      imported,
      total: rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }
    return NextResponse.json({ error: `导入失败: ${(e as Error).message}` }, { status: 500 });
  }
}

// ====== 各类型导入逻辑 ======

async function importFamily(
  values: Record<string, string>,
  lineNum: number,
  teamId: string,
  groups: { id: string; name: string }[],
  existingCodes: Set<string>,
  errors: string[]
) {
  if (!values.headName) {
    errors.push(`第 ${lineNum} 行: 缺少户主姓名，跳过`);
    return;
  }
  if (values.familyCode && existingCodes.has(values.familyCode)) {
    errors.push(`第 ${lineNum} 行: 家庭编码 "${values.familyCode}" 已存在，跳过`);
    return;
  }

  const data: Record<string, any> = {
    
    headName: values.headName,
    tags: "[]",
    photos: "[]",
    files: "[]",
  };

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
  if (values.population) {
    const pop = parseInt(values.population);
    if (!isNaN(pop) && pop > 0) data.population = pop;
  }
  if (values.familyAttr) data.familyAttr = ATTR_MAP[values.familyAttr] || values.familyAttr;
  if (values.residenceStatus) data.residenceStatus = values.residenceStatus.includes("外出") ? "外出户" : "常住户";
  if (values.riskLevel) data.riskLevel = ["低", "中", "高"].includes(values.riskLevel) ? values.riskLevel : "低";
  if (values.income) data.income = values.income;
  if (values.incomeSource) data.incomeSource = values.incomeSource;
  if (values.notes) data.notes = values.notes;
  if (values.groupName) {
    const g = groups.find((x) => x.name === values.groupName);
    if (g) data.groupId = g.id;
  }

  await prisma.family.create({ data });
  if (values.familyCode) existingCodes.add(values.familyCode);
}

async function importFamilyMember(
  values: Record<string, string>,
  lineNum: number,
  families: { id: string; headName: string; familyCode: string | null }[],
  errors: string[]
) {
  if (!values.name) {
    errors.push(`第 ${lineNum} 行: 缺少姓名，跳过`);
    return;
  }
  if (!values.relation) {
    errors.push(`第 ${lineNum} 行: 缺少与户主关系，跳过`);
    return;
  }

  // 根据 familyCode 或 headName 查找 familyId
  let familyId = "";
  if (values.familyCode) {
    const f = families.find((x) => x.familyCode === values.familyCode);
    if (f) familyId = f.id;
  }
  if (!familyId && values.headName) {
    const f = families.find((x) => x.headName === values.headName);
    if (f) familyId = f.id;
  }
  if (!familyId) {
    errors.push(`第 ${lineNum} 行: 找不到对应的家庭（${values.familyCode || values.headName || "未指定"}），跳过`);
    return;
  }

  const data: Record<string, any> = {
    name: values.name,
    relation: values.relation,
    familyId,
  };

  if (values.gender) data.gender = values.gender;
  if (values.idCard) data.idCard = values.idCard;
  if (values.phone) data.phone = values.phone;
  if (values.education) data.education = values.education;
  if (values.occupation) data.occupation = values.occupation;
  if (values.healthStatus) data.healthStatus = values.healthStatus;
  if (values.healthNote) data.healthNote = values.healthNote;
  if (values.birthDate) {
    const d = new Date(values.birthDate);
    if (!isNaN(d.getTime())) data.birthDate = d;
  }

  await prisma.familyMember.create({ data });
}

async function importIndustry(
  values: Record<string, string>,
  lineNum: number,
  teamId: string,
  errors: string[]
) {
  if (!values.name) {
    errors.push(`第 ${lineNum} 行: 缺少项目名称，跳过`);
    return;
  }

  const data: Record<string, any> = {
    name: values.name,
    
  };

  if (values.description) data.description = values.description;
  if (values.detail) data.detail = values.detail;
  if (values.status) data.status = values.status;
  if (values.scale) data.scale = values.scale;
  if (values.benefit) data.benefit = values.benefit;
  if (values.startDate) {
    const d = new Date(values.startDate);
    if (!isNaN(d.getTime())) data.startDate = d;
  }
  if (values.notes) {
    // notes → description (如果 description 已填则追加)
    if (data.description) data.description += "\n备注: " + values.notes;
    else data.description = values.notes;
  }

  await prisma.industry.create({ data });
}

async function importPartyMember(
  values: Record<string, string>,
  lineNum: number,
  teamId: string,
  errors: string[]
) {
  if (!values.name) {
    errors.push(`第 ${lineNum} 行: 缺少姓名，跳过`);
    return;
  }

  const data: Record<string, any> = {
    name: values.name,
    
    isActive: true,
  };

  if (values.gender) data.gender = values.gender;
  if (values.idCard) data.idCard = values.idCard;
  if (values.ethnicity) data.ethnicity = values.ethnicity;
  if (values.education) data.education = values.education;
  if (values.joinDate) data.joinDate = values.joinDate;
  if (values.phone) data.phone = values.phone;
  if (values.address) data.address = values.address;
  if (values.note) data.note = values.note;

  await prisma.partyMember.create({ data });
}
