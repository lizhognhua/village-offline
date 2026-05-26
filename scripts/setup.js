// First-run initialization
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
const VERSION_PATH = path.join(DATA_DIR, "version.txt");

const EXPECTED_VERSION = "2.4";

async function main() {
  console.log("Checking system status...");

  // Ensure data directories exist
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "photos"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "files"), { recursive: true });

  // Check if database needs reinitialization
  const dbExists = fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0;
  let currentVersion = "";
  try { currentVersion = fs.readFileSync(VERSION_PATH, "utf8").trim(); } catch {}

  if (dbExists && currentVersion === EXPECTED_VERSION) {
    console.log("Database exists, skipping init.");
    process.exit(0);
  }

  if (dbExists && currentVersion !== EXPECTED_VERSION) {
    console.log(`Database version (${currentVersion || "unknown"}) outdated, upgrading to ${EXPECTED_VERSION}...`);
    fs.unlinkSync(DB_PATH);
  } else {
    console.log("First run, initializing...");
  }

  // Generate AUTH_SECRET
  const secret = crypto.randomBytes(32).toString("hex");
  const dbUrl = "file:" + DB_PATH.replace(/\\/g, "/");

  let envContent = "";
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, "utf-8");
    if (!envContent.includes("AUTH_SECRET=")) {
      envContent += `\nAUTH_SECRET="${secret}"\n`;
    }
    // Update DATABASE_URL to absolute path
    envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${dbUrl}"`);
  } else {
    envContent = `DATABASE_URL="${dbUrl}"\nAUTH_URL=http://localhost:3000\nAUTH_SECRET="${secret}"\nPORT=3000\n`;
  }
  fs.writeFileSync(ENV_PATH, envContent);

  // Initialize empty SQLite database file (create empty file, Prisma handles the rest)
  console.log("Creating database...");
  fs.writeFileSync(DB_PATH, "");

  // Create tables from pre-generated SQL
  console.log("Creating database tables...");
  process.env.DATABASE_URL = dbUrl;
  const prisma = new PrismaClient();
  const sql = fs.readFileSync(SQL_PATH, "utf-8");

  // Split into individual statements (Prisma DDL ends statements with ;\n)
  const statements = sql
    .split(/;\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== ";");

  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  await prisma.$disconnect();

  // Run seed data (use process.execPath to ensure portable Node.js works even without system Node)
  console.log("Writing initial data...");
  execSync(`"${process.execPath}" prisma/seed.js`, { cwd: ROOT, stdio: "inherit" });

  // Write version marker to enable future auto-upgrades
  fs.writeFileSync(VERSION_PATH, EXPECTED_VERSION);

  console.log("\nInit complete!");
  console.log("Account: admin");
  console.log("Password: admin123");
}

main().catch(err => {
  console.error("Init failed:", err.message);
  process.exit(1);
});
