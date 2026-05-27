"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Footprints, Heart, ArrowLeft, Trash2, User, Calendar, MapPin, X, Pencil } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

function fmtDate(d: string) {
  var dt = new Date(d);
  return dt.getFullYear() + "年" + (dt.getMonth() + 1) + "月" + dt.getDate() + "日";
}

export default function VisitDetailPage() {
  var params = useParams();
  var router = useRouter();
  var [record, setRecord] = useState<any>(null);
  var [loading, setLoading] = useState(true);
  var [viewPhoto, setViewPhoto] = useState<string | null>(null);
  var [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(function() {
    fetch("/api/records/" + params.id)
      .then(function(r) { return r.json(); })
      .then(function(d) { setRecord(d); })
      .catch(function(e) {
        console.error(e);
        // Fallback to visits API
        fetch("/api/visits/" + params.id)
          .then(function(r) { return r.json(); })
          .then(function(d) { setRecord(d); })
          .catch(console.error);
      })
      .finally(function() { setLoading(false); });
  }, [params.id]);

  var handleDelete = async function() {
    var res = await fetch("/api/records/" + params.id, { method: "DELETE" });
    if (res.ok) { router.push("/visits"); }
    else {
      var res2 = await fetch("/api/visits/" + params.id, { method: "DELETE" });
      if (res2.ok) { router.push("/visits"); }
      else { alert("删除失败"); }
    }
  };

  var parsePhotos = function(s: string) {
    if (!s) return [];
    try {
      var arr = JSON.parse(s);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function(p: any) { return typeof p === "string" && p.length > 0; })
        .map(function(p: string) { return p.startsWith("/uploads/") ? p.replace("/uploads/", "/api/uploads/") : p; });
    } catch(e) {
      if (typeof s === "string" && s.indexOf("/") >= 0) {
        return s.split(",").filter(function(p: string) { return p.trim().length > 0; })
          .map(function(p: string) { return p.trim().startsWith("/uploads/") ? p.trim().replace("/uploads/", "/api/uploads/") : p.trim(); });
      }
      return [];
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-emerald-600 rounded-full" /></div>
  );
  if (!record) return (
    <div className="text-center py-16"><p className="text-gray-400">记录不存在</p></div>
  );

  var photos = parsePhotos(record.photos);
  var recType = record.type || "visit";
  var isCondolence = recType === "condolence";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={function() { router.push("/visits"); }} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          {(() => {
            const typeLabel = isCondolence ? "慰问记录" : "走访记录";
            const familyName = record.family?.headName || "未知农户";
            let statusTags: string[] = [];
            try { statusTags = JSON.parse(record.statusTags || "[]"); } catch {}
            if (!Array.isArray(statusTags)) statusTags = [];
            const statusStr = statusTags.length > 0 ? statusTags.join("、") : "";
            const rawDate = record.visitDate || record.recordDate;
            const d = new Date(rawDate);
            const dateStr = d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
            let staff: string[] = [];
            try { staff = JSON.parse(record.staff || "[]"); } catch {}
            if (!Array.isArray(staff)) staff = [];
            if (staff.length === 0 && record.staff) {
              staff = record.staff.split(",").filter(Boolean);
            }
            const staffStr = staff.length > 0 ? staff.join("、") : "";
            const action = isCondolence ? "慰问" : "走访";
            const parts = [typeLabel, familyName];
            if (statusStr) parts.push(statusStr);
            parts.push(dateStr);
            if (staffStr) parts.push(staffStr + action + familyName);
            else parts.push(action + familyName);
            const fullTitle = parts.join(" ｜ ");
            return (
              <>
                {isCondolence ? (
                  <Heart className="w-6 h-6 text-red-500 flex-shrink-0" />
                ) : (
                  <Footprints className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                )}
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{fullTitle}</h1>
              </>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={function() { router.push("/visits/edit/" + params.id); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil className="w-4 h-4" /> 编辑
          </button>
          <button onClick={function() { setConfirmDelete(true); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" /> 删除
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        {/* 类型标签 */}
        <div className="flex items-center gap-2">
          {isCondolence ? (
            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">❤️ 慰问</span>
          ) : (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">👣 走访</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{isCondolence ? "慰问日期" : "走访日期"}</span>
            <p className="font-medium text-gray-900 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" /> {fmtDate(record.visitDate || record.recordDate)}
            </p>
          </div>
          <div>
            <span className="text-gray-500">农户</span>
            <p className="font-medium text-gray-900 mt-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-400" /> {record.family?.headName || "未知"}
            </p>
          </div>
          {record.family?.address && (
            <div className="col-span-2">
              <span className="text-gray-500">家庭地址</span>
              <p className="font-medium text-gray-900 mt-1 flex items-center gap-1 text-sm">
                <MapPin className="w-3.5 h-3.5 text-gray-400" /> {record.family.address}
              </p>
            </div>
          )}
        </div>

        {record.staff && (
          <div>
            <span className="text-sm text-gray-500">{isCondolence ? "慰问人员" : "走访人员"}</span>
            <p className="text-sm text-gray-800 mt-1">
              {(() => {
                if (!record.staff) return "—";
                try { const arr = JSON.parse(record.staff); return Array.isArray(arr) ? arr.join("、") : record.staff; }
                catch { return record.staff.indexOf(",") >= 0 ? record.staff.split(",").join("、") : record.staff; }
              })()}
            </p>
          </div>
        )}

        <div>
          <span className="text-sm text-gray-500">{isCondolence ? "慰问内容" : "走访内容"}</span>
          <div className="mt-2 bg-gray-50 rounded-lg p-4">
            {record.content ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed
                [&_p]:my-2 [&_strong]:font-bold [&_strong]:text-gray-900
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(record.content) }} />
            ) : (
              <p className="text-gray-400 text-sm">暂无内容</p>
            )}
          </div>
        </div>

        {photos.length > 0 && (
          <div>
            <span className="text-sm text-gray-500">照片</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {photos.map(function(p: string, i: number) {
                return (
                  <button key={i} onClick={function() { setViewPhoto(p); }}
                    className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-100 hover:border-emerald-300 transition-colors">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {viewPhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999] p-4"
          onClick={function() { setViewPhoto(null); }}>
          <button className="absolute top-4 right-4 text-white text-2xl">&times;</button>
          <img src={viewPhoto} alt="" className="max-w-full max-h-[90vh] rounded-lg" />
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[999] p-4"
          onClick={function() { setConfirmDelete(false); }}>
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl" onClick={function(e) { e.stopPropagation(); }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 mb-4">确定要删除这条记录吗？</p>
            <div className="flex justify-end gap-3">
              <button onClick={function() { setConfirmDelete(false); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
