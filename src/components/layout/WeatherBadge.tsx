"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudSun } from "lucide-react";

type CurrentWeather = {
  temperature_2m: number;
  condition: string;
  icon: string;
};

export function WeatherBadge() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weather/forecast")
      .then((r) => r.json())
      .then((d) => {
        setWeather(d.current || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Link href="/weather" className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100">
        <CloudSun className="w-4 h-4 text-gray-400" />
      </Link>
    );
  }

  if (!weather) return null;

  return (
    <Link
      href="/weather"
      className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 text-sm"
    >
      <span className="text-lg">{weather.icon}</span>
      <span className="font-medium">{Math.round(weather.temperature_2m)}°C</span>
      <span className="text-gray-500 text-xs hidden sm:inline">{weather.condition}</span>
    </Link>
  );
}