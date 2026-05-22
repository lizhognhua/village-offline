"use client";

import { useEffect, useState } from "react";
import { CloudSun, Wind, Droplets, Thermometer, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

function fmtTemp(v: number) {
  if (v == null || isNaN(v)) return "--°C";
  return Math.round(v) + "°C";
}

function fmtPct(v: number) {
  if (v == null || isNaN(v)) return "--";
  return Math.round(v) + "%";
}

export default function WeatherPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAlert, setActiveAlert] = useState<any>(null);

  // Single-team: village is always 靠山村
  const villageLabel = "靠山村";

  useEffect(() => {
    fetch("/api/weather")
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.alerts && d.alerts.length > 0) {
          // Auto-show most severe active alert
          const severe = d.alerts.find((a: any) => a.level === "红色" || a.level === "橙色");
          if (severe) setActiveAlert(severe);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin h-8 w-8 border-b-2 border-primary-700 rounded-full" />
    </div>
  );

  const current = data?.current;
  const forecast = data?.forecast || [];
  const daily = forecast;

  // Derive from forecast for multi-day display
  const todayForecast = daily?.[0] || {};
  const conditions = todayForecast;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-1 hover:bg-gray-100 rounded">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <CloudSun className="w-6 h-6 text-blue-500" />
        <h1 className="text-xl font-bold text-gray-900">天气预报</h1>
      </div>

      {/* Current Weather */}
      {current ? (
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">{villageLabel} · 当前天气</p>
              <p className="text-6xl font-bold mt-2">{current.temp ? (Math.round(current.temp) + "°") : "--°"}</p>
              <p className="text-blue-100 text-sm mt-1">
                体感 {current.feelsLike ? (Math.round(current.feelsLike) + "°") : "--°"}
              </p>
              <p className="text-lg mt-1">{current.icon} {current.condition || current.weather?.text || ""}</p>
            </div>
            <div className="text-right text-blue-100 text-sm space-y-3">
              <div className="flex items-center gap-2 justify-end">
                <Droplets className="w-4 h-4" /> 湿度 {current.humidity || "--"}%
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Wind className="w-4 h-4" /> 风速 {current.windSpeed != null ? (current.windSpeed + "km/h") : "--"}
              </div>
              <div className="flex items-center gap-2 justify-end">
                降水 {current.precipitation != null ? (current.precipitation + "mm") : "--"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
          <CloudSun className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">获取天气数据失败</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-primary-600 hover:text-primary-800">重试</button>
        </div>
      )}

      {/* 7-day Forecast */}
      {daily?.length > 0 ? (
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <CloudSun className="w-4 h-4 text-blue-500" /> 未来7天预报
          </h2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b">
                  <th className="text-left pb-2 font-normal">日期</th>
                  <th className="pb-2 font-normal">天气</th>
                  <th className="pb-2 font-normal">最高/最低</th>
                  <th className="text-right pb-2 font-normal">降水</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {daily.slice(0, 7).map((d: any, i: number) => {
                  const isToday = i === 0;
                  const date = d.fxDate || d.date;
                  const dayName = isToday ? "今天" : new Date(date).toLocaleDateString("zh-CN", { weekday: "short" });
                  const dateStr = new Date(date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
                  const condText = d.textDay || d.condition || "晴";
                  const condIcon = d.iconDay || "";
                  return (
                    <tr key={i} className={`hover:bg-blue-50/50 ${isToday ? "font-medium" : ""}`}>
                      <td className="py-2.5 pr-3">
                        <span className={isToday ? "text-blue-600" : "text-gray-800"}>{dayName}</span>
                        <span className="text-gray-400 ml-1 text-xs">{dateStr}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-lg">{condIcon}</span>
                        <span className="ml-1 text-xs text-gray-500">{condText}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="text-red-500">{fmtTemp(d.tempMax)}</span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span className="text-blue-500">{fmtTemp(d.tempMin)}</span>
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {d.precip != null ? (d.precip + "mm") : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm p-4 text-center text-gray-400 text-sm py-8">
          暂无预报数据
        </div>
      )}

      {/* Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> 气象预警
          </h2>
          <div className="space-y-2">
            {data.alerts.map((a: any, i: number) => (
              <button
                key={i}
                onClick={() => setActiveAlert(a)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-lg text-sm hover:bg-gray-50 transition-colors ${
                  a.level === "红色" ? "bg-red-50" : a.level === "橙色" ? "bg-orange-50" : a.level === "黄色" ? "bg-yellow-50" : "bg-blue-50"
                }`}
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                  a.level === "红色" ? "text-red-500" : a.level === "橙色" ? "text-orange-500" : a.level === "黄色" ? "text-yellow-500" : "text-blue-500"
                }`} />
                <span className="text-gray-800 font-medium">{a.title}</span>
                <span className="text-xs text-gray-400 ml-auto">{new Date(a.effectiveAt).toLocaleDateString("zh-CN")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {data?.fromCache && (
        <p className="text-center text-xs text-gray-400">数据来自缓存（4小时内有效）</p>
      )}

      {activeAlert && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setActiveAlert(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${activeAlert.level === "红色" ? "text-red-500" : activeAlert.level === "橙色" ? "text-orange-500" : activeAlert.level === "黄色" ? "text-yellow-500" : "text-blue-500"}`} />
                {activeAlert.title}
              </h3>
              <button onClick={() => setActiveAlert(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 items-center">
                <span className="text-gray-500">级别：</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100">{activeAlert.level}</span>
              </div>
              <div><span className="text-gray-500">来源：</span><span>{activeAlert.source}</span></div>
              <div><span className="text-gray-500">生效：</span><span>{new Date(activeAlert.effectiveAt).toLocaleString("zh-CN")}</span></div>
              {activeAlert.expireAt && <div><span className="text-gray-500">过期：</span><span>{new Date(activeAlert.expireAt).toLocaleString("zh-CN")}</span></div>}
              <div><span className="text-gray-500">内容：</span><div className="bg-gray-50 rounded-lg p-3 mt-1 whitespace-pre-wrap text-gray-700">{activeAlert.content}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
