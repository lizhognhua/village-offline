"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Search, X, Navigation, Users, Camera, Square, Trash2, Plus } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSession } from "next-auth/react";
import { sanitizeHtml } from "@/lib/sanitize";

const TDK = process.env.NEXT_PUBLIC_TIANDITU_KEY || "";

// Default center position (绥棱县靠山乡)

const FAMILY_ATTR_OPTIONS = ["一般农户", "脱贫户", "监测户", "低保户", "五保户"];
const TAG_OPTIONS = ["党员", "村委会成员", "重病重疾", "高龄老人", "赡养儿童", "留守儿童", "残疾", "丧失劳动能力"];
const ATTR_COLORS: Record<string, string> = { "脱贫户": "#f59e0b", "监测户": "#ef4444", "低保户": "#3b82f6", "五保户": "#a855f7", "一般农户": "#6b7280" };

const MARKER_CATEGORIES = [
  { key: "general", label: "一般标记", color: "#6b7280", icon: "📍" },
  { key: "infrastructure", label: "基础设施", color: "#3b82f6", icon: "🏗️" },
  { key: "project", label: "产业项目", color: "#10b981", icon: "🌱" },
  { key: "hazard", label: "隐患点", color: "#ef4444", icon: "⚠️" },
  { key: "other", label: "其他", color: "#a855f7", icon: "📌" },
];

const TILE_LAYERS: Record<string, { name: string; url: string; options: any }> = {
  tdt_sat: { name:"天地图卫星", url:`https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TDK}`, options:{subdomains:["0","1","2","3","4","5","6","7"],maxZoom:18,attribution:"天地图"} },
  tdt_label: { name:"天地图标注", url:`https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TDK}`, options:{subdomains:["0","1","2","3","4","5","6","7"],maxZoom:18,attribution:"天地图"} },
  tdt_vec: { name:"天地图街道", url:`https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TDK}`, options:{subdomains:["0","1","2","3","4","5","6","7"],maxZoom:18,attribution:"天地图"} },
  esri_sat: { name:"ESRI 卫星", url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", options:{maxZoom:20,attribution:"Esri, Maxar"} },
};

type MarkerData = { id:string; name:string; category:string; description:string; latitude:number; longitude:number; photos?:string; };
type FamilyData = { id:string; headName:string; population:number; familyAttr:string|null; tags:string; headPhone:string|null; photos:string|null; notes:string|null; latitude:number|null; longitude:number|null; group?:{name:string} };

function getCat(k:string) { return MARKER_CATEGORIES.find(function(c:any){return c.key===k;})||MARKER_CATEGORIES[0]; }

export default function SatelliteMapClient() {
  const { data: session } = useSession();
  const [gps, setGps] = useState({ villageLat: 47.217881, villageLng: 127.254934, workTeamLat: 47.220081, workTeamLng: 127.261887 });

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setGps({
        villageLat: parseFloat(d.villageLat) || 47.217881,
        villageLng: parseFloat(d.villageLng) || 127.254934,
        workTeamLat: parseFloat(d.workTeamLat) || 47.220081,
        workTeamLng: parseFloat(d.workTeamLng) || 127.261887,
      });
    }).catch(() => {});
  }, []);

  const MAP_CENTER: [number, number] = [gps.villageLat, gps.villageLng];
  const WORK_TEAM_POS: [number, number] = [gps.workTeamLat, gps.workTeamLng];
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map|null>(null);
  const tileLayerRef = useRef<L.TileLayer|null>(null);
  const markerGroupRef = useRef<L.LayerGroup|null>(null);
  const familyGroupRef = useRef<L.LayerGroup|null>(null);
  const polygonLayerRef = useRef<L.Polygon|null>(null);
  const polygonDoneRef = useRef(false);
  const clickLatLng = useRef<L.LatLng|null>(null);
