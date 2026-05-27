# 驻村帮扶管理系统 — 数据字典 (依据 JGJ/T 320-2014 标准体系)

## 数据约束符号

| 符号 | 含义 |
|------|------|
| **M** | 必选 (Mandatory) — 不可为空 |
| **C** | 条件可选 (Conditional) — 满足条件时必填 |
| **O** | 可选 (Optional) — 可为空 |

---

## 一、Family (农户) 表

| 字段 | 类型 | 约束 | 格式/校验 | 说明 |
|------|------|------|-----------|------|
| headName | String | **M** | 2-20 字符，trim | 户主姓名 |
| headGender | String | **M** | 枚举: 男/女 | 户主性别 |
| headIdCard | String | **C** | 18 位数字，末位可为 X | 户主身份证 |
| headPhone | String | **M** | 11 位数字，1 开头 | 户主手机号 |
| spouseName | String | O | 2-20 字符，trim | 配偶姓名 |
| spousePhone | String | O | 11 位数字，1 开头 | 配偶手机号 |
| spouseIdCard | String | O | 18 位数字，末位可为 X | 配偶身份证 |
| population | Int | **M** | ≥0，整数 | 家庭人口数 |
| familyAttr | String | O | 逗号分隔枚举值 | 家庭属性标签 |
| address | String | O | max 200 字符 | 居住地址 |
| income | Float | O | ≥0，一位小数 | 年人均收入(元) |
| notes | String | O | max 2000 字符 | 备注 |

## 二、VillageProfile (村情概况) 表

| 字段 | 类型 | 约束 | 格式 | 说明 |
|------|------|------|------|------|
| administrativeArea | Float | O | ≥0，一位小数 | 行政面积(公顷) |
| cultivatedLand | Float | O | ≥0，一位小数 | 耕地面积(亩) |
| villageIncome | Float | O | ≥0，一位小数 | 村集体收入(万元) |
| operatingIncome | Float | O | ≥0，一位小数 | 经营性收入(万元) |
| residentHouseholds | Int | O | ≥0，整数 | 常住户数 |
| residentPopulation | Int | O | ≥0，整数 | 常住人口 |
| laborForce | Int | O | ≥0，整数 | 劳动力人数 |
| relocatedHouseholds | Int | O | ≥0，整数 | 异地搬迁户户数 |
| relocatedPopulation | Int | O | ≥0，整数 | 异地搬迁户人数 |
| severeIllness | Int | O | ≥0，整数 | 重病人数 |
| elderlyCount | Int | O | ≥0，整数 | 高龄老人数 |
| partyMembers | Int | O | ≥0，整数 | 党员人数 |
| secretaryPhone | String | O | 11 位数字 | 村书记电话 |
| fillPersonPhone | String | O | 11 位数字 | 填报人电话 |

## 三、User (用户) 表

| 字段 | 类型 | 约束 | 格式 | 说明 |
|------|------|------|------|------|
| name | String | **M** | 2-20 字符，trim | 用户姓名 |
| phone | String | **M** | 11 位数字，唯一 | 登录手机号 |
| role | String | **M** | 枚举: superadmin/admin/member | 角色 |

## 四、FamilyMember (家庭成员) 表

| 字段 | 类型 | 约束 | 格式 | 说明 |
|------|------|------|------|------|
| name | String | **M** | 2-20 字符 | 成员姓名 |
| relation | String | **M** | 枚举: 配偶/子女/父母/其他 | 与户主关系 |
| gender | String | O | 枚举: 男/女 | 性别 |
| idCard | String | O | 18 位 | 身份证号 |
| phone | String | O | 11 位数字 | 手机号 |
| birthDate | DateTime | O | YYYY-MM-DD | 出生日期 |

## 五、通用字符串约束

| 规则 | 说明 |
|------|------|
| Trim | 所有文本字段前后去空格 |
| 空字符串 → null | 提交时将空字符串转为 null |
| 负数 → 拒绝 | 所有数值字段不接受负数 |

## 六、枚举值代码表

| 字段 | 有效值 |
|------|--------|
| gender | 男、女 |
| familyAttr | 一般农户、脱贫户、监测户、低保户、五保户（支持逗号组合） |
| role | superadmin、admin、member |
| Visit.type | visit、condolence、reception |
| relation | 配偶、子女、父母、其他 |
