"use client";

import { useEffect, useState } from "react";

type CurrentWeather = {
  temp: number; weather: string; icon: string;
};

export default function HeaderWeather() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    fetch("/api/weather")
      .then(r => r.json())
      .then(d => { if (d.current) setWeather(d.current); })
      .catch(() => {});
  }, []);

  if (!weather) return null;

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const dayStr = `星期${weekDays[today.getDay()]}`;

  return (
    <div className="flex items-center gap-2 text-white/80 text-xs">
      <span>📍 绥棱县靠山村</span>
      <span className="text-white/30">|</span>
      <span>{dateStr} {dayStr}</span>
      <span className="text-lg">{weather.icon}</span>
      <span>{weather.temp}°C {weather.weather}</span>
    </div>
  );
}
