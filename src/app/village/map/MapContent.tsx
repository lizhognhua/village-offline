"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const VILLAGE_CENTER: [number, number] = [47.221319, 127.265149];

interface Family {
  id: string;
  headName: string;
  headIdCard?: string;
  headPhone: string;
  actualAddr: string;
  familyAttr: string;
  population: number;
  latitude: number | null;
  longitude: number | null;
  riskLevel: string;
  tags: string;
  portrait?: string;
}

const attrColor: Record<string, string> = {
  "脱贫户": "#22c55e",
  "监测户": "#f97316",
  "低保户": "#3b82f6",
  "五保户": "#a855f7",
};

const TILE_LAYERS = {
  "ESRI 卫星图（高清）": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 20,
  },
  "OSM 标准地图": {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
};

export default function VillageMapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const mapRef = useRef<HTMLDivElement>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Family | null>(null);
  const [filter, setFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLayer, setCurrentLayer] = useState("ESRI 卫星图（高清）");
  const [mapReady, setMapReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggingFamily, setDraggingFamily] = useState<string | null>(null);
  const [unsavedCoords, setUnsavedCoords] = useState<Record<string, [number, number]>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // --- Auth ---
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // --- Load families ---
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/village/map-families")
      .then((r) => r.json())
      .then((d) => { setFamilies(d.families || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  // --- Init map ---
  useEffect(() => {
    if (!mapRef.current || !session || mapReady) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        zoom: 15, center: VILLAGE_CENTER,
        zoomControl: true, attributionControl: true,
      });

      const layer = TILE_LAYERS["ESRI 卫星图（高清）"];
      L.tileLayer(layer.url, { maxZoom: layer.maxZoom, attribution: layer.attribution }).addTo(map);

      // Fix white screen on tab switch
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) setTimeout(() => map.invalidateSize(), 100);
      });

      (window as any).__villageMap = map;
      setMapReady(true);
    };

    initMap();
    return () => {
      const map = (window as any).__villageMap;
      if (map) map.remove();
      (window as any).__villageMap = null;
    };
  }, [session]);

  // --- Add markers with drag support ---
  useEffect(() => {
    if (!mapReady || families.length === 0) return;
    const map = (window as any).__villageMap;
    if (!map) return;

    const addMarkers = async () => {
      const L = (await import("leaflet")).default;

      // Clear old markers
      const oldLayer = (window as any).__villageMarkersLayer;
      if (oldLayer) map.removeLayer(oldLayer);

      const markersLayer = L.layerGroup();
      const markerMap: Record<string, any> = {};

      families.forEach((f) => {
        const lat = unsavedCoords[f.id]?.[0] ?? f.latitude;
        const lng = unsavedCoords[f.id]?.[1] ?? f.longitude;
        if (!lat || !lng) return;

        const color = attrColor[f.familyAttr] || "#6b7280";
        const isBeingDragged = draggingFamily === f.id;
        const opacity = isBeingDragged ? 0.4 : 1;

        const icon = L.divIcon({
          className: "custom-family-marker",
          html: `<div style="background:${color};color:white;padding:${isBeingDragged ? '4px 10px' : '2px 6px'};border-radius:4px;font-size:${isBeingDragged ? '13' : '11'}px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:${editMode ? 'grab' : 'pointer'};border:${isBeingDragged ? '2.5px solid #fff' : '1.5px solid white'};opacity:${opacity}">${editMode ? '✋ ' : ''}${f.headName}</div>`,
          iconSize: [0, 0], iconAnchor: [0, 0],
        });

        const marker = L.marker([lat, lng], {
          icon,
          draggable: editMode,
          zIndexOffset: isBeingDragged ? 1000 : 0,
        }).addTo(markersLayer);

        marker.bindPopup(() => popupContent(f));
        marker.on("click", () => { if (!editMode) setSelected(f); });

        // Drag events
        marker.on("dragstart", () => {
          setDraggingFamily(f.id);
          setUnsavedCoords(prev => ({ ...prev, [f.id]: [marker.getLatLng().lat, marker.getLatLng().lng] }));
        });
        marker.on("drag", () => {
          const pos = marker.getLatLng();
          marker.setTooltipContent(`📍 ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
        });
        marker.on("dragend", () => {
          setDraggingFamily(null);
          const pos = marker.getLatLng();
          setUnsavedCoords(prev => ({ ...prev, [f.id]: [pos.lat, pos.lng] }));
        });

        // Tooltip shows coords when dragging
        marker.bindTooltip("", { permanent: false, direction: "bottom", offset: L.point(0, 10) });

        markerMap[f.id] = marker;
      });

      markersLayer.addTo(map);
      (window as any).__villageMarkersLayer = markersLayer;
      (window as any).__villageMarkerMap = markerMap;

      if (!draggingFamily) {
        const bounds = markersLayer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    };

    addMarkers();
  }, [families, mapReady, editMode, draggingFamily, unsavedCoords]);

  // --- Save coord ---
  const saveCoord = async (familyId: string) => {
    const coord = unsavedCoords[familyId];
    if (!coord) return;
    setSaving(familyId);
    try {
      const res = await fetch(`/api/village/map-families/${familyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: coord[0], longitude: coord[1] }),
      });
      if (!res.ok) throw new Error("保存失败");
      setUnsavedCoords(prev => { const n = { ...prev }; delete n[familyId]; return n; });
      alert("✅ 位置已保存！");
    } catch { alert("❌ 保存失败"); }
    finally { setSaving(null); }
  };

  const popupContent = (f: Family) => {
    const tags = JSON.parse(f.tags || "[]");
    const tagHtml = tags.length ? tags.map((t: string) => `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:11px;padding:1px 6px;border-radius:3px;margin:0 2px 2px 0">${t}</span>`).join("") : "";
    return `<div style="min-width:180px;font-size:13px;line-height:1.6">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px">${f.headName}</div>
      <div style="color:#666">📞 ${f.headPhone || "无电话"}</div>
      <div style="color:#666">🏠 ${f.actualAddr || "无地址"}</div>
      <div style="color:#666">👥 ${f.population}人 · ${f.familyAttr || "一般户"}</div>
      ${tagHtml ? `<div style="margin-top:4px">${tagHtml}</div>` : ""}
    </div>`;
  };

  // --- Search + Filter ---
  const searchable = families.filter((f) => {
    if (filter && f.familyAttr !== filter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      f.headName.toLowerCase().includes(q) ||
      (f.headPhone && f.headPhone.includes(q)) ||
      (f.actualAddr && f.actualAddr.toLowerCase().includes(q))
    );
  });

  // --- Switch layer ---
  const switchLayer = async (name: string) => {
    setCurrentLayer(name);
    const map = (window as any).__villageMap;
    if (!map) return;
    const L = (await import("leaflet")).default;
    map.eachLayer((layer: any) => { if (layer._url && !layer._markers) map.removeLayer(layer); });
    const c = TILE_LAYERS[name as keyof typeof TILE_LAYERS];
    if (c) L.tileLayer(c.url, { maxZoom: c.maxZoom, attribution: c.attribution }).addTo(map);
  };

  // --- Zoom to family ---
  const zoomToFamily = (f: Family) => {
    const map = (window as any).__villageMap;
    const markerMap = (window as any).__villageMarkerMap;
    if (map && markerMap?.[f.id]) {
      map.setView(markerMap[f.id].getLatLng(), 18, { animate: true });
    }
    setSelected(f);
  };

  const hasCoords = families.filter((f) => f.longitude && f.latitude).length;

  // --- Auth guards ---
  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
  if (status === "unauthenticated") return null;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Map */}
      <div className="flex-1 h-full relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Top-left controls */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-1.5">
          {Object.keys(TILE_LAYERS).map((name) => (
            <button key={name} onClick={() => switchLayer(name)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md border text-sm transition-colors ${currentLayer === name ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
              <span>{name.includes("卫星") ? "🛰️" : "🗺️"}</span>
              <span className="font-medium">{name}</span>
            </button>
          ))}
          {/* Edit mode toggle */}
          <button onClick={() => { setEditMode(!editMode); if (!editMode) setDraggingFamily(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md border text-sm transition-colors ${editMode ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
            <span>✋</span>
            <span className="font-medium">{editMode ? "退出标注" : "标注模式"}</span>
          </button>
        </div>

        {/* Save coord button */}
        {Object.keys(unsavedCoords).length > 0 && (
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            {Object.entries(unsavedCoords).map(([fid, coord]) => {
              const f = families.find(x => x.id === fid);
              return (
                <div key={fid} className="bg-white rounded-lg shadow-lg border p-3 flex items-center gap-3">
                  <span className="text-sm font-medium">{f?.headName || fid}</span>
                  <span className="text-xs text-gray-500">{coord[0].toFixed(5)}, {coord[1].toFixed(5)}</span>
                  <button onClick={() => saveCoord(fid)} disabled={saving === fid}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50">
                    {saving === fid ? "保存中..." : "💾 保存"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="w-80 bg-white border-l overflow-y-auto p-4">
        <h2 className="text-lg font-bold mb-2">村情地图</h2>
        <p className="text-sm text-gray-500 mb-3">靠山乡靠山村 · {families.length} 户</p>

        {/* Search */}
        <input
          type="text" placeholder="🔍 搜索户主、电话、地址..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex gap-2 flex-wrap mb-3">
          {["", "脱贫户", "监测户", "低保户", "五保户"].map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`text-xs px-3 py-1 rounded-full border ${filter === c ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-300"}`}>
              {c || "全部"}
            </button>
          ))}
        </div>

        {/* Mode tips */}
        {editMode && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            ✋ 标注模式：拖拽标签到正确房屋位置后点击保存
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : (
          <div className="space-y-2">
            {searchable.map((f) => (
              <div key={f.id}
                className={`p-3 rounded-lg border cursor-pointer text-sm hover:bg-gray-50 transition-colors ${
                  selected?.id === f.id ? "border-primary-400 bg-primary-50" : "border-gray-200"
                } ${unsavedCoords[f.id] ? "ring-2 ring-amber-400" : ""}`}
                onClick={() => zoomToFamily(f)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{f.headName}</span>
                  <span style={{backgroundColor: attrColor[f.familyAttr] || "#9ca3af"}} className="text-xs px-1.5 py-0.5 rounded text-white shrink-0 ml-1">
                    {f.familyAttr || "一般户"}
                  </span>
                </div>
                <div className="text-gray-500 text-xs mt-1 truncate">
                  📞 {f.headPhone || "无电话"} · 👥 {f.population}人
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {unsavedCoords[f.id] ? (
                    <span className="text-amber-500 text-xs">✋ 新位置待保存</span>
                  ) : f.longitude && f.latitude ? (
                    <span className="text-green-500 text-xs">✓ 已定位</span>
                  ) : (
                    <span className="text-yellow-500 text-xs">⚠ 未标坐标</span>
                  )}
                </div>
              </div>
            ))}
            {searchable.length === 0 && <div className="text-center py-8 text-gray-400">无匹配结果</div>}
          </div>
        )}
      </div>
    </div>
  );
}
