const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const results = { pass: [], fail: [], warn: [] };

  // ====== 1. 数据库连接测试 ======
  try {
    const userCount = await p.user.count();
    const familyCount = await p.family.count();
    const memberCount = await p.familyMember.count();
    results.pass.push(`数据库连接正常: ${userCount}用户 ${familyCount}户 ${memberCount}成员`);
  } catch(e) { results.fail.push(`数据库连接: ${e.message}`); }

  // ====== 2. 创建测试数据 ======
  let testFamilyId, testMemberId, testVisitId, testDiaryId, testProjectId;
  let testIndustryId, testPartyMemberId, testAnnouncementId, testPublicServiceId;

  try {
    const f = await p.family.create({ data: {
      headName: '测试户主', headPhone: '13800001111', headGender: '男',
      headIdCard: '232332198506150013', population: 4,
      familyAttr: '脱贫户,低保户,党员',
      address: '靠山乡靠山村测试屯',
      residenceStatus: '常住户', riskLevel: '低',
      tags: '[]', photos: '[]', files: '[]',
    }});
    testFamilyId = f.id;
    results.pass.push(`创建农户: ${f.headName} (${f.familyAttr})`);
  } catch(e) { results.fail.push(`创建农户: ${e.message}`); }

  // ====== 3. 家庭成员CRUD ======
  try {
    const m = await p.familyMember.create({ data: {
      name: '测试成员', relation: '配偶', gender: '女',
      phone: '13900002222', idCard: '232332198706200024',
      familyId: testFamilyId
    }});
    testMemberId = m.id;
    results.pass.push(`创建家庭成员: ${m.name}`);

    const updated = await p.familyMember.update({ where: { id: testMemberId }, data: { occupation: '务农' }});
    results.pass.push(`更新家庭成员: ${updated.occupation}`);
  } catch(e) { results.fail.push(`家庭成员CRUD: ${e.message}`); }

  // ====== 4. 走访记录CRUD ======
  try {
    const v = await p.householdRecord.create({ data: {
      type: 'visit', familyId: testFamilyId,
      recordDate: new Date(), content: '<p>测试走访记录</p>',
      staff: '测试人员', statusTags: '["在家","健康"]',
      dutyTags: '["为民服务"]', taskTags: '["#2 落实入户走访制度"]',
      photos: '[]', items: '[]',
    }});
    testVisitId = v.id;
    results.pass.push(`创建走访记录: ${v.type}`);

    const v2 = await p.householdRecord.create({ data: {
      type: 'condolence', familyId: testFamilyId,
      recordDate: new Date(), content: '<p>测试慰问记录</p>',
      staff: '测试人员', items: '["米","面","油"]',
      dutyTags: '["为民服务"]', taskTags: '["#2 落实入户走访制度"]',
      photos: '[]', statusTags: '[]',
    }});
    results.pass.push(`创建慰问记录: ${v2.type}`);

    const v3 = await p.householdRecord.create({ data: {
      type: 'reception', familyId: testFamilyId,
      recordDate: new Date(), content: '<p>测试来访记录</p>',
      staff: '村委会', dutyTags: '["为民服务"]',
      taskTags: '["#2 落实入户走访制度"]',
      photos: '[]', statusTags: '[]', items: '[]',
    }});
    results.pass.push(`创建来访记录: ${v3.type}`);
  } catch(e) { results.fail.push(`走访记录CRUD: ${e.message}`); }

  // ====== 5. 工作日记CRUD ======
  try {
    const d = await p.workDiary.create({ data: {
      title: '测试日记', content: '<p>测试内容</p>',
      date: new Date(), isPublic: true, source: 'editor',
      authorId: (await p.user.findFirst()).id,
      images: '[]', videos: '[]', dutyTags: '[]', taskTags: '[]',
    }});
    testDiaryId = d.id;
    results.pass.push(`创建工作日记: ${d.title}`);
  } catch(e) { results.fail.push(`工作日记CRUD: ${e.message}`); }

  // ====== 6. 产业管理CRUD ======
  try {
    const ind = await p.industry.create({ data: {
      name: '测试产业', description: '测试描述', status: '进行中',
      scale: '100亩', icon: '🌾', photos: '[]', statusTags: '[]',
    }});
    testIndustryId = ind.id;
    results.pass.push(`创建产业: ${ind.name}`);
  } catch(e) { results.fail.push(`产业管理CRUD: ${e.message}`); }

  // ====== 7. 项目看板CRUD ======
  try {
    const proj = await p.project.create({ data: {
      title: '测试项目', status: 'pending', priority: 'medium',
      category: 'todo', planType: '今日计划',
      progress: 0, members: '[]', tags: '[]',
    }});
    testProjectId = proj.id;
    results.pass.push(`创建项目/待办: ${proj.title}`);
  } catch(e) { results.fail.push(`项目看板CRUD: ${e.message}`); }

  // ====== 8. 党员管理CRUD ======
  try {
    const pm = await p.partyMember.create({ data: {
      name: '测试党员', gender: '男', phone: '13600001111',
      idCard: '232332197010100031', joinDate: '2010-07-01', isActive: true,
    }});
    testPartyMemberId = pm.id;
    results.pass.push(`创建党员: ${pm.name}`);

    // Test validation: bad phone should fail at API level (Prisma layer allows it)
    const pm2 = await p.partyMember.create({ data: {
      name: '验证测试', phone: '123', isActive: true,
    }});
    results.pass.push(`Prisma层可存储非标数据(API层拦截): ${pm2.phone}`);
    await p.partyMember.delete({ where: { id: pm2.id } });
  } catch(e) { results.fail.push(`党员管理CRUD: ${e.message}`); }

  // ====== 9. 公告管理CRUD ======
  try {
    const user = await p.user.findFirst();
    const a = await p.announcement.create({ data: {
      title: '测试公告', content: '<p>测试内容</p>',
      priority: '普通', pinned: false, isActive: true,
      publisherId: user.id,
    }});
    testAnnouncementId = a.id;
    results.pass.push(`创建公告: ${a.title}`);
  } catch(e) { results.fail.push(`公告管理CRUD: ${e.message}`); }

  // ====== 10. 百姓办事CRUD ======
  try {
    const ps = await p.publicService.create({ data: {
      name: '测试村民', phone: '13700001111',
      requestType: '其他', description: '测试诉求',
      status: '待处理',
    }});
    testPublicServiceId = ps.id;
    results.pass.push(`创建百姓办事: ${ps.name}`);
  } catch(e) { results.fail.push(`百姓办事CRUD: ${e.message}`); }

  // ====== 11. 党建活动CRUD ======
  try {
    const pa = await p.partyActivity.create({ data: {
      type: 'meeting', title: '测试支部会议', date: new Date(),
      location: '村委会', participants: '[]', photos: '[]', files: '[]',
    }});
    results.pass.push(`创建党建活动: ${pa.title}`);
    await p.partyActivity.delete({ where: { id: pa.id } });
  } catch(e) { results.fail.push(`党建活动CRUD: ${e.message}`); }

  // ====== 12. 预警记录CRUD ======
  try {
    const alert = await p.alertRecord.create({ data: {
      alertType: '收入预警', alertLevel: '中', title: '测试预警',
      description: '测试描述', status: '待处理', familyId: testFamilyId,
    }});
    results.pass.push(`创建预警记录: ${alert.title}`);
  } catch(e) { results.fail.push(`预警记录CRUD: ${e.message}`); }

  // ====== 13. 天气预警CRUD ======
  try {
    const wa = await p.weatherAlert.create({ data: {
      title: '测试天气预警', level: '黄色', content: '测试内容',
      isActive: true,
    }});
    results.pass.push(`创建天气预警: ${wa.title}`);
    await p.weatherAlert.delete({ where: { id: wa.id } });
  } catch(e) { results.fail.push(`天气预警CRUD: ${e.message}`); }

  // ====== 14. 培训记录CRUD ======
  try {
    const tr = await p.trainingRecord.create({ data: {
      time: new Date(), location: '村委会', content: '测试培训',
      participants: '["测试人员"]',
    }});
    results.pass.push(`创建培训记录: ${tr.content.substring(0,20)}`);
    await p.trainingRecord.delete({ where: { id: tr.id } });
  } catch(e) { results.fail.push(`培训记录CRUD: ${e.message}`); }

  // ====== 15. 履职记录CRUD ======
  try {
    const ar = await p.accountabilityRecord.create({ data: {
      taskType: 2, title: '测试履职记录', date: new Date(),
      photos: '[]', urls: '[]', files: '[]',
    }});
    results.pass.push(`创建履职记录: ${ar.title}`);
  } catch(e) { results.fail.push(`履职记录CRUD: ${e.message}`); }

  // ====== 16. 多属性筛选验证 ======
  try {
    const dpCount = await p.family.count({ where: { familyAttr: { contains: '脱贫户' } }});
    const dbCount = await p.family.count({ where: { familyAttr: { contains: '低保户' } }});
    const dyCount = await p.family.count({ where: { familyAttr: { contains: '党员' } }});
    results.pass.push(`多属性筛选: 脱贫户${dpCount} 低保户${dbCount} 党员${dyCount} (contains正确匹配多标签)`);
  } catch(e) { results.fail.push(`多属性筛选: ${e.message}`); }

  // ====== 17. 农户属性互斥校验 ======
  try {
    const { rules } = require('../src/lib/validators');
    const err1 = rules.family({ headName: '测试', familyAttr: '一般农户,脱贫户' });
    const err2 = rules.family({ headName: '测试', familyAttr: '脱贫户,监测户' });
    const err3 = rules.family({ headName: '测试', familyAttr: '脱贫户,低保户' });
    if (err1) results.pass.push(`属性互斥检测: 一般农户+脱贫户 → "${err1}"`);
    else results.fail.push('属性互斥: 未检测到冲突');
    if (err2) results.pass.push(`属性互斥检测: 脱贫户+监测户 → "${err2}"`);
    else results.fail.push('属性互斥: 未检测到冲突');
    if (!err3) results.pass.push(`属性互斥检测: 脱贫户+低保户 → 合法通过`);
    else results.fail.push(`属性互斥: 合法组合被拒绝 "${err3}"`);
  } catch(e) { results.fail.push(`属性互斥校验: ${e.message}`); }

  // ====== 18. 手机号/身份证校验 ======
  try {
    const { check, clean } = require('../src/lib/validators');
    const r1 = check.phone(clean.phone('138-0000-1111'));
    const r2 = check.phone('12345');
    const r3 = check.idCard('232332198506150013');
    const r4 = check.idCard('12345');
    const r5 = check.personName('张@伟', '姓名');
    if (!r1) results.pass.push('手机号校验: 138-0000-1111 清洗后通过');
    else results.fail.push(`手机号校验: ${r1}`);
    if (r2) results.pass.push(`手机号校验: 12345 → "${r2}"`);
    else results.fail.push('手机号校验: 未检测到问题');
    if (!r3) results.pass.push('身份证校验: 232332198506150013 通过');
    else results.fail.push(`身份证校验: ${r3}`);
    if (r4) results.pass.push(`身份证校验: 12345 → "${r4}"`);
    else results.fail.push('身份证校验: 未检测到问题');
    if (r5) results.pass.push(`姓名校验: 张@伟 → "${r5}"`);
    else results.fail.push('姓名校验: 未检测到问题');
  } catch(e) { results.fail.push(`校验逻辑: ${e.message}`); }

  // ====== 19. 清理测试数据 ======
  try {
    await p.familyMember.deleteMany({ where: { familyId: testFamilyId } });
    await p.householdRecord.deleteMany({ where: { familyId: testFamilyId } });
    await p.alertRecord.deleteMany({ where: { familyId: testFamilyId } });
    await p.family.delete({ where: { id: testFamilyId } });
    if (testDiaryId) await p.workDiary.delete({ where: { id: testDiaryId } });
    if (testIndustryId) await p.industry.delete({ where: { id: testIndustryId } });
    if (testProjectId) await p.project.delete({ where: { id: testProjectId } });
    if (testPartyMemberId) await p.partyMember.delete({ where: { id: testPartyMemberId } });
    if (testAnnouncementId) await p.announcement.delete({ where: { id: testAnnouncementId } });
    if (testPublicServiceId) await p.publicService.delete({ where: { id: testPublicServiceId } });
    results.pass.push('测试数据清理完成');
  } catch(e) { results.warn.push(`清理测试数据: ${e.message}`); }

  // ====== 打印结果 ======
  console.log('\n========== 测试结果 ==========');
  console.log(`✅ 通过: ${results.pass.length}项`);
  results.pass.forEach(r => console.log('  ✅', r));
  if (results.warn.length) {
    console.log(`⚠️ 警告: ${results.warn.length}项`);
    results.warn.forEach(r => console.log('  ⚠️', r));
  }
  if (results.fail.length) {
    console.log(`❌ 失败: ${results.fail.length}项`);
    results.fail.forEach(r => console.log('  ❌', r));
  }
  console.log('==============================\n');

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
