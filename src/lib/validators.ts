// ========== 数据校验规则库 ==========
// 原则：所有字段均可为空（农村场景适配）
//       但填写了就必须符合格式

// ---- 禁止字符 ----
// 姓名：只允许中文字符和中间点（如"阿卜杜·萨拉姆"）
const NAME_RE = /[^一-龥·]/;
// 地名：只允许中文/英文/数字/括号/横线
const PLACE_RE = /[^一-龥a-zA-Z0-9()—―\-]/;

// ---- 字符串清理 ----
export const clean = {
  name: (v: string | null | undefined) => (!v ? null : v.replace(/[，,]+/g, "").replace(/[^一-龥·]/g, "").trim() || null),
  phone: (v: string | null | undefined) => (!v ? null : v.replace(/[\s\-\(\)\+，,、]/g, "").trim() || null),
  text: (v: string | null | undefined) => (!v ? null : v.trim() || null),
  placeName: (v: string | null | undefined) => (!v ? null : v.replace(/[^一-龥a-zA-Z0-9()（）\-]/g, "").trim() || null),
};

// ---- 格式校验（返回 null=通过, 字符串=错误信息） ----
export const check = {
  phone: (v: string | null | undefined): string | null => {
    if (!v) return null;
    return /^1[3-9]\d{9}$/.test(v) ? null : "手机号应为11位数字，1开头";
  },
  idCard: (v: string | null | undefined): string | null => {
    if (!v) return null;
    return /^\d{17}[\dX]$/.test(v.toUpperCase()) ? null : "身份证号应为18位（末位可为X）";
  },
  gender: (v: string | null | undefined): string | null => {
    if (!v) return null;
    return ["男", "女"].includes(v) ? null : '性别只能为男或女';
  },
  personName: (v: string | null | undefined, label: string): string | null => {
    if (!v) return null;
    if (NAME_RE.test(v)) return label + "只能包含中文";
    if (v.length > 20) return label + "不能超过20个字符";
    return null;
  },
  placeName: (v: string | null | undefined, label: string): string | null => {
    if (!v) return null;
    if (PLACE_RE.test(v)) return label + "不能包含特殊符号";
    if (v.length > 50) return label + "不能超过50个字符";
    return null;
  },
  /** 农户属性互斥校验 */
  familyAttrExclusive: (v: string | null | undefined): string | null => {
    if (!v) return null;
    const tags = v.split(",").map(s => s.trim()).filter(Boolean);
    const hasNormal = tags.includes("一般农户");
    const hasPoor = tags.includes("脱贫户");
    const hasMonitor = tags.includes("监测户");
    if (hasNormal && hasPoor) return "一般农户与脱贫户不能同时选择";
    if (hasNormal && hasMonitor) return "一般农户与监测户不能同时选择";
    if (hasPoor && hasMonitor) return "脱贫户与监测户不能同时选择";
    return null;
  },

  nonNegativeInt: (v: any, label: string): string | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (isNaN(n)) return label + "请输入数字";
    if (!Number.isInteger(n)) return label + "请输入整数";
    if (n < 0) return label + "不能为负数";
    return null;
  },
  nonNegativeFloat: (v: any, label: string): string | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (isNaN(n)) return label + "请输入数字";
    if (n < 0) return label + "不能为负数";
    return null;
  },
};

// ---- 批量校验 ----
export function validate(rules: (string | null)[]): string | null {
  for (const r of rules) { if (r) return r; }
  return null;
}

