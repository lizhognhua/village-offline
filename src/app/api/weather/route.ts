import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeObject } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const qweatherKey = process.env.QWEATHER_KEY || "";

    const nowUrl = `https://devapi.qweather.com/v7/weather/now?location=127.12,47.25&key=${qweatherKey}`;
    const nowRes = await fetch(nowUrl);
    const nowData = await nowRes.json();

    const forecastUrl = `https://devapi.qweather.com/v7/weather/7d?location=127.12,47.25&key=${qweatherKey}`;
    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json();

    const alerts = await prisma.weatherAlert.findMany({
      where: { isActive: true },
      orderBy: [{ level: "asc" }, { effectiveAt: "desc" }],
    });

    const skyCons = {
      "100": "晴", "101": "多云", "102": "少云", "103": "晴间多云",
      "104": "阴天", "300": "阵雨", "301": "强阵雨", "302": "雷阵雨",
      "303": "强雷阵雨", "304": "雷阵雨伴有冰雹", "305": "小雨",
      "306": "中雨", "307": "大雨", "308": "强降雨", "309": "毛毛雨",
      "310": "暴雨", "311": "大暴雨", "312": "特大暴雨", "313": "冻雨",
      "314": "小到中雨", "315": "中到大雨", "316": "大到暴雨",
      "317": "暴雨到大暴雨", "318": "大暴雨到特大暴雨", "399": "雨",
      "400": "小雪", "401": "中雪", "402": "大雪", "403": "暴雪",
      "404": "雨夹雪", "405": "雨雪天气", "406": "阵雨夹雪",
      "407": "阵雪", "408": "小到中雪", "409": "中到大雪",
      "410": "大到暴雪", "499": "雪", "500": "薄雾", "501": "雾",
      "502": "霾", "503": "扬沙", "504": "浮尘", "507": "沙尘暴",
      "508": "强沙尘暴", "509": "浓雾", "510": "强浓雾", "511": "中度霾",
      "512": "重度霾", "513": "严重霾", "514": "大雾",
      "515": "特强浓雾", "900": "热", "901": "冷", "999": "未知",
    };

    const iconMap = {
      "100": "☀️", "101": "🌤", "102": "🌤", "103": "🌤",
      "104": "☁️", "300": "🌦", "301": "🌦", "302": "⛈",
      "303": "⛈", "304": "⛈", "305": "🌧", "306": "🌧",
      "307": "🌧", "308": "🌧", "309": "🌦", "310": "🌧",
      "311": "🌧", "312": "🌧", "313": "🌧", "399": "🌧",
      "400": "🌨", "401": "🌨", "402": "🌨", "403": "🌨",
      "404": "🌧", "405": "🌧", "406": "🌦", "407": "🌨",
      "499": "🌨", "500": "🌫", "501": "🌫", "502": "🌫",
    };

    const current = nowData.now || {};
    const daily = forecastData.daily || [];

    const currentWeather = {
      temp: parseInt(current.temp) || 0,
      feelsLike: parseInt(current.feelsLike) || 0,
      humidity: parseInt(current.humidity) || 0,
      windSpeed: parseInt(current.windSpeed) || 0,
      precipitation: parseInt(current.precip) || 0,
      weather: skyCons[current.icon] || current.text || "未知",
      icon: iconMap[current.icon] || "🌤",
    };

    const forecast = (daily || []).map((day) => ({
      date: day.fxDate,
      tempMax: parseInt(day.tempMax) || 0,
      tempMin: parseInt(day.tempMin) || 0,
      weather: skyCons[day.iconDay] || day.textDay || "未知",
      icon: iconMap[day.iconDay] || "🌤",
      precipProb: parseInt(day.precip) || 0,
    }));

    return NextResponse.json({
      current: currentWeather,
      forecast,
      alerts: alerts.map((a) => ({
        id: a.id, title: a.title, level: a.level, content: a.content,
        source: a.source, effectiveAt: a.effectiveAt.toISOString(),
        expireAt: a.expireAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Weather API error:", error);
    try {
      const alerts = await prisma.weatherAlert.findMany({ where: { isActive: true } });
      return NextResponse.json({ current: null, forecast: [], alerts });
    } catch {
      return NextResponse.json({ current: null, forecast: [], alerts: [] });
    }
  }
}
