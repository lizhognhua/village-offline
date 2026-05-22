"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

type TeamMember = {
  id: string;
  name: string;
  title: string | null;
  intro: string | null;
  avatar: string | null;
};

export default function TeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    var url = "/api/team-members";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users size={22} />
          驻村工作队人员情况
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 rounded-xl p-4 animate-pulse h-36" />
          ))}
        </div>
      </section>
    );
  }

  if (members.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Users size={22} />
        驻村工作队人员情况
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              {m.avatar ? (
                <img
                  src={m.avatar}
                  alt={m.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-500/30 flex items-center justify-center text-white font-bold text-lg border-2 border-white/20">
                  {m.name[0]}
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-lg">{m.name}</p>
                {m.title && (
                  <p className="text-primary-200 text-sm whitespace-pre-line leading-relaxed">{m.title}</p>
                )}
              </div>
            </div>
            {m.intro && (
              <div className="bg-primary-500/20 rounded-lg px-3 py-2">
                <p className="text-primary-100 text-sm">{m.intro}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
