## 离线版 V2.7 (2026-05-28)

### 修复
- 全面代码审查修复：charAt空值保护、var→const统一、Dashboard统计去重
- 跨页面关联修复：家庭成员导入匹配优化、清理孤立目录
- 构建错误修复：const变量重新赋值改为let
- 数据库seed补充relocatedHouseholds字段
- package.json版本号同步

### 在线版
- Docker版同步charAt保护 + var→const
- 代码已推送到GitHub

# 驻村帮扶管理系统 — 版本更新记录

---

## 离线版 V2.6 (2026-05-27)

### Critical Bug 修复

| ID | 问题描述 | 影响 | 修复方式 |
|----|----------|------|----------|
| C1 | 编辑走访记录时照片被清空 | 每次编辑走访/慰问记录，原有照片全部丢失 | PUT /api/records/[id] 改为条件更新：仅当显式传入 photos 或上传新照片时才更新 |
| H2 | 编辑页无照片管理 UI | 编辑走访记录时看不到现有照片，也无法添加新照片 | 从 Docker 版同步完整照片管理组件（查看/删除/新增） |

### Schema 关系补全

| 模型 | 缺失关系 | 修复 |
|------|----------|------|
| Condolence | createdById → User | 添加 @relation |
| HouseholdRecord | createdById → User | 添加 @relation |
| AlertRecord | handlerId → User | 添加 @relation |

### Bug 修复（延续 V2.5）

| ID | 问题描述 | 修复方式 |
|----|----------|----------|
| B1 | 系统设置录入村情数据后，村情村况卡片不联动更新 | /api/village/stats 改为优先使用 VillageProfile 手动值，为 null 时回退到 Family 表统计 |
| B2 | 屯组管理修改后重新进入系统恢复旧数据 | 前端 load() 加时间戳参数破坏缓存 + API 返回 Cache-Control: no-cache 头 |
| B3 | 修改管理员姓名后 Dashboard 未更新 | 新建 GET /api/user/me 端点，Dashboard 挂载时实时获取数据库最新姓名 |

### 新增功能（延续 V2.5）

| ID | 功能 | 说明 |
|----|------|------|
| F1 | 系统设置增加"修改密码" | 系统设置新增"修改密码"Tab，验证旧密码后设置新密码 |
| F2 | 自动生成桌面快捷方式 | 首次运行 启动系统.bat 时自动在桌面创建"驻村工作队管理系统.lnk" |
| F3 | 村情概况增加"异地搬迁户" | 录入：异地搬迁户户数 + 人数；展示：村情村况新增卡片 |
| F4 | 村情村况增加"低保户"卡片 | 村情村况卡片区新增低保户卡片 |
| F5 | 卡片可点击跳转分类标签 | 脱贫户/监测户/低保户卡片点击后自动跳转到对应筛选标签 |

### 新增功能（V2.6 本版）

| ID | 功能 | 说明 |
|----|------|------|
| F6 | 农户详情页信息总入口 | API 返回关联走访/慰问/记录/政策/预警；前端 Tab 式布局 |
| F7 | 走访记录时间线 | 农户详情页"走访记录"Tab 按时间倒序展示所有关联记录 |
| F8 | 地图位置缩略图 | 有 GPS 坐标的农户显示坐标卡片 + "在卫星地图中查看"跳转按钮 |

### 修改文件

```
prisma/schema.prisma                          — Schema 关系补全 + 反向字段
src/app/api/records/[id]/route.ts             — C1: 照片条件更新
src/app/api/village/stats/route.ts            — B1: 优先 VillageProfile 值
src/app/api/village/groups/route.ts           — B2: Cache-Control 头
src/app/api/village/families/[id]/route.ts    — F6: 增加 include 关联记录
src/app/api/user/me/route.ts                  — B3: 新建端点
src/app/api/user/change-password/route.ts     — F1: 新建端点
src/app/dashboard/page.tsx                    — B3: 实时获取用户姓名
src/app/dashboard/settings/page.tsx           — F1: 修改密码 Tab + F3: 异地搬迁字段
src/app/village/page.tsx                      — F4+F5: 低保户卡片 + 卡片跳转
src/app/village/families/[id]/page.tsx        — F6-F8: Tab 式详情页
src/app/visits/edit/[id]/page.tsx             — H2: 照片管理 UI
scripts/create-shortcut.ps1                   — F2: 桌面快捷方式脚本
启动系统.bat                                   — F2: 调用快捷方式脚本
```

### 测试

- Playwright E2E: 17/17 通过
- API 测试: 所有端点正常响应

### 下载

- 文件名: `驻村帮扶管理系统-V2.6.zip`
- 大小: 81 MB
- 密码: `2026`

---

## Docker 版 v380 (2026-05-27) · 未上传 GitHub

