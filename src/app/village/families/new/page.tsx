"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, User, Phone, MapPin, Users, FileText, Image as ImageIcon, X, Link, Upload } from "lucide-react";

export default function NewFamilyPage() {
  var router = useRouter();
  var [groups, setGroups] = useState<any[]>([]);
  var [saving, setSaving] = useState(false);
  var [photos, setPhotos] = useState<File[]>([]);
  var [previews, setPreviews] = useState<string[]>([]);
  var [photoMode, setPhotoMode] = useState<"upload" | "url">("upload");
  var [photoUrls, setPhotoUrls] = useState<string[]>([]);
  var [urlInput, setUrlInput] = useState("");
  // 附件上传
  var [files, setFiles] = useState<File[]>([]);
  var [fileNames, setFileNames] = useState<string[]>([]);
  var [form, setForm] = useState({
    headName: "", headGender: "", headIdCard: "", headPhone: "",
    registeredAddr: "", actualAddr: "", population: "1",
    familyAttr: "", residenceStatus: "常住户", riskLevel: "低",
    incomeSource: "", groupId: "",
  });

  useEffect(function() {
    fetch("/api/village/groups").then(function(r) { return r.json(); }).then(setGroups).catch(console.error);
  }, []);

  var handlePhotos = function(e: React.ChangeEvent<HTMLInputElement>) {
    var files = Array.from(e.target.files || []);
    setPhotos(function(prev) { return prev.concat(files); });
    files.forEach(function(f) {
      var reader = new FileReader();
      reader.onload = function(ev) { setPreviews(function(p) { return p.concat([ev.target?.result as string]); }); };
      reader.readAsDataURL(f);
    });
  };

  var removePhoto = function(i: number) {
    setPhotos(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
    setPreviews(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
  };

  var addUrl = function() {
    var url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      alert("请输入有效的 URL（以 http:// 或 https:// 开头）");
      return;
    }
    setPhotoUrls(function(prev) { return [...prev, url]; });
    setUrlInput("");
  };

  var removeUrl = function(i: number) {
    setPhotoUrls(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
  };

  // 附件处理
  var handleFiles = function(e: React.ChangeEvent<HTMLInputElement>) {
    var fls = Array.from(e.target.files || []);
    setFiles(function(prev) { return prev.concat(fls); });
    setFileNames(function(prev) { return prev.concat(fls.map(function(f) { return f.name; })); });
  };
  var removeFile = function(i: number) {
    setFiles(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
    setFileNames(function(p) { return p.filter(function(_, idx) { return idx !== i; }); });
  };

  var submit = async function() {
    if (!form.headName.trim()) { alert("请输入户主姓名"); return; }
    setSaving(true);
    try {
      var fd = new FormData();
      fd.append("headName", form.headName);
      fd.append("headGender", form.headGender);
      fd.append("headIdCard", form.headIdCard);
      fd.append("headPhone", form.headPhone);
      fd.append("registeredAddr", form.registeredAddr);
      fd.append("actualAddr", form.actualAddr);
      fd.append("population", form.population);
      fd.append("familyAttr", form.familyAttr);
      fd.append("residenceStatus", form.residenceStatus);
      fd.append("riskLevel", form.riskLevel);
      fd.append("incomeSource", form.incomeSource);
      fd.append("groupId", form.groupId);
      photos.forEach(function(f) { fd.append("photos", f); });
      files.forEach(function(f) { fd.append("files", f); });
      if (photoUrls.length > 0) {
        fd.append("photoUrls", JSON.stringify(photoUrls));
      }
      var r = await fetch("/api/village/families", { method: "POST", body: fd });
      if (r.ok) { router.push("/village"); }
      else { var d = await r.json(); alert("创建失败: " + (d.error || "未知错误")); }
    } catch (e: any) { alert("提交失败: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={function() { router.back(); }} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900">新增农户</h1>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 inline mr-1" />户主姓名 *</label>
            <input value={form.headName} onChange={function(e) { setForm(function(f) { return {...f, headName: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" maxLength={20} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <select value={form.headGender} onChange={function(e) { setForm(function(f) { return {...f, headGender: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />电话</label>
            <input value={form.headPhone} onChange={function(e) { setForm(function(f) { return {...f, headPhone: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" type="tel" maxLength={11} inputMode="numeric" placeholder="11位手机号，选填" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label>
            <input value={form.headIdCard} onChange={function(e) { setForm(function(f) { return {...f, headIdCard: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" maxLength={18} placeholder="18位，末位可为X，选填" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Users className="w-4 h-4 inline mr-1" />人口</label>
            <input type="number" min="0" step="1" value={form.population}
              onChange={function(e) { setForm(function(f) { return {...f, population: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">农户属性</label>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">户属性（可多选）</p>
              <div className="flex flex-wrap gap-2">
                {["一般农户","脱贫户","监测户","低保户","五保户","党员","村委会成员","高龄老人","赡养儿童","重疾重病","残疾","丧失劳动能力"].map(function(a) {
                  var selected = (form.familyAttr || "").split(",").filter(Boolean);
                  var isChecked = selected.includes(a);
                  return <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={isChecked} onChange={function() {
                      var updated = isChecked ? selected.filter(function(x) { return x !== a; }) : selected.concat([a]);
                      setForm(function(f) { return {...f, familyAttr: updated.join(",")}; });
                    }} className="rounded" /> {a}
                  </label>;
                })}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">居住状况</label>
            <select value={form.residenceStatus} onChange={function(e) { setForm(function(f) { return {...f, residenceStatus: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="常住户">常住户</option><option value="常年外出">常年外出</option><option value="季节性外出">季节性外出</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
            <select value={form.riskLevel} onChange={function(e) { setForm(function(f) { return {...f, riskLevel: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="低">低</option><option value="中">中</option><option value="高">高</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所属小组</label>
            <select value={form.groupId} onChange={function(e) { setForm(function(f) { return {...f, groupId: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">未分组</option>
              {groups.map(function(g: any) { return <option key={g.id} value={g.id}>{g.name}</option>; })}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />户籍地址</label>
            <input value={form.registeredAddr} onChange={function(e) { setForm(function(f) { return {...f, registeredAddr: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1"><MapPin className="w-4 h-4 inline mr-1" />现住址</label>
            <input value={form.actualAddr} onChange={function(e) { setForm(function(f) { return {...f, actualAddr: e.target.value}; }); }}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1"><FileText className="w-4 h-4 inline mr-1" />收入来源</label>
            <textarea value={form.incomeSource} onChange={function(e) { setForm(function(f) { return {...f, incomeSource: e.target.value}; }); }}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Photos Section */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2"><ImageIcon className="w-4 h-4 inline mr-1" />农户照片</label>

            {/* Mode Switch */}
            <div className="flex gap-2 mb-3">
              <button onClick={function() { setPhotoMode("upload"); }}
                className={"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors " + (photoMode === "upload" ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                <Upload className="w-3.5 h-3.5" /> 本地上传/拍照
              </button>
              <button onClick={function() { setPhotoMode("url"); }}
                className={"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors " + (photoMode === "url" ? "bg-primary-100 text-primary-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                <Link className="w-3.5 h-3.5" /> URL链接
              </button>
            </div>

            {/* Upload Mode */}
            {photoMode === "upload" && (
              <div>
                <input type="file" accept="image/*" multiple onChange={handlePhotos}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {previews.map(function(p, i) {
                      return (
                        <div key={i} className="relative group">
                          <img src={p} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                          <button onClick={function() { removePhoto(i); }}
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

            {/* URL Mode */}
            {photoMode === "url" && (
              <div>
                <div className="flex gap-2">
                  <input value={urlInput}
                    onChange={function(e) { setUrlInput(e.target.value); }}
                    onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                    placeholder="输入图片URL，按回车添加"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addUrl}
                    className="px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 whitespace-nowrap">添加</button>
                </div>
                {photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {photoUrls.map(function(url, i) {
                      return (
                        <div key={i} className="relative group">
                          <img src={url} alt=""
                            onError={function(e) { (e.target as HTMLImageElement).classList.add("opacity-30"); }}
                            className="w-20 h-20 object-cover rounded-lg border" />
                          <button onClick={function() { removeUrl(i); }}
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

          {/* 附件上传 */}
          <div className="md:col-span-2 border-t pt-4 mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2"><FileText className="w-4 h-4 inline mr-1" />附件文档（PDF/Word等）</label>
            <input type="file" multiple onChange={handleFiles}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
            {fileNames.length > 0 && (
              <div className="mt-2 space-y-1">
                {fileNames.map(function(name, i) {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50 rounded-lg px-3 py-1.5">
                      <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="truncate flex-1">{name}</span>
                      <button onClick={function() { removeFile(i); }} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={function() { router.back(); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">取消</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary-700 text-white rounded-lg hover:bg-primary-800 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
