"use client";

import Link from "next/link";

const TABS = [
  { key: "budsjett",  label: "Budsjett",            icon: "💰", href: "/okonomi" },
  { key: "planlagte", label: "Planlagte kostnader",  icon: "📋", href: "/okonomi?tab=planlagte" },
  { key: "lfp",       label: "Lån & forsikring",     icon: "🛡️", href: "/okonomi?tab=lfp" },
];

export default function OkonomiTabBar({ active }: { active: string }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
            active === tab.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="text-sm">{tab.icon}</span>
          <span className="text-center leading-tight">{tab.label}</span>
        </Link>
      ))}
    </div>
  );
}
