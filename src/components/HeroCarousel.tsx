"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HeroImage = {
  id: string;
  url: string;
  title: string | null;
};

export default function HeroCarousel() {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/carousel?category=scenery")
      .then((r) => r.json())
      .then((data) => {
        setImages(data.images || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (loading) {
    return <div className="w-full h-64 md:h-[500px] bg-gray-200 animate-pulse rounded-2xl" />;
  }

  if (images.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <div className="relative w-full h-64 md:h-[500px] overflow-hidden rounded-2xl group shadow-xl">
      {images.map((img, idx) => (
        <div
          key={img.id}
          className={"absolute inset-0 transition-opacity duration-700 " + (idx === current ? "opacity-100" : "opacity-0")}
        >
          <img
            src={img.url}
            alt={img.title || "轮播图"}
            className="w-full h-full object-cover"
          />
          {img.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-6">
              <p className="text-white text-lg md:text-xl font-medium">{img.title}</p>
            </div>
          )}
        </div>
      ))}

      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
            <ChevronLeft size={22} />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
            <ChevronRight size={22} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button key={idx} onClick={() => setCurrent(idx)}
                className={"w-2.5 h-2.5 rounded-full transition-all " + (idx === current ? "bg-white w-6" : "bg-white/50 hover:bg-white/70")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
