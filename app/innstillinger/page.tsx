import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MemberSettings from "@/components/MemberSettings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Innstillinger – Qlumio",
};

export default async function InnstillingerPage() {
  const { data: members } = await supabase
    .from("family_members")
    .select("*")
    .order("created_at");

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← Tilbake
        </Link>
        <h1 className="text-2xl font-bold">Innstillinger</h1>
      </div>

      <MemberSettings members={members ?? []} />
    </main>
  );
}
