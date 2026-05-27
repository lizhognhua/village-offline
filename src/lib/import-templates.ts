// 导入模板定义 — 字段、样表生成、数据校验
import * as XLSX from "xlsx";

export interface ImportField {
  field: string;       // 数据库字段名
  label: string;       // Excel 列名
  required?: boolean;  // 必填
  example?: string;    // 示例值
  note?: string;       // 填写说明
  dropdown?: string[]; // 下拉限定值
}

export interface ImportTemplate {
  type: string;
  label: string;
  tableName: string;
  fields: ImportField[];
  fieldMap: Record<string, string>; // Excel列名 → 数据库字段名
}

// ========== 12 标签白名单 ==========
export const FAMILY_ATTR_TAGS = [
  "一般农户", "脱贫户", "监测户", "低保户", "五保户",
  "党员", "村委会成员", "高龄老人", "赡养儿童",
  "重疾重病", "残疾", "丧失劳动能力",
];

export const ATTR_NORMALIZE: Record<string, string> = {
  "脱贫": "脱贫户", "监测": "监测户", "低保": "低保户",
  "五保": "五保户", "一般": "一般农户", "一般户": "一般农户",
};

// ========== 三套导入模板 ==========

export const TEMPLATES: Record<string, ImportTemplate> = {
  family: {
    type: "family",
    label: "村民户数据",
    tableName: "Family",
    fieldMap: {},
    fields: [
      { field: "headName", label: "户主姓名", required: true, example: "张三" },
      { field: "headGender", label: "户主性别", example: "男", dropdown: ["男", "女"] },
      { field: "headIdCard", label: "户主身份证号", example: "230123199001011234" },
      { field: "headPhone", label: "户主电话", example: "13800001111" },
      { field: "spouseName", label: "配偶姓名", example: "李四" },
      { field: "spousePhone", label: "配偶电话", example: "13800002222" },
      { field: "spouseIdCard", label: "配偶身份证号" },
      { field: "address", label: "家庭地址", example: "靠山乡靠山村靠山屯1号" },
      { field: "registeredAddr", label: "户籍地址", example: "靠山乡靠山村" },
      { field: "actualAddr", label: "实际住址" },
      { field: "population", label: "家庭人口数", example: "3", note: "数字" },
      { field: "familyAttr", label: "家庭属性", example: "脱贫户,残疾",
        note: "可多选，逗号分隔。可选: 一般农户, 脱贫户, 监测户, 低保户, 五保户, 党员, 村委会成员, 高龄老人, 赡养儿童, 重疾重病, 残疾, 丧失劳动能力" },
      { field: "residenceStatus", label: "居住状态", example: "常住户", dropdown: ["常住户", "外出户"] },
      { field: "riskLevel", label: "风险等级", example: "低", dropdown: ["低", "中", "高"] },
      { field: "income", label: "年收入(元)", example: "18000", note: "数字" },
      { field: "incomeSource", label: "收入来源", example: "种植+务工" },
      { field: "groupName", label: "所在自然屯", example: "靠山屯", note: "需与系统中屯名完全一致" },
      { field: "notes", label: "备注" },
    ],
  },

  member: {
    type: "member",
    label: "家庭成员",
    tableName: "FamilyMember",
    fieldMap: {},
    fields: [
      { field: "headName", label: "户主姓名", required: true, example: "张三", note: "用于匹配已有农户" },
      { field: "name", label: "成员姓名", required: true, example: "张小明" },
      { field: "relation", label: "与户主关系", required: true, example: "长子" },
      { field: "gender", label: "性别", example: "男", dropdown: ["男", "女"] },
      { field: "idCard", label: "身份证号", example: "230123201505151234" },
      { field: "phone", label: "电话" },
      { field: "birthDate", label: "出生日期", example: "2015-05-15", note: "格式：YYYY-MM-DD" },
      { field: "education", label: "文化程度", example: "初中", dropdown: ["小学", "初中", "高中", "大专", "本科", "硕士", "博士"] },
      { field: "occupation", label: "职业", example: "学生" },
      { field: "healthStatus", label: "健康状况", example: "健康" },
      { field: "healthNote", label: "健康备注" },
    ],
  },

  party: {
    type: "party",
    label: "党员信息",
    tableName: "PartyMember",
    fieldMap: {},
    fields: [
      { field: "name", label: "姓名", required: true, example: "李建国" },
      { field: "gender", label: "性别", example: "男", dropdown: ["男", "女"] },
      { field: "idCard", label: "身份证号", example: "230123197506151234" },
      { field: "ethnicity", label: "民族", example: "汉族" },
      { field: "education", label: "学历", example: "大专", dropdown: ["小学", "初中", "高中", "大专", "本科", "硕士", "博士"] },
      { field: "joinDate", label: "入党日期", example: "2010-07-01", note: "格式：YYYY-MM-DD" },
      { field: "phone", label: "电话", example: "13900001111" },
      { field: "address", label: "地址", example: "靠山乡靠山村" },
      { field: "note", label: "备注" },
    ],
  },
};

