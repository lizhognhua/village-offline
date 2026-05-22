// First-run initialization - uses pre-generated SQL, no Prisma CLI needed
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "village.db");
const ENV_PATH = path.join(ROOT, ".env");
const SQL_PATH = path.join(__dirname, "init-db.sql");

console.log("Checking system status...");

// Create data directories
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "photos"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "files"), { recursive: true });
}

// Skip if already initialized
if (fs.existsSync(DB_PATH)) {
  console.log("Database exists, skipping init.");
  process.exit(0);
}

console.log("First run, initializing...");

// Generate AUTH_SECRET
const secret = crypto.randomBytes(32).toString("hex");

let envContent = "";
if (fs.existsSync(ENV_PATH)) {
  envContent = fs.readFileSync(ENV_PATH, "utf-8");
  if (!envContent.includes("AUTH_SECRET=")) {
    envContent += `\nAUTH_SECRET="${secret}"\n`;
  }
} else {
  envContent = `DATABASE_URL="file:./data/village.db"\nAUTH_SECRET="${secret}"\nPORT=3000\n`;
}
fs.writeFileSync(ENV_PATH, envContent);

// Create database tables from pre-generated SQL
console.log("Creating database tables...");
const prisma = new PrismaClient();
const sql = fs.readFileSync(SQL_PATH, "utf-8");

// Split into individual statements (Prisma DDL always ends statements with ;\n)
const statements = sql
  .split(/;\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && s !== ";");

for (const stmt of statements) {
  await prisma.$executeRawUnsafe(stmt);
}
await prisma.$disconnect();

// Run seed data
console.log("Writing initial data...");
execSync("node prisma/seed.js", { cwd: ROOT, stdio: "inherit" });

console.log("\nInit complete!");
console.log("Account: admin");
console.log("Password: admin123");