function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

  const selectModeRef = useRef(false);
  const selectCornersRef = useRef<[number,number][]>([]);

  const [markers,setMarkers] = useState<MarkerData[]>([]);
  const [families,setFamilies] = useState<FamilyData[]>([]);
  const [allFamilies,setAllFamilies] = useState<FamilyData[]>([]);
  const [loading,setLoading] = useState(true);
  const [layer,setLayer] = useState("esri_sat");
  const [searchText,setSearchText] = useState("");
  const [searchResults,setSearchResults] = useState<Array<{type:string;label:string;lat:number;lng:number;id?:string}>>([]);
  const [showSearch,setShowSearch] = useState(false);
  const [searching,setSearching] = useState(false);
  const [legendOpen,setLegendOpen] = useState(true);

  // Rectangle
  const [selectMode,setSelectMode] = useState(false);
  const [selectCorners,setSelectCorners] = useState<[number,number][]>([]);
  const [selectResults,setSelectResults] = useState<{markers:MarkerData[];families:FamilyData[]}|null>(null);
  const [polygonDone,setPolygonDone] = useState(false);

  // Picker
  const [pickerOpen,setPickerOpen] = useState(false);
  const [familyPickerOpen,setFamilyPickerOpen] = useState(false);
  const [familySearchText,setFamilySearchText] = useState("");

  // Marker form
  const [markerFormOpen,setMarkerFormOpen] = useState(false);
  const [editMarker,setEditMarker] = useState<MarkerData|null>(null);
  const [markerName,setMarkerName] = useState(""); const [markerCat,setMarkerCat] = useState("general"); const [markerDesc,setMarkerDesc] = useState(""); 

  // Family form
  const [familyFormOpen,setFamilyFormOpen] = useState(false);
  const [editFamily,setEditFamily] = useState<FamilyData|null>(null);
  const [ffName,setFfName] = useState(""); const [ffPop,setFfPop] = useState(1); const [ffAttr,setFfAttr] = useState<string[]>([]); const [ffTags,setFfTags] = useState<string[]>([]);
  const [ffPhone,setFfPhone] = useState(""); const [ffSpouseName,setFfSpouseName] = useState(""); const [ffSpousePhone,setFfSpousePhone] = useState(""); const [ffSpouseIdCard,setFfSpouseIdCard] = useState(""); const [ffAddress,setFfAddress] = useState(""); const [ffIncome,setFfIncome] = useState(""); const [ffPhotos,setFfPhotos] = useState<string[]>([]); const [ffNotes,setFfNotes] = useState("");
  const [uploading,setUploading] = useState(false); const [saving,setSaving] = useState(false);

  // Detail
  const [detailItem,setDetailItem] = useState<{type:"marker"|"family";data:any}|null>(null);

  const router = useRouter();

  const loadData = useCallback(async()=>{
    try{
      const [mRes,fRes,fAllRes] = await Promise.all([
        fetch("/api/village/markers"),
        fetch("/api/village/families?hasCoords=true&limit=500"),
        fetch("/api/village/families?limit=2000"),
      ]);
      setMarkers(((await mRes.json()).markers||[]));
      const fData = await fRes.json();
      setFamilies((fData.families||[]).filter(function(f:any){return f.latitude&&f.longitude;}));
      const faData = await fAllRes.json();
      setAllFamilies(faData.families||[]);
    }catch(e){console.error(e);}
  },[]);

  useEffect(()=>{loadData().finally(()=>setLoading(false));},[loadData]);

  // Init map
  useEffect(()=>{
    if(!mapRef.current||loading)return;
    if(mapInstance.current)return;
    const map = L.map(mapRef.current,{center:MAP_CENTER,zoom:15,zoomControl:true});
    const cfg = TILE_LAYERS[layer];
    tileLayerRef.current = L.tileLayer(cfg.url,cfg.options).addTo(map);
    markerGroupRef.current = L.layerGroup().addTo(map);
    familyGroupRef.current = L.layerGroup().addTo(map);

    const workIcon = L.divIcon({html:'<div style="background:#dc2626;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:16px">🏠</div>',iconSize:[36,36],iconAnchor:[18,18]});
    L.marker(WORK_TEAM_POS,{icon:workIcon}).bindPopup("<b>驻村工作队</b>").addTo(map);

    map.on("click",function(e:L.LeafletMouseEvent){
      if(selectModeRef.current){
        if(polygonDoneRef.current){
          // Check if click is inside the polygon
          const pts=selectCornersRef.current.map(function(p){return L.latLng(p[0],p[1]);});
          if(true){
            try{if(pointInPolygon([e.latlng.lat,e.latlng.lng],selectCornersRef.current)){clickLatLng.current=e.latlng;setPickerOpen(true);return;}}catch{}
          }
          // Bounding box check as fallback
          const minLat=999,maxLat=-999,minLng=999,maxLng=-999;
          for(var pi=0;pi<pts.length;pi++){minLat=Math.min(minLat,pts[pi].lat);maxLat=Math.max(maxLat,pts[pi].lat);minLng=Math.min(minLng,pts[pi].lng);maxLng=Math.max(maxLng,pts[pi].lng);}
          if(e.latlng.lat>=minLat&&e.latlng.lat<=maxLat&&e.latlng.lng>=minLng&&e.latlng.lng<=maxLng){clickLatLng.current=e.latlng;setPickerOpen(true);return;}
          return;
        }
        selectCornersRef.current=[...selectCornersRef.current,[e.latlng.lat,e.latlng.lng]];
        setSelectCorners([...selectCornersRef.current]);
        return;
      }
      clickLatLng.current=e.latlng;setPickerOpen(true);
    });

    mapInstance.current=map;
    return function(){map.remove();mapInstance.current=null;};
  },[loading]);

  const finishSelect = function(){
    const pts=selectCornersRef.current;
    if(pts.length<3){alert("请至少选择3个点构成区域");return;}
    polygonDoneRef.current=true;setPolygonDone(true);
    const minLat=999,maxLat=-999,minLng=999,maxLng=-999;
    for(var pi=0;pi<pts.length;pi++){minLat=Math.min(minLat,pts[pi][0]);maxLat=Math.max(maxLat,pts[pi][0]);minLng=Math.min(minLng,pts[pi][1]);maxLng=Math.max(maxLng,pts[pi][1]);}
    const inR=function(lat:number,lng:number){return lat>=minLat&&lat<=maxLat&&lng>=minLng&&lng<=maxLng;};
    setSelectResults({markers:markers.filter(function(m){return inR(m.latitude,m.longitude);}),families:families.filter(function(f){return f.latitude&&f.longitude&&inR(f.latitude,f.longitude);})});
  };

  useEffect(()=>{if(polygonLayerRef.current){polygonLayerRef.current.remove();polygonLayerRef.current=null;}if(selectCorners.length>=2&&mapInstance.current&&!polygonDone){var pts=selectCorners.map(function(p){return[p[0],p[1]];});polygonLayerRef.current=L.polygon(pts,{color:"#3b82f6",weight:2,fillOpacity:0.15,dashArray:"8 4"}).addTo(mapInstance.current);}if(polygonDone&&selectCorners.length>=3&&mapInstance.current){var pts=selectCorners.map(function(p){return[p[0],p[1]];});if(polygonLayerRef.current)polygonLayerRef.current.remove();polygonLayerRef.current=L.polygon(pts,{color:"#ef4444",weight:3,fillOpacity:0.1}).addTo(mapInstance.current);var p=polygonLayerRef.current;p.on("mouseover",function(){this.setStyle({weight:5,color:"#ff2222"});this.bringToFront();});p.on("mouseout",function(){this.setStyle({weight:3,color:"#ef4444"});});}return function(){if(polygonLayerRef.current){polygonLayerRef.current.remove();polygonLayerRef.current=null;}};},[selectCorners, polygonDone]);

  // Update markers
  useEffect(()=>{var mg=markerGroupRef.current;if(!mg||loading)return;mg.clearLayers();for(var i=0;i<markers.length;i++){var m=markers[i];var cat=getCat(m.category);var icon=L.divIcon({html:`<div style="background:linear-gradient(135deg,${cat.color}22,${cat.color}44);border:2px solid ${cat.color};border-radius:50% 50% 50% 0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px ${cat.color}44">${cat.icon}</div>`,iconSize:[32,32],iconAnchor:[16,32],className:""});var mk=L.marker([m.latitude,m.longitude],{icon:icon});mk.bindTooltip(`<b>${m.name}</b><br/><small>${cat.label}</small>`,{direction:"top",offset:[0,-20]});mk.bindPopup(`<b>${m.name}</b><br/><small>${cat.label}</small>`);mk.on("click",function(mm:any){return function(e:any){L.DomEvent.stopPropagation(e);setDetailItem({type:"marker",data:mm});if(mapInstance.current)mapInstance.current.closePopup();};}(m));mk.addTo(mg);}},[markers, loading]);

  // Update families
  useEffect(()=>{var fg=familyGroupRef.current;if(!fg||loading)return;fg.clearLayers();for(var i=0;i<families.length;i++){var f=families[i];if(!f.latitude||!f.longitude)continue;var color=ATTR_COLORS[f.familyAttr||""]||"#6b7280";var icon=L.divIcon({html:`<div style="background:linear-gradient(135deg,${color},${color}cc);color:#fff;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3)"><span style="transform:rotate(45deg);font-size:11px;font-weight:700">${f.population}</span></div>`,iconSize:[34,34],iconAnchor:[17,34],className:""});var mk=L.marker([f.latitude,f.longitude],{icon:icon});mk.bindTooltip(`<b>${f.headName}</b><br/>${f.population}人${f.familyAttr?" · "+f.familyAttr:""}`,{direction:"top",offset:[0,-20]});mk.bindPopup(`<b>${f.headName}</b><br/>${f.population}人${f.familyAttr?" · "+f.familyAttr:""}`);mk.on("click",function(ff:any){return function(e:any){L.DomEvent.stopPropagation(e);setDetailItem({type:"family",data:ff});if(mapInstance.current)mapInstance.current.closePopup();};}(f));mk.addTo(fg);}},[families, loading]);

  // Layer switch
  const switchLayer=function(k:string){setLayer(k);var map=mapInstance.current;if(!map)return;if(tileLayerRef.current)map.removeLayer(tileLayerRef.current);tileLayerRef.current=L.tileLayer(TILE_LAYERS[k].url,TILE_LAYERS[k].options).addTo(map);if(markerGroupRef.current)markerGroupRef.current.bringToFront();if(familyGroupRef.current)familyGroupRef.current.bringToFront();};

  // Search
  const doSearch=async function(){var q=searchText.trim().toLowerCase();if(!q){setSearchResults([]);setShowSearch(false);return;}setSearching(true);var res:any[]=[];for(var i=0;i<markers.length;i++){if(markers[i].name.toLowerCase().includes(q))res.push({type:"marker",label:"📍 "+markers[i].name+" ("+getCat(markers[i].category).label+")",lat:markers[i].latitude,lng:markers[i].longitude});}for(var j=0;j<families.length;j++){if(families[j].headName.toLowerCase().includes(q)||(families[j].headPhone&&families[j].headPhone.includes(q)))res.push({type:"family",label:"👤 "+families[j].headName+(families[j].headPhone?" 📞"+families[j].headPhone:"")+" ("+families[j].population+"人)",lat:families[j].latitude,lng:families[j].longitude,id:families[j].id});}try{var gr=await fetch("/api/village/geocode?keyword="+encodeURIComponent(searchText.trim()));var gd=await gr.json();if(gd.locations)for(var k=0;k<Math.min(3,gd.locations.length);k++)res.push({type:"geocode",label:"🔍 "+(gd.locations[k].name||searchText),lat:gd.locations[k].lat,lng:gd.locations[k].lon});}catch{}setSearchResults(res.slice(0,10));setShowSearch(true);setSearching(false);};

  const flyTo=function(lat:number,lng:number){mapInstance.current?.setView([lat,lng],17);setShowSearch(false);setSearchText("");};

  // Save marker
  const saveMarker=async function(){if(!markerName.trim()||!clickLatLng.current)return;setSaving(true);try{var body={name:markerName.trim(),category:markerCat,description:markerDesc,latitude:clickLatLng.current.lat,longitude:clickLatLng.current.lng};if(editMarker)await fetch("/api/village/markers/"+editMarker.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});else await fetch("/api/village/markers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});setMarkerFormOpen(false);setEditMarker(null);loadData();}catch{alert("保存失败");}finally{setSaving(false);}};

  // Save family
  const saveFamily=async function(){if(!ffName.trim())return;if(!clickLatLng.current&&!editFamily)return;setSaving(true);try{if(editFamily){var body:any={headName:ffName.trim(),population:ffPop,familyAttr:[...ffAttr,...ffTags].join(","),headPhone:ffPhone,spouseName:ffSpouseName,spousePhone:ffSpousePhone,spouseIdCard:ffSpouseIdCard,address:ffAddress,income:ffIncome?Number(ffIncome):null,notes:ffNotes,photos:JSON.stringify(ffPhotos),latitude:clickLatLng.current?clickLatLng.current.lat:editFamily.latitude,longitude:clickLatLng.current?clickLatLng.current.lng:editFamily.longitude};var res=await fetch("/api/village/families/"+editFamily.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!res.ok){var err=await res.json().catch(function(){return{error:"服务器内部错误"};});alert(err.error||"保存失败");setSaving(false);return;}}else{var fd=new FormData();fd.append("headName",ffName.trim());fd.append("population",String(ffPop));fd.append("familyAttr",[...ffAttr,...ffTags].join(","));fd.append("headPhone",ffPhone);fd.append("spouseName",ffSpouseName);fd.append("spousePhone",ffSpousePhone);fd.append("spouseIdCard",ffSpouseIdCard);fd.append("address",ffAddress);fd.append("income",ffIncome?ffIncome:"");fd.append("notes",ffNotes);fd.append("photoUrls",JSON.stringify(ffPhotos));fd.append("latitude",String(clickLatLng.current?clickLatLng.current.lat:editFamily?.latitude||0));fd.append("longitude",String(clickLatLng.current?clickLatLng.current.lng:editFamily?.longitude||0));var res2=await fetch("/api/village/families",{method:"POST",body:fd});if(!res2.ok){var err2=await res2.json().catch(function(){return{error:"服务器内部错误"};});alert(err2.error||"保存失败");setSaving(false);return;}}setFamilyFormOpen(false);setEditFamily(null);loadData();}catch(e:any){alert("保存失败: "+(e.message||""));}finally{setSaving(false);}};

  const uploadPhoto=async function(e:React.ChangeEvent<HTMLInputElement>){var file=e.target.files?.[0];if(!file)return;setUploading(true);try{var fd=new FormData();fd.append("file",file);var res=await fetch("/api/photos/upload",{method:"POST",body:fd});var data=await res.json();if(data.success)setFfPhotos(function(p:any){return[...p,data.url];});else alert(data.error||"上传失败");}catch{alert("上传失败");}finally{setUploading(false);e.target.value="";}};

  // Open marker form
  const openMarkerForm=function(){setPickerOpen(false);setEditMarker(null);setMarkerName("");setMarkerCat("general");setMarkerDesc("");setMarkerFormOpen(true);};

  // Open family picker (search existing or create new)
  const openFamilyPicker=function(){setPickerOpen(false);setFamilySearchText("");setFamilyPickerOpen(true);};

  // From family picker, create new
  const startNewFamily=function(){setFamilyPickerOpen(false);setEditFamily(null);setFfName("");setFfPop(1);setFfAttr([]);setFfTags([]);setFfPhone("");setFfSpouseName("");setFfSpousePhone("");setFfSpouseIdCard("");setFfAddress("");setFfIncome("");setFfPhotos([]);setFfNotes("");setFamilyFormOpen(true);};

  // From family picker, select existing (just update coords)
  const selectExistingFamily=async function(f:FamilyData){setFamilyPickerOpen(false);setSaving(true);try{const r=await fetch("/api/village/families/"+f.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({latitude:clickLatLng.current?.lat,longitude:clickLatLng.current?.lng,})});if(!r.ok){const e=await r.json();alert(e.error||"更新失败");return}await new Promise(resolve=>setTimeout(resolve,300));await loadData();}catch(e){alert("更新失败");console.error(e);}finally{setSaving(false);}};

  const clearSelect=function(){setSelectMode(false);selectModeRef.current=false;polygonDoneRef.current=false;setPolygonDone(false);selectCornersRef.current=[];setSelectCorners([]);setSelectResults(null);};

  if(loading)return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;

  const lk=Object.keys(TILE_LAYERS);
  const filteredFamilies = allFamilies.filter(function(f:any){var q=familySearchText.toLowerCase();return (f.headName||"").toLowerCase().includes(q);}).slice(0,50);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Toolbar */}
      <div className="p-3 border-b bg-white flex items-center gap-3 flex-wrap z-10">
        <button onClick={function(){router.push("/village");}} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
        <h1 className="text-lg font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500"/>村庄地图</h1>
        <div className="relative flex items-center gap-1 flex-1 min-w-[180px] max-w-sm">
          <input type="text" value={searchText} onChange={function(e:any){setSearchText(e.target.value);if(!e.target.value)setShowSearch(false);}} onKeyDown={function(e:any){if(e.key==="Enter")doSearch();}} onFocus={function(){if(searchText.trim())doSearch();}} placeholder="搜索标记、农户或地点..." className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          <button onClick={doSearch} disabled={searching} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"><Search className="w-4 h-4"/></button>
          {showSearch&&searchResults.length>0&&(<div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-[3000] max-h-64 overflow-y-auto">{searchResults.map(function(r:any,i:number){return <button key={i} onClick={function(){flyTo(r.lat,r.lng);}} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-b-0">{r.label}</button>;})}</div>)}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 flex-wrap">{lk.map(function(k:any){return <button key={k} onClick={function(){switchLayer(k);}} className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${layer===k?"bg-white shadow text-blue-700 font-medium":"text-gray-600 hover:text-gray-900"}`}>{TILE_LAYERS[k].name}</button>;})}</div>
        <button onClick={function(){if(selectMode){clearSelect();}else{setSelectMode(true);selectModeRef.current=true;polygonDoneRef.current=false;setPolygonDone(false);setSelectCorners([]);selectCornersRef.current=[];}}} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${selectMode?"bg-blue-600 text-white":"bg-gray-100 text-gray-700 hover:bg-gray-200"}`}><Square className="w-4 h-4"/>{selectMode?"取消框选":"框选区域"}</button>
        {selectMode&&!polygonDone&&selectCorners.length>=3&&<button onClick={function(){finishSelect();}} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">✅ 完成框选</button>}<div className="text-sm text-gray-500 flex items-center gap-3"><span>📍<b className="text-blue-600">{markers.length}</b></span><span>👤<b className="text-amber-600">{families.length}</b></span></div>
      </div>

      {/* Map */}
      <div className="flex-1 relative" ref={mapRef}>
        {legendOpen?(<div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 text-xs"><div className="flex items-center justify-between mb-2"><span className="font-medium text-gray-700">图例</span><button onClick={function(){setLegendOpen(false);}} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3"/></button></div><div className="space-y-1.5">{MARKER_CATEGORIES.map(function(c:any){return <div key={c.key} className="flex items-center gap-2"><span className="text-base">{c.icon}</span><span className="text-gray-600">{c.label}</span></div>;})}<div className="border-t pt-1.5 mt-1.5 space-y-1.5">{FAMILY_ATTR_OPTIONS.map(function(a:any){return <div key={a} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full" style={{background:ATTR_COLORS[a]||"#999"}}></span><span className="text-gray-600">{a}</span></div>;})}<div className="flex items-center gap-2"><span className="text-base">🏠</span><span className="text-gray-600">驻村工作队</span></div></div></div></div>):(<button onClick={function(){setLegendOpen(true);}} className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700">图例</button>)}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur rounded-lg shadow px-3 py-2 text-xs text-gray-500">{selectMode?(polygonDone?"✅ 点击框选区域可添加信息":selectCorners.length<3?"🖱️ 点击添加点("+(selectCorners.length+1)+"/"+3+"+点)":"🖱️ 继续点击添加点"):"💡 点击地图添加信息"}</div>
        <button onClick={function(){mapInstance.current?.setView(MAP_CENTER,15);}} className="absolute bottom-4 right-4 z-[1000] bg-white rounded-full shadow-lg p-2.5 hover:bg-gray-100"><Navigation className="w-5 h-5 text-blue-600"/></button>
      </div>

      {/* Select results */}
      {selectResults&&(selectResults.markers.length>0||selectResults.families.length>0)&&(<div className="absolute bottom-16 left-4 right-4 z-[1000] bg-white rounded-xl shadow-xl border max-h-48 overflow-y-auto"><div className="p-3 border-b bg-gray-50 flex items-center justify-between sticky top-0"><span className="text-sm font-medium">框选结果：📍{selectResults.markers.length}标记 👤{selectResults.families.length}农户</span><button onClick={clearSelect} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div><div className="p-2 space-y-1">{selectResults.markers.map(function(m:any){return <div key={m.id} className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-blue-50 rounded cursor-pointer" onClick={function(){setDetailItem({type:"marker",data:m});}}><span>{getCat(m.category).icon}</span><span>{m.name}</span></div>;})}{selectResults.families.map(function(f:any){return <div key={f.id} className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-amber-50 rounded cursor-pointer" onClick={function(){setDetailItem({type:"family",data:f});}}><span>👤</span><span>{f.headName}</span><span className="text-xs text-gray-400">{f.population}人{f.familyAttr?" · "+f.familyAttr:""}</span></div>;})}</div></div>)}

      {/* === PICKER === */}
      {pickerOpen&&(<div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-4" onClick={function(){setPickerOpen(false);}}><div className="bg-white rounded-xl shadow-xl p-6 space-y-4 max-w-sm w-full" onClick={function(e:any){e.stopPropagation();}}><h3 className="text-lg font-bold text-center">选择操作</h3><p className="text-xs text-gray-500 text-center">坐标:{clickLatLng.current?.lat.toFixed(6)},{clickLatLng.current?.lng.toFixed(6)}</p><div className="grid grid-cols-2 gap-3"><button onClick={openMarkerForm} className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50"><MapPin className="w-8 h-8 text-blue-500 mx-auto mb-2"/><div className="font-medium text-sm">添加标记</div><div className="text-xs text-gray-400 mt-1">地点/设施</div></button><button onClick={openFamilyPicker} className="p-4 border-2 border-gray-200 rounded-xl hover:border-amber-400 hover:bg-amber-50"><Users className="w-8 h-8 text-amber-500 mx-auto mb-2"/><div className="font-medium text-sm">录入农户</div><div className="text-xs text-gray-400 mt-1">家庭信息</div></button></div></div></div>)}

      {/* === FAMILY PICKER === */}
      {familyPickerOpen&&(<div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-4" onClick={function(){setFamilyPickerOpen(false);}}><div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={function(e:any){e.stopPropagation();}}><div className="flex items-center justify-between"><h3 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-amber-500"/>选择农户</h3><button onClick={function(){setFamilyPickerOpen(false);}} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div><p className="text-xs text-gray-500">可搜索已有农户并补坐标，或新增农户</p><div className="relative"><input type="text" value={familySearchText} onChange={function(e:any){setFamilySearchText(e.target.value);}} placeholder="输入姓名搜索已有农户..." className="w-full border rounded-lg px-3 py-2 text-sm" autoFocus/></div><div className="max-h-48 overflow-y-auto border rounded-lg">{filteredFamilies.map(function(f:any){return <button key={f.id} onClick={function(){selectExistingFamily(f);}} className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b last:border-b-0 flex items-center justify-between"><span>👤 {f.headName}{f.familyAttr?" · "+f.familyAttr:""}{f.headPhone?" 📞"+f.headPhone:""}</span><span className="text-xs text-gray-400">{f.population}人{f.latitude?" ✅已定位":""}</span></button>;})}{filteredFamilies.length===0&&familySearchText&&<div className="px-3 py-2 text-sm text-gray-400 text-center">未找到匹配农户</div>}</div><button onClick={startNewFamily} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700"><Plus className="w-4 h-4"/>新增农户</button></div></div>)}

      {/* === MARKER FORM === */}
      {markerFormOpen&&(<div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" onClick={function(){setMarkerFormOpen(false);}}><div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={function(e:any){e.stopPropagation();}}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">{editMarker?"编辑":"添加标记"}</h3><button onClick={function(){setMarkerFormOpen(false);}} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div><div><label className="block text-sm font-medium mb-1">名称</label><input type="text" value={markerName} onChange={function(e:any){setMarkerName(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" autoFocus placeholder="如：水井、养殖场"/></div><div><label className="block text-sm font-medium mb-1">分类</label><div className="grid grid-cols-3 gap-2">{MARKER_CATEGORIES.map(function(c:any){return <button key={c.key} type="button" onClick={function(){setMarkerCat(c.key);}} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${markerCat===c.key?"border-2 border-blue-500 bg-blue-50":"border-gray-200 hover:border-gray-300"}`}><span>{c.icon}</span><span className="text-xs">{c.label}</span></button>;})}</div></div><div><label className="block text-sm font-medium mb-1">描述</label><textarea value={markerDesc} onChange={function(e:any){setMarkerDesc(e.target.value);}} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"/></div><div className="flex gap-2 justify-end"><button onClick={function(){setMarkerFormOpen(false);}} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button><button onClick={saveMarker} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving?"保存中...":"保存"}</button></div></div></div>)}

      {/* === FAMILY FORM === */}
      {familyFormOpen&&(<div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" onClick={function(){setFamilyFormOpen(false);}}><div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={function(e:any){e.stopPropagation();}}><div className="flex items-center justify-between"><h3 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-amber-500"/>{editFamily?"编辑农户":"新增农户"}</h3><button onClick={function(){setFamilyFormOpen(false);}} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">房主姓名 *</label><input type="text" value={ffName} onChange={function(e:any){setFfName(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" autoFocus placeholder="姓名"/></div><div><label className="block text-sm font-medium mb-1">家庭人口</label><input type="number" value={ffPop} min={1} onChange={function(e:any){setFfPop(parseInt(e.target.value)||1);}} className="w-full border rounded-lg px-3 py-2 text-sm"/></div></div><div><label className="block text-sm font-medium mb-1">主分类（可多选，互斥规则自动处理）</label><div className="flex flex-wrap gap-2">{FAMILY_ATTR_OPTIONS.map(function(a:any){var active=ffAttr.includes(a);return <button key={a} type="button" onClick={function(){setFfAttr(function(p:any){if(p.includes(a))return p.filter(function(x:any){return x!==a;});var next=[...p,a];if(a==="一般农户")next=next.filter(function(x:any){return x!=="脱贫户"&&x!=="监测户";});if(a==="脱贫户")next=next.filter(function(x:any){return x!=="一般农户"&&x!=="监测户";});if(a==="监测户")next=next.filter(function(x:any){return x!=="一般农户"&&x!=="脱贫户";});return next;});}} className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${active?"bg-amber-500 text-white border-amber-500":"bg-white text-gray-600 border-gray-300 hover:border-amber-400"}`}>{a}</button>;})}</div></div><div><label className="block text-sm font-medium mb-1">多标签（可多选）</label><div className="flex flex-wrap gap-2">{TAG_OPTIONS.map(function(t:any){var active=ffTags.includes(t);return <button key={t} type="button" onClick={function(){setFfTags(function(p:any){return p.includes(t)?p.filter(function(x:any){return x!==t;}):[...p,t];});}} className={`px-3 py-1 text-xs rounded-full border transition-colors ${active?"bg-blue-500 text-white border-blue-500":"bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>{t}</button>;})}</div></div><div><label className="block text-sm font-medium mb-1">电话</label><input type="text" value={ffPhone} onChange={function(e:any){setFfPhone(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="手机号"/></div><div className="border-t pt-3 mt-2"><label className="block text-sm font-medium text-gray-500 mb-2">配偶信息</label><div className="grid grid-cols-3 gap-2"><div><label className="block text-xs text-gray-400 mb-0.5">配偶姓名</label><input type="text" value={ffSpouseName} onChange={function(e:any){setFfSpouseName(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="姓名"/></div><div><label className="block text-xs text-gray-400 mb-0.5">配偶电话</label><input type="text" value={ffSpousePhone} onChange={function(e:any){setFfSpousePhone(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="电话"/></div><div><label className="block text-xs text-gray-400 mb-0.5">配偶身份证</label><input type="text" value={ffSpouseIdCard} onChange={function(e:any){setFfSpouseIdCard(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="身份证"/></div></div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">家庭地址</label><input type="text" value={ffAddress} onChange={function(e:any){setFfAddress(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="地址"/></div><div><label className="block text-sm font-medium mb-1">年收入</label><input type="text" value={ffIncome} onChange={function(e:any){setFfIncome(e.target.value);}} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="年收入情况"/></div></div><div><label className="block text-sm font-medium mb-1">照片</label><div className="flex items-center gap-3"><label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100 text-sm"><Camera className="w-4 h-4"/>{uploading?"上传中...":"上传照片"}<input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" disabled={uploading}/></label><span className="text-xs text-gray-400">上传至服务器本地存储</span></div>{ffPhotos.length>0&&<div className="flex gap-2 mt-2 flex-wrap">{ffPhotos.map(function(url:any,i:number){return <div key={i} className="relative group"><img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border"/><button onClick={function(){setFfPhotos(function(p:any){return p.filter(function(_:any,j:number){return j!==i;});});}} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button></div>;})}</div>}</div><div><label className="block text-sm font-medium mb-1">备注</label><RichTextEditor content={ffNotes} onChange={function(html:any){setFfNotes(html);}} placeholder="补充说明..."/></div><div className="flex gap-2 justify-end pt-2"><button onClick={function(){setFamilyFormOpen(false);}} className="px-4 py-2 border rounded-lg hover:bg-gray-50">取消</button><button onClick={saveFamily} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">{saving?"保存中...":"保存"}</button></div></div></div>)}

      {/* === DETAIL === */}
      {detailItem&&(<div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-4" onClick={function(){setDetailItem(null);}}><div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={function(e:any){e.stopPropagation();}}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">{detailItem.type==="marker"?"标记详情":"农户详情"}</h3><button onClick={function(){setDetailItem(null);}} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5"/></button></div>
        {detailItem.type==="marker"&&(function(){var m=detailItem.data as MarkerData;var cat=getCat(m.category);return <><div className="flex items-center gap-2"><span className="text-2xl">{cat.icon}</span><span className="text-sm text-gray-500">{cat.label}</span></div><h2 className="text-xl font-bold">{m.name}</h2>{m.description&&<><p className="text-gray-600">{m.description}</p></>}<div className="text-xs text-gray-400">坐标:{m.latitude},{m.longitude}</div><div className="flex gap-2 pt-2"><button onClick={function(){setDetailItem(null);setEditMarker(m);setMarkerName(m.name);setMarkerCat(m.category);setMarkerDesc(m.description);setMarkerFormOpen(true);}} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">编辑</button><button onClick={async function(){if(confirm("确定删除？")){await fetch("/api/village/markers/"+m.id,{method:"DELETE"});setDetailItem(null);loadData();}}} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">删除</button></div></>;})()}
        {detailItem.type==="family"&&(function(){var f=detailItem.data as FamilyData;var tags=(function(){try{return JSON.parse(f.tags||"[]");}catch{return[];}})();var photos=(function(){try{return JSON.parse(f.photos||"[]");}catch{return[];}})();return <><h2 className="text-xl font-bold">{f.headName}</h2><div className="flex gap-4 text-sm text-gray-600"><span>👥 {f.population}人</span>{f.familyAttr&&<span className={`px-2 py-0.5 rounded-full text-xs text-white`} style={{background:ATTR_COLORS[f.familyAttr]||"#999"}}>{f.familyAttr}</span>}{f.headPhone&&<span>📞 {f.headPhone}</span>}</div>{f.spouseName&&<div className="text-sm text-gray-500">配偶: {f.spouseName}{f.spousePhone?" · "+f.spousePhone:""}</div>}{f.address&&<div className="text-sm text-gray-500">📍 {f.address}</div>}{f.income&&<div className="text-sm text-gray-500">💰 {f.income}</div>}{tags.length>0&&<div className="flex flex-wrap gap-1">{tags.map(function(t:any,i:number){return <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{t}</span>;})}</div>}{f.notes&&<div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{__html:sanitizeHtml(f.notes||"")}}/>}{photos.length>0&&<div className="flex gap-2 flex-wrap">{photos.map(function(url:any,i:number){return <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-lg border cursor-pointer" onClick={function(){window.open(url,"_blank");}}/>;})}</div>}<div className="text-xs text-gray-400">坐标:{f.latitude},{f.longitude}</div><div className="flex gap-2 pt-2"><button onClick={function(){setDetailItem(null);setEditFamily(f);setFfName(f.headName);setFfPop(f.population);setFfAttr((function(){var a=(f.familyAttr||"").split(",").filter(Boolean);return a.filter(function(x){return FAMILY_ATTR_OPTIONS.includes(x);});})());setFfTags((function(){var a=(f.familyAttr||"").split(",").filter(Boolean);return a.filter(function(x){return TAG_OPTIONS.includes(x);});})());setFfPhone(f.headPhone||"");setFfSpouseName(f.spouseName||"");setFfSpousePhone(f.spousePhone||"");setFfSpouseIdCard(f.spouseIdCard||"");setFfAddress(f.address||"");setFfIncome(f.income||"");setFfPhotos(photos);setFfNotes(f.notes||"");setFamilyFormOpen(true);}} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">编辑</button><button onClick={async function(){if(confirm("确定删除？")){await fetch("/api/village/families/"+f.id,{method:"DELETE"});setDetailItem(null);loadData();}}} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">删除</button></div></>;})()}
      </div></div>)}
    </div>
  );
}