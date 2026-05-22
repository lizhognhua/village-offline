"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Wheat, Clock, CheckCircle2, Calendar, FileText } from "lucide-react";

export default function IndustryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/industries/" + params.id)
      .then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">产业未找到</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900">{data.icon || "🌾"} {data.name}</h1>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded ${data.status === "进行中" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {data.status === "进行中" ? <><Clock className="w-3 h-3 inline mr-0.5" />{data.status}</> : <><CheckCircle2 className="w-3 h-3 inline mr-0.5" />{data.status}</>}
        </span>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {data.scale && <div><span className="text-gray-500">规模：</span><span>{data.scale}</span></div>}
          {data.startDate && <div><span className="text-gray-500"><Calendar className="w-3 h-3 inline mr-1" />开始日期：</span><span>{new Date(data.startDate).toLocaleDateString("zh-CN")}</span></div>}
        </div>
        {data.description && (
          <div><h3 className="text-sm font-medium text-gray-700 mb-1">简介</h3><p className="text-sm text-gray-600">{data.description}</p></div>
        )}
        {data.detail && (
          <div><h3 className="text-sm font-medium text-gray-700 mb-1"><FileText className="w-4 h-4 inline mr-1" />详情</h3>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">{data.detail}</p>
          </div>
        )}
        {data.benefit && (
          <div><h3 className="text-sm font-medium text-gray-700 mb-1">效益</h3>
            <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-4 whitespace-pre-wrap">{data.benefit}</p>
          </div>
        )}
      </div>
    </div>
  );
}
