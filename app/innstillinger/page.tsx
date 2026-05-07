export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import MemberSettings from "@/components/MemberSettings";
import InviteCodeManager from "@/components/InviteCodeManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Innstillinger – Qlumio",
};

export default async function InnstillingerPage() {
  const supabase = await createServerClient();

  const [{ data: members }, { data: inviteCodes }] = await Promise.all([
    supabase.from("family_members").select("*").order("created_at"),
    supabase
      .from("invite_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

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

      <div className="max-w-2xl space-y-8">
        <MemberSettings members={members ?? []} />
        <InviteCodeManager initialCodes={inviteCodes ?? []} />
      </div>
    </main>
  );
}
