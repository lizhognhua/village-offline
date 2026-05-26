import os
from PIL import Image

src_dir = r"C:\Users\27139\Desktop\小红书"
dst_dir = r"C:\Users\27139\Desktop\village-single-team\screenshots"
os.makedirs(dst_dir, exist_ok=True)

mapping = {
    "系统工作台.jpg": "01-dashboard.png",
    "村情村况及农户信息卡页面.jpg": "02-families.png",
    "走访慰问.jpg": "03-visits.png",
    "党建专栏.jpg": "04-party.png",
    "培训记录.jpg": "05-training.png",
    "履职全景分析.jpg": "06-performance.png",
    "产业管理.jpg": "07-industry.png",
    "项目任务看板.jpg": "08-projects.png",
    "防返贫检测预警.jpg": "09-alerts.png",
    "为民办实事登记.jpg": "10-public-service.png",
    "驻村日记.jpg": "11-diary.png",
    "集成电子档案系统.jpg": "12-archive.png",
    "知识库.jpg": "13-knowledge.png",
    "AI大模型嵌入.jpg": "14-ai-writer.png",
    "相册管理.jpg": "15-album.png",
    "地图标记页.jpg": "16-map.png",
    "多工作队主页.jpg": "17-multi-tenant.png",
    "靠山村工作队首页.jpg": "18-team-home.png",
    "日记内容.jpg": "19-diary-detail.png",
}

total_orig = 0
total_new = 0

for src_name, dst_name in mapping.items():
    src_path = os.path.join(src_dir, src_name)
    dst_path = os.path.join(dst_dir, dst_name)
    if not os.path.exists(src_path):
        print(f"SKIP: {src_name}")
        continue
    img = Image.open(src_path)
    w, h = img.size
    new_w = 800
    new_h = int(h * 800 / w)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    img.save(dst_path, "PNG", optimize=True)
    orig_kb = os.path.getsize(src_path) / 1024
    new_kb = os.path.getsize(dst_path) / 1024
    total_orig += orig_kb
    total_new += new_kb
    print(f"OK {src_name}: {int(orig_kb)}KB -> {dst_name} {int(new_kb)}KB ({new_w}x{new_h})")

print(f"\nTotal: {int(total_orig)}KB -> {int(total_new)}KB")
print(f"Screenshots: {len(os.listdir(dst_dir))} files")
