import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parseICS } from "@/lib/ical";

export async function POST(request: NextRequest) {
  const { subscriptionId } = await request.json();

  if (!subscriptionId) {
    return NextResponse.json({ error: "Mangler subscriptionId" }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data: sub, error: subError } = await supabase
    .from("calendar_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (subError || !sub) {
    return NextResponse.json({ error: "Fant ikke abonnement" }, { status: 404 });
  }

  // Hent iCal-data
  let icsText: string;
  try {
    const res = await fetch(sub.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    icsText = await res.text();
  } catch (e) {
    return NextResponse.json({ error: "Kunne ikke hente kalenderdata: " + (e as Error).message }, { status: 502 });
  }

  const parsedEvents = parseICS(icsText);

  // Hent eksisterende UIDs for denne familien for å unngå duplikater
  const { data: existing } = await supabase
    .from("events")
    .select("id, external_uid")
    .not("external_uid", "is", null);

  const existingUids = new Set((existing ?? []).map((e) => e.external_uid));

  let imported = 0;
  let skipped = 0;

  for (const ev of parsedEvents) {
    if (existingUids.has(ev.uid)) {
      skipped++;
      continue;
    }

    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert({
        title: ev.title,
        date: ev.date,
        end_date: ev.endDate !== ev.date ? ev.endDate : null,
        start_time: ev.startTime,
        end_time: ev.endTime,
        recurring: false,
        responsible_member_id: null,
        category: sub.category,
        external_uid: ev.uid,
      })
      .select()
      .single();

    if (!insertError && newEvent) {
      await supabase.from("event_participants").insert({
        event_id: newEvent.id,
        family_member_id: sub.member_id,
      });
      imported++;
    }
  }

  await supabase
    .from("calendar_subscriptions")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  return NextResponse.json({ imported, skipped, total: parsedEvents.length });
}
