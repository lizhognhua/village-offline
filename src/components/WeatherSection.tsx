"use client";

import { useEffect, useState } from "react";
import { CloudSun, AlertTriangle } from "lucide-react";

type CurrentWeather = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weather: string;
  icon: string;
};

type ForecastDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  weather: string;
  icon: string;
  precipProb: number;
};

type WeatherAlert = {
  id: string;
  title: string;
  level: string;
  content: string;
  source: string | null;
  effectiveAt: string;
  expireAt: string | null;
};

type WeatherData = {
  current: CurrentWeather | null;
  forecast: ForecastDay[];
  alerts: WeatherAlert[];
};

const LEVEL_COLORS: Record<string, string> = {
  "红色": "bg-red-600 text-white",
  "橙色": "bg-orange-500 text-white",
  "黄色": "bg-yellow-500 text-white",
  "蓝色": "bg-blue-500 text-white",
};

export default function WeatherSection() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, []);

  if (loading) {
    return (
      <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <CloudSun size={22} />
          天气预报
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-white/10 rounded-lg" />
          <div className="h-12 bg-white/10 rounded-lg" />
        </div>
      </section>
    );
  }

  if (error || !data) return null;

  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  return (
    <section className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <CloudSun size={22} />
        绥棱天气
        <span className="text-sm font-normal text-primary-200">靠山村</span>
      </h2>

      {/* 天气预警 */}
      {data.alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                LEVEL_COLORS[alert.level] || "bg-yellow-500 text-white"
              }`}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  [{alert.level}预警] {alert.title}
                </p>
                <p className="opacity-90 text-xs mt-0.5">{alert.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 当前天气 */}
      {data.current && (
        <div className="flex items-center gap-4 bg-white/5 rounded-lg p-4 mb-4">
          <span className="text-5xl">{data.current.icon}</span>
          <div>
            <p className="text-3xl font-bold text-white">
              {data.current.temp}°C
            </p>
            <p className="text-sm text-primary-200">{data.current.weather}</p>
            <p className="text-xs text-primary-300 mt-1">
              体感 {data.current.feelsLike}°C · 湿度{data.current.humidity}% · 风{data.current.windSpeed}km/h
            </p>
          </div>
        </div>
      )}

      {/* 7天预报 */}
      {data.forecast.length > 0 && (
        <div className="grid grid-cols-7 gap-1">
          {data.forecast.map((day, i) => {
            const d = new Date(day.date);
            const dayName = i === 0 ? "今天" : weekDays[d.getDay()];
            return (
              <div
                key={day.date}
                className="text-center p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <p className="text-xs text-primary-200 mb-1">{dayName}</p>
                <span className="text-xl block">{day.icon}</span>
                <p className="text-xs text-white font-medium mt-1">
                  {day.tempMax}°
                </p>
                <p className="text-xs text-primary-300">{day.tempMin}°</p>
                {day.precipProb > 0 && (
                  <p className="text-xs text-blue-300 mt-0.5">
                    {day.precipProb}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 无预报但有预警 */}
      {!data.current && data.forecast.length === 0 && data.alerts.length === 0 && (
        <p className="text-primary-300 text-sm py-4 text-center">
          暂未获取到天气信息
        </p>
      )}
    </section>
  );
}
