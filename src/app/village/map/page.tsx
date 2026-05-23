"use client";
import { useEffect, useRef, useState } from "react";

// 靠山村大致坐标（绥棱县靠山乡）
const VILLAGE_CENTER: [number, number] = [127.265149, 47.221319];

interface Family {
  id: string;
  headName: string;
  headPhone: string;
  actualAddr: string;
  familyAttr: string;
  population: number;
  latitude: number | null;
  longitude: number | null;
  riskLevel: string;
  tags: string;
}

const attrColor: Record<string, string> = {
  "脱贫户": "bg-green-500",
  "监测户": "bg-orange-500",
  "低保户": "bg-blue-500",
  "五保户": "bg-purple-500",
};

export default function VillageMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Family | null>(null);
  const [filter, setFilter] = useState("");

  // Load families with coordinates
  useEffect(() => {
    fetch("/api/village/map-families")
      .then((r) => r.json())
      .then((d) => {
        setFamilies(d.families || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current || families.length === 0) return;

    const loadMap = async () => {
      // Load Amap JS API dynamically
      const win = window as any;

      const existing = document.querySelector(
        'script[src*="webapi.amap.com/maps"]'
      );
      if (!existing) {
        await new Promise<void>((resolve) => {
          const s = document.createElement("script");
          s.src =
            `https://webapi.amap.com/maps?v=2.0&key=${process.env.NEXT_PUBLIC_AMAP_KEY || ""}`;
          s.onload = () => resolve();
          document.head.appendChild(s);
        });
      }

      const map = new win.AMap.Map(mapRef.current, {
        zoom: 14,
        center: VILLAGE_CENTER,
        mapStyle: "amap://styles/light",
      });

      // Add village center marker
      new win.AMap.Marker({
        position: VILLAGE_CENTER,
        icon: new win.AMap.Icon({
          image:
            "https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png",
          size: [28, 40],
        }),
        title: "靠山村",
        map,
      });

      // Add household markers
      const markers: any[] = [];
      const info = new win.AMap.InfoWindow({ offset: new win.AMap.Pixel(0, -30) });

      families.forEach((f) => {
        if (!f.longitude || !f.latitude) return;
        const color = attrColor[f.familyAttr] || "bg-gray-500";
        const marker = new win.AMap.Marker({
          position: [f.longitude, f.latitude],
          title: f.headName,
          label: {
            content: `<div class="text-xs px-1 rounded ${color} text-white whitespace-nowrap">${f.headName}</div>`,
            direction: "top",
            offset: new win.AMap.Pixel(0, -8),
          },
          map,
        });

        marker.on("click", () => {
          const tags = JSON.parse(f.tags || "[]");
          const tagHtml = tags.length
            ? tags.map((t: string) => `<span class="inline-block bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded mr-1">${t}</span>`).join("")
            : "";
          info.setContent(`
            <div style="min-width:200px;font-size:13px;line-height:1.6">
              <div style="font-size:15px;font-weight:600;margin-bottom:4px">${f.headName}</div>
              <div style="color:#666">📞 ${f.headPhone || "无电话"}</div>
              <div style="color:#666">🏠 ${f.actualAddr || f.actualAddr || "无地址"}</div>
              <div style="color:#666">👥 ${f.population}人 · ${f.familyAttr || "一般户"}</div>
              ${tagHtml ? `<div style="margin-top:4px">${tagHtml}</div>` : ""}
            </div>
          `);
          info.open(map, marker);
          setSelected(f);
        });

        markers.push(marker);
      });

      // Fit bounds to show all markers
      if (markers.length > 0) {
        map.setFitView(markers, false, [50, 50, 50, 50]);
      }
    };

    loadMap();
  }, [families]);

  const filtered = families.filter((f) => {
    if (!filter) return true;
    return f.familyAttr === filter || f.headName.includes(filter);
  });

  const hasCoords = families.filter((f) => f.longitude && f.latitude).length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Map */}
      <div ref={mapRef} className="flex-1 h-full" />

      {/* Side panel */}
      <div className="w-80 bg-white border-l overflow-y-auto p-4">
        <h2 className="text-lg font-bold mb-2">村情地图</h2>
        <p className="text-sm text-gray-500 mb-4">
          靠山乡靠山村 · 共 {families.length} 户
          {hasCoords > 0 && (
            <span className="text-green-600"> · 已标注 {hasCoords} 户</span>
          )}
        </p>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {["", "脱贫户", "监测户", "低保户", "五保户"].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-xs px-3 py-1 rounded-full border ${
                filter === c
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-600 border-gray-300"
              }`}
            >
              {c || "全部"}
            </button>
          ))}
        </div>

        {/* Household list */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelected(f)}
                className={`p-3 rounded-lg border cursor-pointer text-sm hover:bg-gray-50 ${
                  selected?.id === f.id ? "border-primary-400 bg-primary-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{f.headName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded text-white ${
                    attrColor[f.familyAttr] || "bg-gray-400"
                  }`}>
                    {f.familyAttr || "一般户"}
                  </span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {f.actualAddr || "地址待补"} · {f.population}人
                </div>
                {f.longitude && f.latitude ? (
                  <span className="text-green-500 text-xs">✓ 已定位</span>
                ) : (
                  <span className="text-yellow-500 text-xs">⚠ 未标坐标</span>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                暂无匹配的农户
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <p className="font-medium mb-1">💡 坐标标注说明</p>
          <p>目前已标注 {hasCoords} / {families.length} 户。</p>
          <p className="mt-1">如需批量标注，可联系管理员使用高德地理编码API自动转换地址为坐标。</p>
        </div>
      </div>
    </div>
  );
}
