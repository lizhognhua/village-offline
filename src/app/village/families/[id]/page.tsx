"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MapPin, Users, User, Camera, Save, X, Pencil,
  AlertTriangle, Footprints, Heart, Home, Calendar, Plus, Trash2, Image as ImageIcon,
  Upload, Link as LinkIcon, FileText, Download, Eye
} from "lucide-react";

var attrColor: Record<string,string> = {
  "脱贫户":"bg-green-100 text-green-700",
  "监测户":"bg-orange-100 text-orange-700",
  "低保户":"bg-blue-100 text-blue-700",
  "五保户":"bg-purple-100 text-purple-700"
};

function fmtDate(d: string) {
  var dt = new Date(d);
  return dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月" + dt.getDate() + "日";
}

export default function FamilyDetail() {
  var p = useParams();
  var r = useRouter();
  var [data, setData] = useState<any>(null);
  var [warnings, setWarnings] = useState<any[]>([]);
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [editMode, setEditMode] = useState(false);
  var [editForm, setEditForm] = useState<any>({});
  var [newPhotos, setNewPhotos] = useState<File[]>([]);
  var [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  var [photoMode, setPhotoMode] = useState<"upload" | "url">("upload");
  var [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([]);
  var [urlInput, setUrlInput] = useState("");
  var fileRef = useRef<HTMLInputElement>(null);
  // 附件（一户一策等）
  var [newFiles, setNewFiles] = useState<File[]>([]);
  var [newFileNames, setNewFileNames] = useState<string[]>([]);
  // 家庭成员详情弹窗
  var [selectedMember, setSelectedMember] = useState<any>(null);
  var [showMemberForm, setShowMemberForm] = useState(false);
  var [editMemberId, setEditMemberId] = useState<string | null>(null);
  var [memberForm, setMemberForm] = useState({ name: "", relation: "", gender: "", idCard: "", phone: "", birthDate: "", education: "", occupation: "", healthStatus: "", healthNote: "" });
  var [memberSaving, setMemberSaving] = useState(false);

  // 家庭成员增删改
  var openAddMember = function() { setEditMemberId(null); setMemberForm({ name: "", relation: "", gender: "", idCard: "", phone: "", birthDate: "", education: "", occupation: "", healthStatus: "", healthNote: "" }); setShowMemberForm(true); };
  var openEditMember = function(m: any) { setEditMemberId(m.id); setMemberForm({ name: m.name || "", relation: m.relation || "", gender: m.gender || "", idCard: m.idCard || "", phone: m.phone || "", birthDate: m.birthDate ? new Date(m.birthDate).toISOString().slice(0,10) : "", education: m.education || "", occupation: m.occupation || "", healthStatus: m.healthStatus || "", healthNote: m.healthNote || "" }); setShowMemberForm(true); };
  var saveMember = async function() {
    if (!memberForm.name || !memberForm.relation) { alert("请填写姓名和与户主关系"); return; }
    setMemberSaving(true);
    var url = editMemberId ? "/api/village/families/" + f.id + "/members/" + editMemberId : "/api/village/families/" + f.id + "/members";
    var r = await fetch(url, { method: editMemberId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(memberForm) });
    if (r.ok) { setShowMemberForm(false); loadData(); }
    else { var d = await r.json().catch(function() { return { error: "操作失败" }; }); alert(d.error || "操作失败"); }
    setMemberSaving(false);
  };
  var deleteMember = async function(memberId: string) {
    if (!confirm("确定删除该成员？")) return;
    var r = await fetch("/api/village/families/" + f.id + "/members?memberId=" + memberId, { method: "DELETE" });
    if (r.ok) loadData(); else alert("删除失败");
  };

  var loadData = async function() {
    setLoading(true);
    try {
      var res = await fetch("/api/village/families/" + p.id);
      var family = await res.json();
      setData(family);
      setEditForm({
        headName: family.headName || "",
        headGender: family.headGender || "",
        headPhone: family.headPhone || "",
        headIdCard: family.headIdCard || "",
        address: family.address || "",
        population: family.population || 1,
        familyAttr: family.familyAttr || "",
      });
      if (family?.headName) {
        try {
          var wr = await fetch("/api/warnings/records?search=" + encodeURIComponent(family.headName) + "&limit=50");
          var wd = await wr.json();
          setWarnings(wd.records || []);
        } catch(e) {}
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(function() { loadData(); }, [p.id]);

  var photos = (function() {
    try { return JSON.parse(data?.photos || "[]"); } catch(e) { return []; }
  })();
  var allPhotos = photos.map(function(p: string) { return p.startsWith("/uploads/") ? p.replace("/uploads/", "/api/uploads/") : p; });

  // Save edits
  var handleSave = async function() {
    setSaving(true);
    try {
      var fd = new FormData();
      fd.append("headName", editForm.headName);
      fd.append("headGender", editForm.headGender);
      fd.append("headPhone", editForm.headPhone);
      fd.append("headIdCard", editForm.headIdCard);
      fd.append("address", editForm.address);
      fd.append("population", String(editForm.population || 1));
      fd.append("familyAttr", editForm.familyAttr || "");
      fd.append("existingPhotos", JSON.stringify(photos));
      fd.append("existingFiles", JSON.stringify((function() { try { return JSON.parse(data?.files || "[]"); } catch(e) { return []; } })()));
      newPhotos.forEach(function(f) { fd.append("photos", f); });
      newFiles.forEach(function(f) { fd.append("files", f); });
      if (editPhotoUrls.length > 0) {
        fd.append("photoUrls", JSON.stringify(editPhotoUrls));
      }
      var res = await fetch("/api/village/families/" + p.id, {
        method: "PUT",
        body: fd,
      });
      if (res.ok) {
        setEditMode(false);
        setNewPhotos([]);
        setPhotoPreviews([]);
        setEditPhotoUrls([]);
        setUrlInput("");
        // Upload new files to Paperless in background
        var filesToUpload = newFiles;
        if (filesToUpload.length > 0) {
          (async function() {
            var uploaded = 0;
            for (var i = 0; i < filesToUpload.length; i++) {
              try {
                var fd2 = new FormData();
                fd2.append("file", filesToUpload[i]);
                fd2.append("title", filesToUpload[i].name);
                var pr = await fetch("/api/paperless/training", { method: "POST", body: fd2 });
                if (pr.ok) uploaded++;
              } catch {}
            }
            console.log("Paperless: " + uploaded + "/" + filesToUpload.length + " files uploaded");
          })();
        }
        setNewFiles([]);
        setNewFileNames([]);
        loadData();
      } else {
        var err = await res.json();
        alert("保存失败: " + (err.error || "未知错误"));
      }
    } catch(e: any) { alert("保存失败: " + e.message); }
    finally { setSaving(false); }
  };


  // Delete family
  var handleDelete = async function() {
    if (!confirm("确定要删除" + data.headName + "么？")) return;
    setLoading(true);
    try {
      var res = await fetch("/api/village/families/" + p.id, { method: "DELETE" });
      if (res.ok) {
        r.push("/village");
      } else {
        var err = await res.json();
        alert("删除失败: " + (err.error || "未知错误"));
        setLoading(false);
      }
    } catch(e: any) { alert("删除失败: " + e.message); setLoading(false); }
  };

  var handlePhotoSelect = function(e: React.ChangeEvent<HTMLInputElement>) {
    var files = Array.from(e.target.files || []);
    setNewPhotos(function(prev) { return prev.concat(files); });
    files.forEach(function(f) {
      var reader = new FileReader();
      reader.onload = function(ev) { setPhotoPreviews(function(p) { return p.concat([ev.target?.result as string]); }); };
      reader.readAsDataURL(f);
    });
  };

  var removeNewPhoto = function(i: number) {
    setNewPhotos(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
    setPhotoPreviews(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
  };

  var addEditUrl = function() {
    var url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      alert("请输入有效的 URL（以 http:// 或 https:// 开头）");
      return;
    }
    setEditPhotoUrls(function(prev) { return [...prev, url]; });
    setUrlInput("");
  };

  var removeEditUrl = function(i: number) {
    setEditPhotoUrls(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
  };

  // 附件选择
  var handleFileSelect = function(e: React.ChangeEvent<HTMLInputElement>) {
    var fls = Array.from(e.target.files || []);
    setNewFiles(function(prev: File[]) { return prev.concat(fls); });
    setNewFileNames(function(prev: string[]) { return prev.concat(fls.map(function(f: File) { return f.name; })); });
  };

  var removeNewFile = function(i: number) {
    setNewFiles(function(p: File[]) { return p.filter(function(_: File, idx: number) { return idx !== i; }); });
    setNewFileNames(function(p: string[]) { return p.filter(function(_: string, idx: number) { return idx !== i; }); });
  };

  // 删除已有照片
  var handleDeleteExistingPhoto = function(i: number) {
    if (!confirm("确定删除这张照片？保存后生效。")) return;
    var currentPhotos = (function() { try { return JSON.parse(data?.photos || "[]"); } catch(e) { return []; } })();
    currentPhotos.splice(i, 1);
    data.photos = JSON.stringify(currentPhotos);
    setData({ ...data });
  };

  // 删除已有档案文件
  var handleDeleteExistingFile = function(i: number) {
    if (!confirm("确定删除该档案文件？保存后生效。")) return;
    var currentFiles = (function() { try { return JSON.parse(data?.files || "[]"); } catch(e) { return []; } })();
    currentFiles.splice(i, 1);
    data.files = JSON.stringify(currentFiles);
    setData({ ...data });
  };

  if (loading) return <div className="flex justify-center py-32"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">未找到农户信息</div>;
  var f = data;

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={function() { r.back(); }} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" /> 返回
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
            <Trash2 className="w-4 h-4" /> 删除
          </button>
          <button onClick={function() { setEditMode(!editMode); }}
            className={"flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors " + (editMode ? "bg-gray-100 text-gray-600" : "bg-primary-600 text-white hover:bg-primary-700")}>
            <Pencil className="w-4 h-4" /> {editMode ? "取消编辑" : "编辑信息"}
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-bold text-2xl">{f.headName.charAt(0)}</span>
          </div>
          <div>
            {editMode ? (
              <input value={editForm.headName}
                onChange={function(e) { setEditForm(function(prev:any) { return {...prev, headName: e.target.value}; }); }}
                className="text-xl font-bold text-gray-900 border-b-2 border-primary-400 outline-none w-32" />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{f.headName}</h1>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {f.familyAttr && f.familyAttr.split(",").filter(Boolean).map(function(attr: string) {
                return <span key={attr} className={"text-xs px-2 py-0.5 rounded " + (attrColor[attr] || "bg-gray-100 text-gray-500")}>{attr}</span>;
              })}
              <span className="text-sm text-gray-400">{f.group?.name || ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Info Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-primary-600" /> 基本信息
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <InfoField label="性别" value={f.headGender} edit={editMode}
            editValue={editForm.headGender}
            onChange={function(v: string) { setEditForm(function(prev:any) { return {...prev, headGender: v}; }); }}
            type="select" options={["男","女"]} />
          <InfoField label="电话" value={f.headPhone} edit={editMode}
            editValue={editForm.headPhone}
            onChange={function(v: string) { setEditForm(function(prev:any) { return {...prev, headPhone: v}; }); }}
            icon={<Phone className="w-3.5 h-3.5" />} />
          <InfoField label="身份证" value={f.headIdCard} edit={editMode}
            editValue={editForm.headIdCard}
            onChange={function(v: string) { setEditForm(function(prev:any) { return {...prev, headIdCard: v}; }); }} />
          <InfoField label="人口" value={f.population ? f.population + "人" : ""} edit={editMode}
            editValue={String(editForm.population || "")}
            onChange={function(v: string) { setEditForm(function(prev:any) { return {...prev, population: parseInt(v) || 0}; }); }}
            type="number" />
          <InfoField label="地址" value={f.address} edit={editMode}
            editValue={editForm.address}
            onChange={function(v: string) { setEditForm(function(prev:any) { return {...prev, address: v}; }); }}
            icon={<MapPin className="w-3.5 h-3.5" />} span={2} />
          {editMode && (
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">属性/标签（可多选）</label>
              <div className="flex flex-wrap gap-2">
                {["一般农户","脱贫户","监测户","低保户","五保户","党员","村委会成员","高龄老人","赡养儿童","重疾重病","残疾","丧失劳动能力"].map(function(a) {
                  var sel = (editForm.familyAttr || "").split(",").filter(Boolean);
                  return <label key={a} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="checkbox" checked={sel.includes(a)} onChange={function() {
                      var u = sel.includes(a) ? sel.filter(function(x){return x!==a;}) : sel.concat([a]);
                      setEditForm(function(p:any){return{...p,familyAttr:u.join(",")};});
                    }} className="rounded" />{a}
                  </label>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photos Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary-600" /> 农户照片
        </h2>

        {editMode ? (
          /* 编辑模式下带删除按钮 */
          <div className="flex flex-wrap gap-3 mb-4">
            {allPhotos.map(function(url: string, i: number) {
              return (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-100" />
                  <button onClick={function() { handleDeleteExistingPhoto(i); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* 查看模式下无删除按钮 */
          <div className="flex flex-wrap gap-3 mb-4">
            {allPhotos.map(function(url: string, i: number) {
              return (
                <div key={i} className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-100 hover:border-primary-300 transition-colors">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        )}

        {/* Add photo tools */}
        <div className="border-t pt-3">
          {/* Mode Switch */}
          <div className="flex gap-2 mb-3">
            <button onClick={function() { setPhotoMode("upload"); }}
              className={"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors " + (photoMode === "upload" ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
              <Upload className="w-3.5 h-3.5" /> 本地上传/拍照
            </button>
            <button onClick={function() { setPhotoMode("url"); }}
              className={"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors " + (photoMode === "url" ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
              <LinkIcon className="w-3.5 h-3.5" /> URL链接
            </button>
          </div>

          {/* Upload Mode */}
          {photoMode === "upload" && (
            <div>
              <div className="flex flex-wrap gap-3">
                {photoPreviews.map(function(p, i) {
                  return (
                    <div key={"new"+i} className="relative group">
                      <img src={p} alt="" className="w-24 h-24 object-cover rounded-lg border-2 border-green-300" />
                      <button onClick={function() { removeNewPhoto(i); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  );
                })}
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                  <Plus className="w-5 h-5 text-gray-400" />
                  <span className="text-[10px] text-gray-400 mt-1">添加照片</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* URL Mode */}
          {photoMode === "url" && (
            <div>
              <div className="flex gap-2">
                <input value={urlInput}
                  onChange={function(e) { setUrlInput(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); addEditUrl(); } }}
                  placeholder="输入图片URL，按回车添加"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <button onClick={addEditUrl}
                  className="px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 whitespace-nowrap">添加</button>
              </div>
              {editPhotoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {editPhotoUrls.map(function(url, i) {
                    return (
                      <div key={i} className="relative group">
                        <img src={url} alt=""
                          onError={function(e) { (e.target as HTMLImageElement).classList.add("opacity-30"); }}
                          className="w-20 h-20 object-cover rounded-lg border" />
                        <button onClick={function() { removeEditUrl(i); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Files Card — 档案文件 */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-600" /> 档案文件
        </h2>

        {/* 已有文件 */}
        {(() => {
          var existingFiles = (function() { try { return JSON.parse(data?.files || "[]"); } catch(e) { return []; } })();
          if (existingFiles.length > 0) {
            return (
              <div className="flex flex-wrap gap-2 mb-4">
                {existingFiles.map(function(url: string, i: number) {
                  var name = url.split("/").pop() || "附件" + (i + 1);
                  return (
                    <div key={i} className="relative group flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border hover:border-primary-300 transition-colors text-sm">
                      <a href={url.startsWith("/uploads/") ? url.replace("/uploads/", "/api/uploads/") : url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-primary-500" />
                        <span className="text-gray-700 max-w-xs truncate">{name}</span>
                      </a>
                      {editMode && (
                        <button onClick={function() { handleDeleteExistingFile(i); }}
                          className="ml-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }
          return <p className="text-sm text-gray-400 mb-4">暂未上传档案文件</p>;
        })()}

        {/* 新选文件预览 */}
        {newFileNames.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {newFileNames.map(function(name: string, i: number) {
              return (
                <div key={"nf"+i} className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200 text-sm">
                  <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 max-w-xs truncate">{name}</span>
                  <span className="text-xs text-green-500 flex-shrink-0">新增</span>
                  <button onClick={function() { removeNewFile(i); }}
                    className="text-red-400 hover:text-red-600 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {editMode && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" /> 选择档案文件
                <input type="file" multiple onChange={handleFileSelect} className="hidden" />
              </label>
              <span className="text-xs text-gray-400">支持 PDF、Word、Excel、图片等，随编辑保存</span>
            </div>
            {newFileNames.length > 0 && (
              <p className="text-xs text-green-600 mt-2">已选择 {newFileNames.length} 个文件，点击"保存修改"后生效</p>
            )}
          </div>
        )}
      </div>

      
      {true && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" /> 家庭成员 ({f.members.length}人)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {f.members.map(function(m: any) {
              return (
                <div key={m.id} className="bg-gray-50 rounded-lg p-3 text-center cursor-pointer hover:bg-primary-50 hover:border-primary-300 border border-transparent transition-colors"
                  >
                  <div className="flex justify-end gap-1 mb-1">
                    <button onClick={function(e) { e.stopPropagation(); openEditMember(m); }} className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600" title="编辑"><Pencil className="w-3 h-3" /></button>
                    <button onClick={function(e) { e.stopPropagation(); deleteMember(m.id); }} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600" title="删除"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  <div className="w-10 h-10 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-1.5">
                    <span className="text-primary-700 font-bold text-sm">{m.name.charAt(0)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.relation}</p>
                  {m.gender && <p className="text-[10px] text-gray-400">{m.gender}</p>}
                  {m.healthStatus && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${
                      m.healthStatus === "重病" ? "bg-red-100 text-red-600" :
                      m.healthStatus === "慢性病" ? "bg-amber-100 text-amber-600" :
                      m.healthStatus === "残疾" ? "bg-purple-100 text-purple-600" :
                      "bg-green-100 text-green-600"
                    }`}>{m.healthStatus}</span>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={openAddMember} className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> 添加家庭成员
          </button>
        </div>
      )}

      {/* Warnings Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> 预警记录 ({warnings.length}条)
          </h2>
          <Link href={"/warnings/persons?search=" + encodeURIComponent(f.headName)} className="text-xs text-primary-600 hover:underline">查看全部</Link>
        </div>
        {warnings.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无预警记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500"><tr>
              <th className="p-2 text-left">月份</th><th className="p-2 text-left">类别</th><th className="p-2 text-left">子类别</th><th className="p-2 text-left">核实结果</th>
            </tr></thead><tbody>
              {warnings.slice(0, 10).map(function(w: any) {
                return (
                  <tr key={w.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 text-gray-600">{w.month}</td>
                    <td className="p-2 text-gray-800">{w.category}</td>
                    <td className="p-2 text-gray-500 text-xs">{w.subCategory}</td>
                    <td className="p-2">
                      <span className={"text-xs px-2 py-0.5 rounded " + (w.result === '否' ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700")}>{w.result || "待核实"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody></table>
          </div>
        )}
      </div>

      {/* Save button when editing */}
      {editMode && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 shadow-lg">
            <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存修改"}
          </button>
        </div>
      )}

      {/* 家庭成员表单弹窗 */}
      {showMemberForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={function() { setShowMemberForm(false); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={function(e) { e.stopPropagation(); }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editMemberId ? "编辑成员" : "添加成员"}</h3>
              <button onClick={function() { setShowMemberForm(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-0.5">姓名 *</label><input value={memberForm.name} onChange={function(e) { setMemberForm(function(p) { return {...p, name: e.target.value}; }); }} className="w-full border rounded px-2.5 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">与户主关系 *</label><select value={memberForm.relation} onChange={function(e) { setMemberForm(function(p) { return {...p, relation: e.target.value}; }); }} className="w-full border rounded px-2 py-1.5 text-sm"><option value="">请选择</option><option value="配偶">配偶</option><option value="子女">子女</option><option value="父母">父母</option><option value="其他">其他</option></select></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">性别</label><select value={memberForm.gender} onChange={function(e) { setMemberForm(function(p) { return {...p, gender: e.target.value}; }); }} className="w-full border rounded px-2 py-1.5 text-sm"><option value="">请选择</option><option value="男">男</option><option value="女">女</option></select></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">身份证号</label><input value={memberForm.idCard} onChange={function(e) { setMemberForm(function(p) { return {...p, idCard: e.target.value}; }); }} className="w-full border rounded px-2.5 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">电话</label><input value={memberForm.phone} onChange={function(e) { setMemberForm(function(p) { return {...p, phone: e.target.value}; }); }} className="w-full border rounded px-2.5 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">出生日期</label><input type="date" value={memberForm.birthDate} onChange={function(e) { setMemberForm(function(p) { return {...p, birthDate: e.target.value}; }); }} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">学历</label><input value={memberForm.education} onChange={function(e) { setMemberForm(function(p) { return {...p, education: e.target.value}; }); }} className="w-full border rounded px-2.5 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">职业</label><input value={memberForm.occupation} onChange={function(e) { setMemberForm(function(p) { return {...p, occupation: e.target.value}; }); }} className="w-full border rounded px-2.5 py-1.5 text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-0.5">健康状况</label><input value={memberForm.healthStatus} onChange={function(e) { setMemberForm(function(p) { return {...p, healthStatus: e.target.value}; }); }} className="w-full border rounded px-2.5 py-1.5 text-sm" placeholder="健康/慢性病/重病/残疾" /></div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-0.5">健康备注</label><input value={memberForm.healthNote} onChange={function(e) { setMemberForm(function(p) { return {...p, healthNote: e.target.value}; }); }} className="w-full border rounded px-2.5 py-1.5 text-sm" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={function() { setShowMemberForm(false); }} className="px-4 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={saveMember} disabled={memberSaving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50">{memberSaving ? "保存中..." : "保存"}</button>
            </div>
          </div>
          <button onClick={openAddMember} className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> 添加家庭成员
          </button>
        </div>
      )}

      {/* 家庭成员详情弹窗 */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={function() { setSelectedMember(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={function(e: any) { e.stopPropagation(); }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">家庭成员详情</h3>
              <button onClick={function() { setSelectedMember(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-bold text-xl">{selectedMember.name?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{selectedMember.name}</p>
                  <p className="text-sm text-gray-500">{selectedMember.relation}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">性别</span><p className="text-gray-800">{selectedMember.gender || "—"}</p></div>
                <div><span className="text-gray-400">出生日期</span><p className="text-gray-800">{selectedMember.birthDate ? new Date(selectedMember.birthDate).toLocaleDateString("zh-CN") : "—"}</p></div>
                <div><span className="text-gray-400">电话</span><p className="text-gray-800">{selectedMember.phone || "—"}</p></div>
                <div><span className="text-gray-400">学历</span><p className="text-gray-800">{selectedMember.education || "—"}</p></div>
                <div><span className="text-gray-400">职业</span><p className="text-gray-800">{selectedMember.occupation || "—"}</p></div>
                <div className="col-span-2"><span className="text-gray-400">身份证号</span><p className="text-gray-800 font-mono text-xs mt-0.5">{selectedMember.idCard || "—"}</p></div>
              </div>
              <div className="border-t pt-3">
                <span className="text-sm text-gray-400">健康状态</span>
                <div className="flex gap-2 mt-1">
                  {["健康","慢性病","重病","残疾","其他"].map(function(s: string) {
                    var isActive = selectedMember.healthStatus === s;
                    return (
                      <button key={s} onClick={async function() {
                        var newStatus = isActive ? null : s;
                        await fetch("/api/village/families/" + p.id + "/members/" + selectedMember.id, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ healthStatus: newStatus }),
                        });
                        setSelectedMember({ ...selectedMember, healthStatus: newStatus });
                        loadData();
                      }}
                      className={"px-3 py-1 rounded-full text-xs transition-colors " + (isActive ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedMember.healthStatus && (
                <div className="border-t pt-3">
                  <span className="text-sm text-gray-400">健康备注</span>
                  <p className="text-sm text-gray-800 mt-1">{selectedMember.healthNote || "暂无备注"}</p>
                </div>
              )}
            </div>
          </div>
          <button onClick={openAddMember} className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> 添加家庭成员
          </button>
        </div>
      )}
    </div>
  );
}

// Reusable info field — display normally or as editable input
function InfoField({ label, value, edit, editValue, onChange, icon, type, options, span }: {
  label: string; value: any; edit: boolean; editValue: string;
  onChange: (v: string) => void; icon?: React.ReactNode; type?: string;
  options?: string[]; span?: number;
}) {
  var colSpan = span ? "col-span-" + span : "";
  return (
    <div className={colSpan}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {edit ? (
        type === "select" ? (
          <select value={editValue} onChange={function(e) { onChange(e.target.value); }}
            className="w-full border rounded-lg px-2 py-1.5 text-sm">
            <option value="">请选择</option>
            {(options || []).map(function(o) { return <option key={o} value={o}>{o}</option>; })}
          </select>
        ) : (
          <input type={type || "text"} value={editValue}
            onChange={function(e) { onChange(e.target.value); }}
            className="w-full border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-400" />
        )
      ) : (
        <p className="text-sm text-gray-800 flex items-center gap-1">
          {icon}{value || <span className="text-gray-300">—</span>}
        </p>
      )}
    </div>
  );
}
