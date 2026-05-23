"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [images, setImages] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    fetch("/api/carousel").then(r => r.json()).then(d => setImages(d.images || [])).catch(() => {});
    fetch("/api/settings").then(r => r.json()).then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % images.length), 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  const prev = () => setCurrent(c => (c - 1 + images.length) % images.length);
  const next = () => setCurrent(c => (c + 1) % images.length);

  const teamName = settings.teamName || "驻村帮扶管理系统";
  const villageName = settings.villageName || "";
  const subtitle = [settings.teamName, settings.villageName].filter(Boolean).join(" · ") || "";

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4ff" }}>
        <div style={{ color: "#64748b", fontSize: "0.9rem" }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
    }}>
      {/* Carousel */}
      {images.length > 0 && (
        <div style={{ position: "relative", height: "55vh", overflow: "hidden", background: "#1e293b" }}>
          {images.map((img, i) => (
            <div key={img.id} style={{
              position: "absolute", inset: 0,
              opacity: i === current ? 1 : 0,
              transition: "opacity 1s ease-in-out",
            }}>
              <img src={img.url} alt={img.title || ""}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.3) 40%, rgba(15,23,42,0.1) 100%)",
              }} />
            </div>
          ))}

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button onClick={prev} style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)", border: "none", color: "white",
                width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={next} style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)", border: "none", color: "white",
                width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}><ChevronRight className="w-5 h-5" /></button>

              {/* Dots */}
              <div style={{
                position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
                display: "flex", gap: 8,
              }}>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} style={{
                    width: i === current ? 24 : 8, height: 8,
                    borderRadius: 4, border: "none", cursor: "pointer",
                    background: i === current ? "white" : "rgba(255,255,255,0.4)",
                    transition: "all 0.3s",
                  }} />
                ))}
              </div>
            </>
          )}

          {/* Overlay text */}
          <div style={{
            position: "absolute", bottom: 60, left: 0, right: 0, textAlign: "center", color: "white",
          }}>
            {subtitle && (
              <p style={{ fontSize: "0.8rem", color: "#e2e8f0", margin: "0 0 6px", letterSpacing: 2, textShadow: "0 1px 4px rgba(0,0,0,0.5)", opacity: 0.85 }}>
                {subtitle}
              </p>
            )}
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0, letterSpacing: 4, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
              {teamName}
            </h1>
            {villageName && (
              <p style={{ fontSize: "0.85rem", color: "#cbd5e1", margin: "8px 0 0", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                驻{villageName}帮扶工作
              </p>
            )}
          </div>
        </div>
      )}

      {/* Login card */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: images.length > 0 ? "32px 16px" : "0",
        minHeight: images.length > 0 ? "auto" : "100vh",
        background: images.length > 0 ? "transparent" : "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
      }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: images.length > 0 ? "32px 0" : "0" }}>
          {images.length === 0 && (
            <>
              <div style={{
                width: 72, height: 72, borderRadius: 20, margin: "0 auto 24px",
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "2rem",
              }}>🏘</div>
              {subtitle && (
                <p style={{ fontSize: "0.75rem", color: "#cbd5e1", margin: "0 0 4px", letterSpacing: 2 }}>
                  {subtitle}
                </p>
              )}
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 8, letterSpacing: 4 }}>
                {teamName}
              </h1>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 32, lineHeight: 1.6 }}>
                村情户情 · 走访记录 · 工作日记<br />
                党建培训 · 产业管理 · 项目看板
              </p>
            </>
          )}
          <Link href="/login" style={{
            display: "inline-block",
            background: images.length > 0 ? "rgba(37,99,235,0.9)" : "rgba(255,255,255,0.15)",
            color: "white",
            padding: "12px 48px",
            borderRadius: 10,
            fontSize: "1rem",
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.25)",
            transition: "background 0.2s",
          }}>
            进入系统
          </Link>
          <p style={{ fontSize: "0.65rem", color: images.length > 0 ? "#94a3b8" : "#64748b", marginTop: 16 }}>
            默认账号: admin &nbsp;|&nbsp; 默认密码: admin123
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "16px 16px 24px",
        textAlign: "center",
        background: images.length > 0 ? "#0f172a" : "transparent",
      }}>
        <div style={{
          width: 60, height: 2,
          background: "#dc2626",
          margin: "0 auto 12px",
          opacity: 0.5,
        }} />
        <p style={{ fontSize: "0.6rem", color: "#64748b", margin: 0, lineHeight: 1.8 }}>
          黑龙江省机关事务管理局 版权所有
        </p>
        <p style={{ fontSize: "0.55rem", color: "#475569", margin: 0 }}>
          如需进行源码编译，请与省机关局驻村工作队联系
        </p>
      </div>
    </div>
  );
}
