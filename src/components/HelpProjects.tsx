"use client";

import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";

type Project = {
  id: string;
  title: string;
  description: string | null;
  photos: string | null;
};

export default function HelpProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <HeartHandshake size={22} />
          帮扶项目
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/10 rounded-xl animate-pulse h-36" />
          ))}
        </div>
      </section>
    );
  }

  if (projects.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <HeartHandshake size={22} />
        帮扶项目
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => {
          const photos = JSON.parse(p.photos || "[]");
          const firstPhoto = photos[0] || null;
          return (
            <div
              key={p.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-white/15 transition-colors"
            >
              {firstPhoto && (
                <img src={firstPhoto} alt={p.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <h3 className="text-white font-semibold">{p.title}</h3>
                {p.description && (
                  <p className="text-primary-200 text-sm mt-2 line-clamp-3">{p.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
