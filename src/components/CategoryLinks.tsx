"use client";

import { Mountain, Users, Landmark, ArrowRight } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { key: "scenery", label: "乡村风景", desc: "靠山村田园风光、四季景色", icon: Mountain, gradient: "from-emerald-500 to-teal-600" },
  { key: "culture", label: "风土人文", desc: "民俗活动、乡村生活剪影", icon: Landmark, gradient: "from-amber-500 to-orange-600" },
  { key: "portrait", label: "村民风采", desc: "村民面貌、工作队影像", icon: Users, gradient: "from-blue-500 to-indigo-600" },
];

export default function CategoryLinks() {
  return (
    <section>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Mountain size={20} /> 影像靠山
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link key={cat.key} href={"/gallery/" + cat.key}
              className={"block rounded-xl bg-gradient-to-br " + cat.gradient + " p-6 text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center"><Icon size={22} /></div>
                <div><p className="font-semibold text-lg">{cat.label}</p></div>
              </div>
              <p className="text-white/80 text-sm mb-4">{cat.desc}</p>
              <div className="flex items-center gap-1 text-white/70 text-sm group">
                <span>查看照片</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
