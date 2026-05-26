# 驻村帮扶管理系统（离线版）— Claude Code 项目上下文

## 版本
- V1.7, SQLite, 单队 Windows 绿色包

## 测试环境
- 固定测试目录: `C:\Users\27139\Desktop\Village-Test\`
- 启动: 双击 `启动系统.bat` (端口 3000)
- 源码: `C:\Users\27139\Desktop\village-single-team\`

## 构建部署
1. `npm run build`
2. 复制 standalone/server/static 到 Village-Test
3. 删除 .next 中的 .html/.rsc/.body/.meta 缓存
4. `scripts/build-portable.bat` 生成 zip

## ⚠️ 离线版打包检查清单（每次打包前必须逐项确认）

| 检查项 | 位置 | 说明 |
|--------|------|------|
| ✅ Node.js 运行时 | `nodejs/node.exe` | v20.18.0 便携版，70MB。不含则用户电脑无 Node 时无法启动 |
| ✅ 启动系统.bat | 项目根目录 | 启动脚本，引用 `nodejs/node.exe` |
| ✅ 系统自检.bat | 项目根目录 | 调用 `scripts/system-check.ps1` |
| ✅ scripts/ 目录 | 含 setup.js, init-db.sql | 首次运行自动初始化 |
| ✅ prisma/schema.prisma | prisma/ | 数据库 schema |
| ✅ .next/standalone/ | 构建产物 | Next.js standalone 输出 |
| ✅ .next/static/ | 构建产物 | 静态资源 |
| ✅ public/ | 静态文件目录 | uploads, api/version.json 等 |
| ✅ bcryptjs | node_modules/bcryptjs | seed.js 依赖（standalone 不会自动包含） |

**打包后验证**：
1. 解压 zip 到测试目录
2. 双击 `系统自检.bat` → 确认 4 项全部通过（磁盘/端口/内存/Node.js）
3. 双击 `启动系统.bat` → 浏览器自动打开 localhost:3000

## 关键修复
- 所有 API 路由需要 `export const dynamic = "force-dynamic"`
- `export const dynamic` 不能放在 client component 中
- DATABASE_URL 需要绝对路径
- AUTH_URL=http://localhost:3000
- setup.js 用 node:sqlite + 预生成 SQL 初始化
- 启动脚本纯 ASCII, ps1 用 UTF-8 BOM

## V1.8 计划：启动日志检测

每次启动自动生成 `启动日志.txt`，记录完整启动过程：

```
驻村帮扶管理系统 V1.8 — 启动日志
========================================
时间：2026-05-25 14:30:00
系统：Windows 11 Home (10.0.26200)
内存：7.4 GB | 磁盘可用：D:\ 140.9GB

[14:30:01] ✓ Node.js v20.18.0 (便携版)
[14:30:01] ✓ 端口 3000 可用
[14:30:02] ✓ 数据库检测通过 (data/village.db)
[14:30:02] ✓ 首次运行初始化完成 (32秒)
[14:30:03] ✓ 防火墙规则已配置
[14:30:03] ✓ 服务启动成功 → http://192.168.1.5:3000
========================================
状态：✅ 启动成功
```

实现方式：
- `scripts/startup-logger.js` — Node.js 日志记录模块
- 修改 `启动系统.bat` — 每步输出到日志文件
- 修改 `setup.js` — 初始化步骤写入日志
- 日志文件编码 UTF-8，兼容记事本打开
- 启动失败时自动标记错误步骤，用户可发送给管理员诊断
