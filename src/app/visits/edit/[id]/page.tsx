'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Footprints, Heart, User, Calendar, FileText, Save, Users, X, Image, Plus } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

const STATUS_TAGS = ['在家', '外出务工', '出门', '健康', '生病', '其他'];
const STAFF_OPTIONS = ['局领导','县领导','乡领导','肖慧军','李中华','马威','村委会','屯组长','医疗行业','民政'];

export default function EditVisitPage() {
  const router = useRouter();
  const params = useParams();
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recType, setRecType] = useState<'visit' | 'condolence' | 'reception'>('visit');
  const [form, setForm] = useState({
    familyId: '',
    visitDate: '',
    content: '',
    statusTags: [] as string[],
    staff: [] as string[],
  });
  const [customStaffInput, setCustomStaffInput] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [famRes, recRes] = await Promise.all([
          fetch('/api/families'),
          fetch('/api/records/' + params.id).then(r => r.ok ? r.json() : null),
        ]);
        let data = recRes;
        if (!data) {
          const fallback = await fetch('/api/visits/' + params.id).then(r => r.ok ? r.json() : null);
          data = fallback;
          if (fallback) setRecType('visit');
        } else {
          setRecType(data.type === 'condolence' ? 'condolence' : 'visit');
        }
        if (famRes.ok) {
          const famData = await famRes.json();
          setFamilies(famData.families || famData);
        }
        if (data) {
          // 解析已有照片
          try {
            const parsed = JSON.parse(data.photos || '[]');
            setExistingPhotos(Array.isArray(parsed) ? parsed : []);
          } catch { setExistingPhotos([]); }
          // 解析 staff
          let staffArr: string[] = [];
          if (data.staff) {
            try { staffArr = JSON.parse(data.staff); } catch {
              staffArr = (typeof data.staff === 'string' ? data.staff.split(',') : []);
            }
          }
          setForm({
            familyId: data.familyId || '',
            visitDate: data.visitDate ? data.visitDate.split('T')[0] : (data.recordDate ? data.recordDate.split('T')[0] : ''),
            content: data.content || '',
            statusTags: typeof data.statusTags === 'string'
              ? JSON.parse(data.statusTags)
              : data.statusTags || [],
            staff: staffArr,
          });
        }
      } catch (e) {
        console.error('加载数据失败:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  const toggleTag = (tag: string) => {
    if (tag === '其他') {
      const val = prompt('请输入其他状态:');
      if (val && val.trim() && !form.statusTags.includes(val.trim())) {
        setForm((prev) => ({ ...prev, statusTags: [...prev.statusTags, val.trim()] }));
      }
      return;
    }
    setForm((prev) => ({
      ...prev,
      statusTags: prev.statusTags.includes(tag)
        ? prev.statusTags.filter((t) => t !== tag)
        : [...prev.statusTags, tag],
    }));
  };

  const toggleStaff=(s:string)=>setForm(f=>({...f,staff:f.staff.includes(s)?f.staff.filter(x=>x!==s):[...f.staff,s]}));
  const addCustomStaff=()=>{const n=customStaffInput.trim();if(n&&!form.staff.includes(n)){setForm(f=>({...f,staff:[...f.staff,n]}));setCustomStaffInput('')}};

  const handleAddPhotos = (e: any) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      setNewPhotoFiles(p => [...p, files[i]]);
      setNewPhotoPreviews(p => [...p, URL.createObjectURL(files[i])]);
    }
  };
  const removeNewPhoto = (i: number) => { setNewPhotoFiles(p => p.filter((_,j) => j!==i)); setNewPhotoPreviews(p => p.filter((_,j) => j!==i)); };
  const removeExistingPhoto = (i: number) => { setExistingPhotos(p => p.filter((_,j) => j!==i)); };

  const handleSave = async () => {
    if (!form.familyId || !form.content.trim()) {
      alert('请选择农户并填写内容');
      return;
    }
    setSaving(true);
    try {
      let res;
      const hasNewPhotos = newPhotoFiles.length > 0;
      const hasExistingPhotos = existingPhotos.length > 0;

      if (hasNewPhotos) {
        // Use FormData to upload new photos + preserve existing ones
        const fd = new FormData();
        fd.append("familyId", form.familyId);
        fd.append("visitDate", form.visitDate);
        fd.append("content", form.content);
        fd.append("type", recType);
        fd.append("statusTags", JSON.stringify(form.statusTags));
        fd.append("staff", form.staff.join(","));
        if (hasExistingPhotos) {
          fd.append("photos", JSON.stringify(existingPhotos));
        }
        newPhotoFiles.forEach(f => fd.append("photos", f));
        res = await fetch('/api/records/' + params.id, { method: 'PUT', body: fd });
      } else {
        // JSON mode — include existingPhotos so API preserves them
        res = await fetch('/api/records/' + params.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyId: form.familyId,
            visitDate: form.visitDate,
            content: form.content,
            type: recType,
            statusTags: JSON.stringify(form.statusTags),
            staff: form.staff.join(","),
            photos: JSON.stringify(existingPhotos),
          }),
        });
      }
      if (res.ok) {
        router.push('/visits');
      } else {
        // Fallback to visits API
        const res2 = await fetch('/api/visits/' + params.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyId: form.familyId,
            visitDate: form.visitDate,
            content: form.content,
            statusTags: JSON.stringify(form.statusTags),
            staff: form.staff.join(","),
          }),
        });
        if (res2.ok) {
          router.push('/visits');
        } else {
          const err = await res.json().catch(() => ({}));
          alert('保存失败: ' + (err.error || ''));
        }
      }
    } catch (e: any) {
      alert('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = recType === 'visit' ? '走访' : recType === 'condolence' ? '慰问' : '来访';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          {recType === 'visit' ? (
            <><Footprints className="w-6 h-6 text-emerald-600" /> 编辑走访记录</>
          ) : (
            <><Heart className="w-6 h-6 text-red-500" /> 编辑慰问记录</>
          )}
        </h1>
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        {/* 类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">记录类型</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRecType('visit')}
              className={'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors ' + (recType === 'visit' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-medium' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              <Footprints className="w-4 h-4" /> 走访
            </button>
            <button type="button" onClick={() => setRecType('condolence')}
              className={'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors ' + (recType === 'condolence' ? 'bg-rose-50 text-rose-700 border-rose-300 font-medium' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              <Heart className="w-4 h-4" /> 慰问
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <User className="w-4 h-4 inline mr-1" />选择农户
          </label>
          <select
            value={form.familyId}
            onChange={(e) => setForm((p) => ({ ...p, familyId: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">请选择农户</option>
            {families.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.headName}{f.familyAttr ? ' (' + f.familyAttr + ')' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />{typeLabel}日期
          </label>
          <input
            type="date"
            value={form.visitDate}
            onChange={(e) => setForm((p) => ({ ...p, visitDate: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">村民状态（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={'px-3 py-1.5 text-sm rounded-full border transition-colors ' +
                  (form.statusTags.includes(tag)
                    ? 'bg-primary-700 text-white border-primary-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400')}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">走访/慰问人员</label>
          <div className="flex flex-wrap gap-2">
            {STAFF_OPTIONS.map(s=>(
              <button key={s} type="button" onClick={()=>toggleStaff(s)}
                className={"px-3 py-1.5 text-sm rounded-full border transition-colors "+(form.staff.includes(s)?'bg-emerald-700 text-white border-emerald-700':'bg-white text-gray-600 border-gray-300 hover:border-emerald-400')}>{s}</button>
            ))}
          </div>
          {form.staff.filter(s=>!STAFF_OPTIONS.includes(s)).length>0&&<div className="flex flex-wrap gap-1 mt-2">
            {form.staff.filter(s=>!STAFF_OPTIONS.includes(s)).map(s=>
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">{s}<button onClick={()=>toggleStaff(s)} className="hover:text-red-500"><X className="w-3 h-3"/></button></span>)}
          </div>}
          <div className="mt-2 flex gap-2">
            <input type="text" value={customStaffInput} placeholder="其他人员..."
              onChange={e=>setCustomStaffInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter')addCustomStaff()}}
              className="flex-1 border rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"/>
            <button type="button" onClick={addCustomStaff}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">添加</button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FileText className="w-4 h-4 inline mr-1" />{typeLabel}内容
          </label>
          <RichTextEditor
            content={form.content}
            onChange={(html) => setForm((p) => ({ ...p, content: html }))}
            placeholder="记录走访情况..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2"><Image className="w-4 h-4 inline mr-1" />照片</label>
          {existingPhotos.length > 0 && (<div className="flex flex-wrap gap-2 mb-2">{existingPhotos.map((url, i) => (
            <div key={'old-'+i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeExistingPhoto(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
            </div>))}</div>)}
          {newPhotoPreviews.length > 0 && (<div className="flex flex-wrap gap-2 mb-2">{newPhotoPreviews.map((url, i) => (
            <div key={'new-'+i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeNewPhoto(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">×</button>
            </div>))}</div>)}
          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg cursor-pointer hover:bg-gray-50">
            <Plus className="w-4 h-4" /> 添加照片
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
          </label>
        </div>
        <div>
          <RichTextEditor
            content={form.content}
            onChange={(html) => setForm((p) => ({ ...p, content: html }))}
            placeholder="记录走访情况..."
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">取消</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