// ---- 各模型校验规则 ----
export const rules = {
  family: (body: any) => validate([
    check.personName(body.headName, "户主姓名"),
    check.familyAttrExclusive(body.familyAttr),
    check.phone(clean.phone(body.headPhone)) ? "手机号" + check.phone(clean.phone(body.headPhone))! : null,
    check.idCard(body.headIdCard) ? "身份证号" + check.idCard(body.headIdCard)! : null,
    check.gender(body.headGender) ? "性别" + check.gender(body.headGender)! : null,
    check.phone(clean.phone(body.spousePhone)) ? "配偶手机号" + check.phone(clean.phone(body.spousePhone))! : null,
    check.idCard(body.spouseIdCard) ? "配偶身份证" + check.idCard(body.spouseIdCard)! : null,
    check.nonNegativeInt(body.population, "人口"),
    check.nonNegativeFloat(body.income, "年收入"),
    check.nonNegativeFloat(body.latitude, "纬度"),
    check.nonNegativeFloat(body.longitude, "经度"),
  ]),

  familyMember: (body: any) => validate([
    check.personName(body.name, "姓名"),
    check.phone(clean.phone(body.phone)) ? "电话" + check.phone(clean.phone(body.phone))! : null,
    check.idCard(body.idCard) ? "身份证" + check.idCard(body.idCard)! : null,
    check.gender(body.gender) ? "性别" + check.gender(body.gender)! : null,
  ]),

  villageProfile: (body: any) => {
    const intFields: Record<string, string> = {
      residentHouseholds: "常住户数", residentPopulation: "常住人口",
      laborForce: "劳动力人数", relocatedHouseholds: "异地搬迁户户数",
      relocatedPopulation: "异地搬迁户人数", severeIllness: "重病人数",
      elderlyCount: "高龄老人数", partyMembers: "党员人数",
    };
    const floatFields: Record<string, string> = {
      administrativeArea: "行政面积", cultivatedLand: "耕地面积",
      villageIncome: "村集体收入", operatingIncome: "经营性收入",
    };
    const rs: (string | null)[] = [];
    if (body.villageSecretary) rs.push(check.personName(body.villageSecretary, "村书记姓名"));
    if (body.fillPerson) rs.push(check.personName(body.fillPerson, "填报人"));
    if (body.secretaryPhone) { const p = clean.phone(body.secretaryPhone); rs.push(check.phone(p) ? "村书记电话" + check.phone(p)! : null); }
    if (body.fillPersonPhone) { const p = clean.phone(body.fillPersonPhone); rs.push(check.phone(p) ? "填报人电话" + check.phone(p)! : null); }
    for (const [k, label] of Object.entries(intFields)) {
      if (body[k] !== undefined) rs.push(check.nonNegativeInt(body[k], label));
    }
    for (const [k, label] of Object.entries(floatFields)) {
      if (body[k] !== undefined) rs.push(check.nonNegativeFloat(body[k], label));
    }
    return validate(rs);
  },

  settings: (body: Record<string, string>) => {
    const rs: (string | null)[] = [];
    if (body.teamName) rs.push(check.personName(body.teamName, "工作队名称"));
    if (body.villageName) rs.push(check.placeName(body.villageName, "帮扶村名"));
    if (body.township) rs.push(check.placeName(body.township, "所属乡镇"));
    if (body.villageSecretary) rs.push(check.personName(body.villageSecretary, "村书记姓名"));
    if (body.shortName) rs.push(check.placeName(body.shortName, "简称"));
    if (body.secretaryPhone) { const p = clean.phone(body.secretaryPhone); rs.push(check.phone(p) ? "村书记电话" + check.phone(p)! : null); }
    if (body.contactPhone) { const p = clean.phone(body.contactPhone); rs.push(check.phone(p) ? "联系电话" + check.phone(p)! : null); }
    return validate(rs);
  },

  user: (body: any) => validate([
    body.name ? check.personName(body.name, "姓名") : null,
    body.phone && body.phone !== "admin" ? check.phone(clean.phone(body.phone)) ? "手机号" + check.phone(clean.phone(body.phone))! : null : null,
  ]),

  partyMember: (body: any) => validate([
    check.personName(body.name, "姓名"),
    check.phone(clean.phone(body.phone)) ? "电话" + check.phone(clean.phone(body.phone))! : null,
    check.idCard(body.idCard) ? "身份证" + check.idCard(body.idCard)! : null,
    check.gender(body.gender) ? "性别" + check.gender(body.gender)! : null,
  ]),

  publicService: (body: any) => validate([
    check.personName(body.name, "姓名"),
    check.phone(clean.phone(body.phone)) ? "电话" + check.phone(clean.phone(body.phone))! : null,
  ]),
};
