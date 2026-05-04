export const dynamic = "force-dynamic";
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
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="text-gray-500 hover:text-gray-900 transition-colors text-sm flex items-center gap-1"
        >
          ← Tilbake
        </Link>
        <h1 className="text-2xl font-bold">Innstillinger</h1>
      </div>

      <MemberSettings members={members ?? []} />
    </main>
  );
}
