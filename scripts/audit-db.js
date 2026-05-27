const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log('═══════════════════════════════════════');
  console.log('  数据库逻辑关系全面审计');
  console.log('═══════════════════════════════════════\n');

  // 【1】外键完整性
  console.log('【1】外键完整性');
  let fkErrors = 0;

  // Visit.familyId / Visit.visitorId
  const visits = await prisma.visit.findMany({ select: { id: true, familyId: true, visitorId: true } });
  for (const v of visits) {
    const fam = await prisma.family.findUnique({ where: { id: v.familyId } });
    if (!fam) { console.log('  ❌ Visit ' + v.id + ' → 不存在的 Family ' + v.familyId); fkErrors++; }
    const usr = await prisma.user.findUnique({ where: { id: v.visitorId } });
    if (!usr) { console.log('  ❌ Visit ' + v.id + ' → 不存在的 User ' + v.visitorId); fkErrors++; }
  }

  // Condolence.familyId
  const condolences = await prisma.condolence.findMany({ select: { id: true, familyId: true } });
  for (const c of condolences) {
    const fam = await prisma.family.findUnique({ where: { id: c.familyId } });
    if (!fam) { console.log('  ❌ Condolence ' + c.id + ' → 不存在的 Family ' + c.familyId); fkErrors++; }
  }

  // HouseholdRecord.familyId
  const records = await prisma.householdRecord.findMany({ select: { id: true, familyId: true } });
  for (const r of records) {
    const fam = await prisma.family.findUnique({ where: { id: r.familyId } });
    if (!fam) { console.log('  ❌ Record ' + r.id + ' → 不存在的 Family ' + r.familyId); fkErrors++; }
  }

  // FamilyMember.familyId
  const members = await prisma.familyMember.findMany({ select: { id: true, familyId: true } });
  for (const m of members) {
    const fam = await prisma.family.findUnique({ where: { id: m.familyId } });
    if (!fam) { console.log('  ❌ FamilyMember ' + m.id + ' → 不存在的 Family ' + m.familyId); fkErrors++; }
  }

  // Family.groupId
  const families = await prisma.family.findMany({ select: { id: true, headName: true, groupId: true } });
  for (const f of families) {
    if (f.groupId) {
      const grp = await prisma.villageGroup.findUnique({ where: { id: f.groupId } });
      if (!grp) { console.log('  ❌ Family ' + f.id + ' (' + f.headName + ') → 不存在的 Group ' + f.groupId); fkErrors++; }
    }
  }

  // WorkDiary.authorId
  const diaries = await prisma.workDiary.findMany({ select: { id: true, authorId: true } });
  for (const d of diaries) {
    const usr = await prisma.user.findUnique({ where: { id: d.authorId } });
    if (!usr) { console.log('  ❌ Diary ' + d.id + ' → 不存在的 User ' + d.authorId); fkErrors++; }
  }

  // AlertRecord.familyId
  const alerts = await prisma.alertRecord.findMany({ where: { familyId: { not: null } }, select: { id: true, familyId: true } });
  for (const a of alerts) {
    const fam = await prisma.family.findUnique({ where: { id: a.familyId } });
    if (!fam) { console.log('  ❌ Alert ' + a.id + ' → 不存在的 Family ' + a.familyId); fkErrors++; }
  }

  // Project/Industry createdById
  const projects = await prisma.project.findMany({ where: { createdById: { not: null } }, select: { id: true, createdById: true } });
  for (const p of projects) {
    if (p.createdById) {
      const usr = await prisma.user.findUnique({ where: { id: p.createdById } });
      if (!usr) { console.log('  ❌ Project ' + p.id + ' → 不存在的 User ' + p.createdById); fkErrors++; }
    }
  }

  if (fkErrors === 0) console.log('  ✅ 外键完整性全部通过\n');

  // 【2】逻辑矛盾
  console.log('【2】逻辑矛盾');
  let logicIssues = 0;
  const allFamilies = await prisma.family.findMany();
  for (const f of allFamilies) {
    if (f.population <= 0 && f.familyAttr && f.familyAttr !== '一般农户') {
      console.log('  ⚠️ ' + f.headName + ': 人口=' + f.population + ' 但标注为 ' + f.familyAttr);
      logicIssues++;
    }
    if (!f.headName || !f.headName.trim()) {
      console.log('  ❌ Family ' + f.id + ': headName 为空');
      logicIssues++;
    }
  }
  if (logicIssues === 0) console.log('  ✅ 无逻辑矛盾\n');

  // 【3】必填字段
  console.log('【3】必填字段为空');
  const requiredIssues = [];
  const emptyName = await prisma.family.count({ where: { headName: '' } });
  if (emptyName > 0) requiredIssues.push(emptyName + ' 条 Family headName 为空字符串');
  const visitEmpty = await prisma.visit.count({ where: { content: '' } });
  if (visitEmpty > 0) requiredIssues.push(visitEmpty + ' 条 Visit content 为空');
  const diaryEmpty = await prisma.workDiary.count({ where: { title: '' } });
  if (diaryEmpty > 0) requiredIssues.push(diaryEmpty + ' 条 Diary title 为空');
  if (requiredIssues.length === 0) console.log('  ✅ 必填字段全部正常\n');
  else requiredIssues.forEach(i => console.log('  ⚠️ ' + i));

  // 【4】日期合理性
  console.log('【4】日期合理性');
  const now = new Date();
  const futureVisits = await prisma.visit.count({ where: { visitDate: { gt: now } } });
  const futureRecords = await prisma.householdRecord.count({ where: { recordDate: { gt: now } } });
  const futureDiaries = await prisma.workDiary.count({ where: { date: { gt: now } } });
  const futureCondolences = await prisma.condolence.count({ where: { condolenceDate: { gt: now } } });
  if (futureVisits > 0) console.log('  ⚠️ ' + futureVisits + ' 条 Visit 日期在未来');
  if (futureRecords > 0) console.log('  ⚠️ ' + futureRecords + ' 条 Record 日期在未来');
  if (futureDiaries > 0) console.log('  ⚠️ ' + futureDiaries + ' 条 Diary 日期在未来');
  if (futureCondolences > 0) console.log('  ⚠️ ' + futureCondolences + ' 条 Condolence 日期在未来');
  if (futureVisits + futureRecords + futureDiaries + futureCondolences === 0) console.log('  ✅ 日期全部合理\n');

  // 【5】JSON 格式
  console.log('【5】JSON 字段格式');
  const jsonCheck = await prisma.family.findMany({ select: { id: true, headName: true, photos: true, files: true, tags: true } });
  let jsonErrors = 0;
  for (const f of jsonCheck) {
    try { JSON.parse(f.photos); } catch { console.log('  ❌ ' + f.headName + ' photos 格式错误'); jsonErrors++; }
    try { if (f.files && f.files !== '[]') JSON.parse(f.files); } catch { if (f.files) { console.log('  ❌ ' + f.headName + ' files 格式错误'); jsonErrors++; } }
    try { if (f.tags && f.tags !== '[]') JSON.parse(f.tags); } catch { if (f.tags) { console.log('  ❌ ' + f.headName + ' tags 格式错误'); jsonErrors++; } }
  }
  if (jsonErrors === 0) console.log('  ✅ JSON 格式全部正常\n');

  // 【6】统计汇总
  console.log('【6】数据统计汇总');
  console.log('  Family:       ' + allFamilies.length + ' 户');
  console.log('  FamilyMember: ' + await prisma.familyMember.count() + ' 人');
  console.log('  Visit:        ' + await prisma.visit.count() + ' 条');
  console.log('  Condolence:   ' + await prisma.condolence.count() + ' 条');
  console.log('  HouseholdRecord: ' + await prisma.householdRecord.count() + ' 条');
  console.log('  WorkDiary:    ' + await prisma.workDiary.count() + ' 条');
  console.log('  Project:      ' + await prisma.project.count() + ' 个');
  console.log('  Industry:     ' + await prisma.industry.count() + ' 个');
  console.log('  User:         ' + await prisma.user.count() + ' 人');
  console.log('  PartyMember:  ' + await prisma.partyMember.count() + ' 人');
  console.log('  PublicService:' + await prisma.publicService.count() + ' 条');
  console.log('  VillageProfile:' + await prisma.villageProfile.count() + ' 条');
  console.log('  VillageGroup: ' + await prisma.villageGroup.count() + ' 个');
  console.log('  AlertRecord:  ' + await prisma.alertRecord.count() + ' 条');
  console.log('');

  console.log('═══════════════════════════════════════');
  console.log('  审计完成: ' + fkErrors + ' 个外键错误, ' + logicIssues + ' 个逻辑矛盾, ' + jsonErrors + ' 个 JSON 错误');
  console.log('═══════════════════════════════════════');

  await prisma.$disconnect();
}
audit().catch(e => { console.error(e.message); process.exit(1); });
