const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始初始化数据...\n");

  // 1. 创建默认管理员
  const adminExists = await prisma.user.findFirst({ where: { phone: "admin" } });
  let admin;
  if (!adminExists) {
    admin = await prisma.user.create({
      data: {
        name: "系统管理员",
        phone: "admin",
        hashedPassword: bcrypt.hashSync("admin123", 12),
        role: "admin",
      },
    });
    console.log("✓ 默认管理员已创建: admin / admin123");
  } else {
    admin = adminExists;
    console.log("→ 管理员已存在，跳过");
  }

  // 2. 创建村情概况
  const profileExists = await prisma.villageProfile.findFirst();
  if (!profileExists) {
    await prisma.villageProfile.create({
      data: {
        administrativeArea: 1850,
        cultivatedLand: 3200,
        registeredHouseholds: 520,
        registeredPopulation: 1850,
        residentHouseholds: 420,
        residentPopulation: 1520,
        partyMembers: 45,
        laborForce: 680,
        villageIncome: 25.5,
        operatingIncome: 12.3,
        wubaoHouseholds: 5,
        severeIllness: 12,
        elderlyCount: 180,
        poorHouseholds: 85,
        monitoredHouseholds: 15,
        dibaoHouseholds: 32,
        relocatedHouseholds: 0,
        relocatedPopulation: 0,
        villageSecretary: "张建国",
        secretaryPhone: "13912345678",
        fillPerson: "工作队",
        fillDate: new Date(),
      },
    });
    console.log("✓ 村情概况已创建");
  } else {
    console.log("→ 村情概况已存在，跳过");
  }

  // 3. 创建自然屯
  const groupCount = await prisma.villageGroup.count();
  if (groupCount === 0) {
    const groups = await Promise.all([
      prisma.villageGroup.create({ data: { name: "靠山屯", type: "tun", sortOrder: 1 } }),
      prisma.villageGroup.create({ data: { name: "孙家屯", type: "tun", sortOrder: 2 } }),
      prisma.villageGroup.create({ data: { name: "新立屯", type: "tun", sortOrder: 3 } }),
    ]);
    console.log("✓ 3个自然屯已创建");

    // 4. 创建示例户（不同类型各2户，共10户）
    const sampleFamilies = [
      { headName: "王建国", headPhone: "13900001001", population: 4, familyAttr: "脱贫户", address: "靠山屯一组", riskLevel: "低" },
      { headName: "李秀英", headPhone: "13900001002", population: 2, familyAttr: "脱贫户", address: "靠山屯二组", riskLevel: "低" },
      { headName: "张德福", headPhone: "13900001003", population: 5, familyAttr: "监测户", address: "孙家屯一组", riskLevel: "中" },
      { headName: "刘桂花", headPhone: "13900001004", population: 3, familyAttr: "监测户", address: "孙家屯二组", riskLevel: "高" },
      { headName: "赵永强", headPhone: "13900001005", population: 4, familyAttr: "一般农户", address: "新立屯一组", riskLevel: "低" },
      { headName: "陈建国", headPhone: "13900001006", population: 3, familyAttr: "一般农户", address: "新立屯二组", riskLevel: "低" },
      { headName: "孙桂兰", headPhone: "13900001007", population: 1, familyAttr: "低保户", address: "靠山屯三组", riskLevel: "中" },
      { headName: "周文斌", headPhone: "13900001008", population: 2, familyAttr: "低保户", address: "孙家屯三组", riskLevel: "中" },
      { headName: "吴老汉", headPhone: "13900001009", population: 1, familyAttr: "五保户", address: "靠山屯一组", riskLevel: "高" },
      { headName: "郑国华", headPhone: "13900001010", population: 6, familyAttr: "脱贫户", address: "新立屯三组", riskLevel: "低" },
    ];

    for (let i = 0; i < sampleFamilies.length; i++) {
      const f = sampleFamilies[i];
      const groupId = groups[i % 3].id;
      await prisma.family.create({
        data: {
          familyCode: `F${String(i + 1).padStart(4, "0")}`,
          headName: f.headName,
          headPhone: f.headPhone,
          population: f.population,
          familyAttr: f.familyAttr,
          address: f.address,
          riskLevel: f.riskLevel,
          residenceStatus: "常住户",
          incomeSource: "种植+养殖+务工",
          notes: `示例数据 — ${f.familyAttr}，用于演示系统功能`,
          groupId: groupId,
        },
      });
    }
    console.log("✓ 10户示例家庭已创建（脱贫户3/监测户2/一般农户2/低保户2/五保户1）");
  } else {
    console.log("→ 家庭数据已存在，跳过");
  }

  // 5. 创建一条示例走访记录
  const visitCount = await prisma.visit.count();
  if (visitCount === 0) {
    const firstFamily = await prisma.family.findFirst({ orderBy: { createdAt: "asc" } });
    if (firstFamily && admin) {
      await prisma.visit.create({
        data: {
          familyId: firstFamily.id,
          visitDate: new Date(),
          content: "<p>示例走访记录：入户了解家庭近期情况，宣传医保政策。</p>",
          visitorId: admin.id,
          statusTags: "[]",
        },
      });
      console.log("✓ 示例走访记录已创建");
    }
  }

  // 6. 创建默认队员
  const memberCount = await prisma.teamMember.count();
  if (memberCount === 0 && admin) {
    await prisma.teamMember.create({ data: { name: admin.name, title: "队长", sortOrder: 1, isActive: true } });
    console.log("✓ 默认队员已创建");
  }

  console.log("\n🎉 数据初始化完成！");
  console.log("─────────────────────────────");
  console.log("登录账号: admin");
  console.log("登录密码: admin123");
  console.log("─────────────────────────────");
}

main()
  .catch((e) => {
    console.error("初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
