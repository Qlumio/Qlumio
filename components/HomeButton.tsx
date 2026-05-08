"use client";

import Link from "next/link";

export default function HomeButton() {
  return (
    <Link
      href="/"
      className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 hover:bg-white transition-colors text-xs font-medium px-2.5 py-1.5 rounded-lg"
      title="Gå til hjem"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
      </svg>
      Hjem
    </Link>
  );
}
