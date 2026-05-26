"use client";
import { useEffect } from "react";

export function DynamicTitle() {
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        const teamName = d.teamName || "";
        document.title = teamName
          ? `${teamName}工作管理平台`
          : "驻村工作队管理平台";
      })
      .catch(() => {});
  }, []);

  return null;
}
