// 首次运行初始化脚本
// 检查数据库是否存在，不存在则自动创建
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "village.db");
const ENV_PATH = path.join(ROOT, ".env");

console.log("🔍 检查系统状态...");

// 确保 data 目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "photos"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "files"), { recursive: true });
}

// 检查是否需要初始化
if (fs.existsSync(DB_PATH)) {
  console.log("✅ 数据库已存在，跳过初始化");
  process.exit(0);
}

console.log("🆕 首次运行，正在初始化...");

// 生成 AUTH_SECRET
const secret = crypto.randomBytes(32).toString("hex");

// 更新或创建 .env
let envContent = "";
if (fs.existsSync(ENV_PATH)) {
  envContent = fs.readFileSync(ENV_PATH, "utf-8");
  // 如果已有 AUTH_SECRET 就用它，否则用生成的
  if (!envContent.includes("AUTH_SECRET=")) {
    envContent += `\nAUTH_SECRET="${secret}"\n`;
  }
} else {
  envContent = `DATABASE_URL="file:./data/village.db"\nAUTH_SECRET="${secret}"\nPORT=3000\n`;
}
fs.writeFileSync(ENV_PATH, envContent);

// 运行 Prisma db push 创建表
console.log("📦 创建数据库表...");
execSync("npx prisma db push --skip-generate", { cwd: ROOT, stdio: "inherit" });

// 运行种子数据
console.log("🌱 写入初始数据...");
execSync("node prisma/seed.js", { cwd: ROOT, stdio: "inherit" });

console.log("\n🎉 初始化完成！");
console.log("─────────────────────────────");
console.log("登录账号: admin");
console.log("登录密码: admin123");
console.log("─────────────────────────────");
