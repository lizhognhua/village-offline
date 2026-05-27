const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const surnames = ['张','李','王','赵','刘','陈','杨','黄','周','吴'];
const givenNames = ['伟','芳','敏','强','磊','洋','静','丽','艳','涛','军','杰','慧','明','宇','琳','超','鑫','鹏'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeIdCard() {
  var y = String(1950 + Math.floor(Math.random()*55));
  var m = String(1 + Math.floor(Math.random()*12)).padStart(2,'0');
  var d = String(1 + Math.floor(Math.random()*28)).padStart(2,'0');
  var s = String(100 + Math.floor(Math.random()*900)).padStart(3,'0');
  return '232332' + y + m + d + s + 'X';
}

function makePhone() {
  var p = ['3','5','7','8','9'][Math.floor(Math.random()*5)];
  var r = String(Math.floor(Math.random()*1000000000)).padStart(9,'0');
  return '1' + p + r;
}

async function gen() {
  var families = await p.family.findMany({ select: { headName: true }, take: 10 });
  var headNames = families.map(function(f) { return f.headName; });
  console.log('Available headNames:', headNames.slice(0,5));

  // Family member import
  var memberRows = [['户主姓名','成员姓名','与户主关系','性别','身份证号','电话','出生日期','文化程度','职业','健康状况','健康备注']];
  var relations = ['配偶','长子','长女','次子','次女','父亲','母亲'];
  for (var i = 0; i < 10; i++) {
    var y = 1950 + Math.floor(Math.random()*50);
    var m = String(1 + Math.floor(Math.random()*12)).padStart(2,'0');
    var d = String(1 + Math.floor(Math.random()*28)).padStart(2,'0');
    memberRows.push([
      pick(headNames), pick(surnames) + pick(givenNames), pick(relations),
      Math.random() > 0.5 ? '男' : '女', makeIdCard(), makePhone(),
      y + '-' + m + '-' + d,
      pick(['小学','初中','高中','大专','本科']),
      pick(['务农','务工','学生','个体','无业']),
      pick(['健康','健康','健康','慢性病','残疾']), ''
    ]);
  }

  var memberWs = XLSX.utils.aoa_to_sheet(memberRows);
  memberWs['!cols'] = memberRows[0].map(function() { return { wch: 14 }; });
  var memberWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(memberWb, memberWs, '数据');
  XLSX.writeFile(memberWb, 'C:/Users/27139/Desktop/家庭成员测试导入_10人.xlsx');
  console.log('Family member import file: 10 records');

  // Party member import
  var partyRows = [['姓名','性别','身份证号','民族','学历','入党日期','电话','地址','备注']];
  for (var j = 0; j < 10; j++) {
    var jy = 2010 + Math.floor(Math.random()*15);
    var jm = String(1 + Math.floor(Math.random()*12)).padStart(2,'0');
    var jd = String(1 + Math.floor(Math.random()*28)).padStart(2,'0');
    partyRows.push([
      pick(surnames) + pick(givenNames),
      Math.random() > 0.5 ? '男' : '女', makeIdCard(), '汉族',
      pick(['初中','高中','大专','本科']),
      jy + '-' + jm + '-' + jd, makePhone(),
      '靠山乡靠山村' + pick(['福山屯','靠山屯','东兴屯']), ''
    ]);
  }

  var partyWs = XLSX.utils.aoa_to_sheet(partyRows);
  partyWs['!cols'] = partyRows[0].map(function() { return { wch: 14 }; });
  var partyWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(partyWb, partyWs, '数据');
  XLSX.writeFile(partyWb, 'C:/Users/27139/Desktop/党员信息测试导入_10人.xlsx');
  console.log('Party member import file: 10 records');

  await p.$disconnect();
}
gen().catch(console.error);
