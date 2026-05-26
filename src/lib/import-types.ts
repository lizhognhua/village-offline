// 导入类型定义 — 支持多种数据的批量导入

export interface ImportField {
  field: string;       // 数据库字段名
  label: string;       // 前端显示名
  required?: boolean;  // 是否必填
  keywords?: string[]; // AI 列名匹配关键词
}

export interface ImportType {
  type: string;        // 唯一标识
  label: string;       // 前端显示名
  icon: string;        // emoji 图标
  description: string; // 说明文字
  tableName: string;   // 目标数据库表
  fields: ImportField[];
  /** 预处理：在写入前做数据转换（如 familyCode → familyId） */
  preprocess?: string; // 预处理函数名
}

export const IMPORT_TYPES: ImportType[] = [
  {
    type: "family",
    label: "村民户数据",
    icon: "🏠",
    description: "导入户主信息，包含家庭成员数、家庭属性、收入等",
    tableName: "Family",
    fields: [
      { field: "headName", label: "户主姓名", required: true, keywords: ["户主", "户主姓名", "姓名"] },
      { field: "headGender", label: "户主性别", keywords: ["户主性别", "性别"] },
      { field: "headIdCard", label: "户主身份证号", keywords: ["户主身份证", "身份证", "身份证号"] },
      { field: "headPhone", label: "户主电话", keywords: ["户主电话", "电话", "手机", "联系电话"] },
      { field: "familyCode", label: "家庭编码", keywords: ["编号", "家庭编码", "户编码"] },
      { field: "spouseName", label: "配偶姓名", keywords: ["配偶", "配偶姓名"] },
      { field: "spousePhone", label: "配偶电话", keywords: ["配偶电话"] },
      { field: "spouseIdCard", label: "配偶身份证号", keywords: ["配偶身份证"] },
      { field: "address", label: "家庭地址", keywords: ["地址", "家庭地址", "住址", "现住址"] },
      { field: "registeredAddr", label: "户籍地址", keywords: ["户籍", "户籍地址"] },
      { field: "actualAddr", label: "实际住址", keywords: ["实际住址"] },
      { field: "population", label: "家庭人口数", keywords: ["人口", "家庭人口", "人数"] },
      { field: "familyAttr", label: "家庭属性", keywords: ["属性", "家庭属性", "户属性", "类型", "脱贫属性"] },
      { field: "residenceStatus", label: "居住状态", keywords: ["居住", "居住状态"] },
      { field: "riskLevel", label: "风险等级", keywords: ["风险", "风险等级"] },
      { field: "income", label: "家庭年收入", keywords: ["收入", "年收入"] },
      { field: "incomeSource", label: "收入来源", keywords: ["收入来源", "经济来源"] },
      { field: "notes", label: "备注", keywords: ["备注", "说明"] },
      { field: "groupName", label: "所在自然屯", keywords: ["屯", "自然屯", "村组", "组别"] },
    ],
    preprocess: "family",
  },
  {
    type: "familymember",
    label: "家庭成员",
    icon: "👥",
    description: "导入每户的人口明细，需包含'户主姓名'或'家庭编码'列用于关联",
    tableName: "FamilyMember",
    fields: [
      { field: "name", label: "姓名", required: true, keywords: ["姓名", "名字", "成员姓名"] },
      { field: "relation", label: "与户主关系", required: true, keywords: ["关系", "与户主关系", "称谓"] },
      { field: "gender", label: "性别", keywords: ["性别"] },
      { field: "idCard", label: "身份证号", keywords: ["身份证", "身份证号"] },
      { field: "phone", label: "电话", keywords: ["电话", "手机", "联系电话"] },
      { field: "birthDate", label: "出生日期", keywords: ["出生", "出生日期", "生日"] },
      { field: "education", label: "文化程度", keywords: ["文化", "学历", "文化程度", "教育"] },
      { field: "occupation", label: "职业", keywords: ["职业", "工作", "务工"] },
      { field: "healthStatus", label: "健康状况", keywords: ["健康", "健康状况", "身体状况"] },
      { field: "healthNote", label: "健康备注", keywords: ["健康备注", "疾病说明"] },
      // 关联字段
      { field: "familyCode", label: "所属家庭编码", keywords: ["家庭编码", "户编码", "编号"] },
      { field: "headName", label: "所属户主姓名", keywords: ["户主", "户主姓名"] },
    ],
    preprocess: "familymember",
  },
  {
    type: "industry",
    label: "产业项目",
    icon: "🏭",
    description: "导入产业项目信息，包含名称、规模、效益等",
    tableName: "Industry",
    fields: [
      { field: "name", label: "项目名称", required: true, keywords: ["名称", "项目", "项目名称", "产业"] },
      { field: "description", label: "项目描述", keywords: ["描述", "简介", "项目描述"] },
      { field: "detail", label: "详细说明", keywords: ["详情", "详细", "说明"] },
      { field: "status", label: "项目状态", keywords: ["状态", "项目状态"] },
      { field: "scale", label: "规模", keywords: ["规模", "产业规模"] },
      { field: "benefit", label: "效益", keywords: ["效益", "收益", "经济效益"] },
      { field: "startDate", label: "启动日期", keywords: ["启动", "日期", "开始日期", "启动日期"] },
      { field: "notes", label: "备注", keywords: ["备注", "说明"] },
    ],
    preprocess: "industry",
  },
  {
    type: "partymember",
    label: "党员信息",
    icon: "🎖️",
    description: "导入党员名册，包含入党日期、学历、联系方式等",
    tableName: "PartyMember",
    fields: [
      { field: "name", label: "姓名", required: true, keywords: ["姓名", "名字", "党员姓名"] },
      { field: "gender", label: "性别", keywords: ["性别"] },
      { field: "idCard", label: "身份证号", keywords: ["身份证", "身份证号"] },
      { field: "ethnicity", label: "民族", keywords: ["民族", "族别"] },
      { field: "education", label: "学历", keywords: ["学历", "文化程度", "教育"] },
      { field: "joinDate", label: "入党日期", keywords: ["入党", "入党日期", "入党时间"] },
      { field: "phone", label: "电话", keywords: ["电话", "手机", "联系电话"] },
      { field: "address", label: "地址", keywords: ["地址", "家庭地址", "住址"] },
      { field: "note", label: "备注", keywords: ["备注", "说明"] },
    ],
    preprocess: "partymember",
  },
];

export function getImportType(type: string): ImportType | undefined {
  return IMPORT_TYPES.find((t) => t.type === type);
}

// AI 列名建议：根据 Excel 列标题匹配数据库字段
export function suggestMappings(
  importType: ImportType,
  headers: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    const hLower = h.toLowerCase().replace(/\s/g, "");
    for (const field of importType.fields) {
      const keywords = field.keywords || [];
      if (keywords.some((kw) => hLower.includes(kw.toLowerCase()))) {
        result[h] = field.field;
        break;
      }
    }
  }
  return result;
}
