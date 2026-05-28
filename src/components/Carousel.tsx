"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

type CarouselImage = {
  id: string; url: string; title: string | null; sortOrder: number;
};

export default function Carousel() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    const url = "/api/carousel?t=" + Date.now();
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setImages(data.images || []); setLoading(false); })
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
    return <div className="w-full aspect-[16/9] bg-gray-200 animate-pulse rounded-2xl" />;
  }

  if (images.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <>
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl group shadow-xl">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              idx === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={img.url}
              alt={img.title || ""}
              className="w-full h-full object-contain bg-black/40"
            />
            {img.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-6">
                <p className="text-white text-lg md:text-xl font-medium">{img.title}</p>
              </div>
            )}
          </div>
        ))}

        {images.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
              <ChevronLeft size={22} />
            </button>
            <button onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
              <ChevronRight size={22} />
            </button>
          </>
        )}

        <button onClick={() => setLightbox(true)}
          className="absolute inset-0 cursor-zoom-in" title="点击查看大图" />
      </div>

      {lightbox && images[current] && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}>
          <div className="relative max-w-6xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={images[current].url} alt={images[current].title || ""}
              className="max-w-full max-h-[90vh] object-contain" />
            {images[current].title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white text-center text-lg">{images[current].title}</p>
              </div>
            )}
            <div className="absolute top-4 right-4 flex items-center gap-4">
              <span className="text-white text-sm">{current + 1} / {images.length}</span>
              <button onClick={(e) => { e.stopPropagation(); prev(); }}
                className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30">
                <ChevronLeft size={20} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }}
                className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30">
                <ChevronRight size={20} />
              </button>
              <a href={images[current].url} download target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
                title="下载图片" onClick={(e) => e.stopPropagation()}>
                <Download size={18} />
              </a>
              <button onClick={() => setLightbox(false)}
                className="text-white text-3xl hover:text-gray-300 ml-2">&times;</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
