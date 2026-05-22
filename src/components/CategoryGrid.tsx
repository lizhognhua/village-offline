"use client";

import { useEffect, useState } from "react";
import { Mountain, Users, Landmark, X } from "lucide-react";

type CarouselImage = {
  id: string;
  url: string;
  title: string | null;
};

const CATEGORIES = [
  { key: "scenery", label: "乡村风景", icon: Mountain },
  { key: "culture", label: "风土人文", icon: Landmark },
  { key: "portrait", label: "村民风采", icon: Users },
];

export default function CategoryGrid() {
  const [activeCategory, setActiveCategory] = useState("scenery");
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/carousel?category=" + activeCategory)
      .then((r) => r.json())
      .then((data) => {
        setImages(data.images || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeCategory]);

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span role="img" aria-label="camera">📸</span> 影像靠山
      </h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={"flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all " + (
                isActive ? "bg-white text-primary-800 shadow-md" : "bg-white/10 text-white/80 hover:bg-white/20"
              )}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-8 text-white/50 text-sm">暂无此分类的照片</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {images.slice(0, 6).map((img) => (
              <button key={img.id} onClick={() => setLightbox(img.url)}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-white/5"
              >
                <img src={img.url} alt={img.title || ""}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {img.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">{img.title}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
          {images.length > 6 && (
            <p className="text-center text-white/40 text-xs mt-3">共 {images.length} 张照片</p>
          )}
        </>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
          >
            <X size={24} />
          </button>
          <img src={lightbox} alt="预览" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}