// Build fieldMap for each template (Excel列名 → 数据库字段名)
for (const t of Object.values(TEMPLATES)) {
  for (const f of t.fields) {
    t.fieldMap[f.label] = f.field;
  }
}

// ========== 生成 Excel 样表 ==========

export function generateTemplate(type: string, groups?: { name: string }[]): Buffer {
  const tmpl = TEMPLATES[type];
  if (!tmpl) throw new Error(`Unknown template type: ${type}`);

  const wb = XLSX.utils.book_new();

  // Sheet 1: 数据表（仅表头+提示，示例请参考"填写说明"页）
  const headers = tmpl.fields.map(f => f.label);
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, ["⬇ 请在下方填写实际数据（此行自动跳过，无需删除）"]]);

  // Set column widths
  dataSheet["!cols"] = tmpl.fields.map(() => ({ wch: 18 }));

  // Add dropdown validation for fields with limited options
  // (XLSX library doesn't support data validation directly, so we add notes)
  XLSX.utils.book_append_sheet(wb, dataSheet, "数据");

  // Sheet 2: 填写说明
  const instrRows = [["列名", "必填", "填写说明", "示例"]];
  for (const f of tmpl.fields) {
    let note = f.note || "";
    if (f.dropdown) note = (note ? note + "；" : "") + "限填: " + f.dropdown.join("/");
    instrRows.push([
      f.label,
      f.required ? "是" : "",
      note,
      f.example || "",
    ]);
  }

  // Add 12-tag info for family type
  if (type === "family") {
    instrRows.push([]);
    instrRows.push(["【家庭属性 12 标签完整列表】"]);
    instrRows.push(["户属性（5个）", "一般农户, 脱贫户, 监测户, 低保户, 五保户"]);
    instrRows.push(["特征标签（7个）", "党员, 村委会成员, 高龄老人, 赡养儿童, 重疾重病, 残疾, 丧失劳动能力"]);
    instrRows.push(["多选写法", "用英文逗号分隔，如: 脱贫户,残疾,高龄老人"]);
    if (groups && groups.length > 0) {
      instrRows.push([]);
      instrRows.push(["【当前系统已配置的自然屯】"]);
      instrRows.push(["名称"]);
      for (const g of groups) instrRows.push([g.name]);
    }
  }

  // Add headName matching note for member type
  if (type === "member") {
    instrRows.push([]);
    instrRows.push(["【注意】"]);
    instrRows.push(["户主姓名用于匹配系统中已有农户，必须与系统中户主姓名完全一致。"]);
    instrRows.push(["如果匹配不到，该行记录将被跳过。"]);
  }

  const instrSheet = XLSX.utils.aoa_to_sheet(instrRows);
  instrSheet["!cols"] = [{ wch: 16 }, { wch: 8 }, { wch: 60 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, instrSheet, "填写说明");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
