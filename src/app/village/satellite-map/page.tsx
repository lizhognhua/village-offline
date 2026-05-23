"use client";

import nextDynamic from "next/dynamic";

const SatelliteMapClient = nextDynamic(() => import("./SatelliteMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  ),
});

export default function SatelliteMapPage() {
  return <SatelliteMapClient />;
}
