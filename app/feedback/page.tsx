"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Feedback = {
  id: string;
  name: string;
  message: string;
  agree_count: number;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "akkurat nå";
  if (diff < 3600) return `${Math.floor(diff / 60)} min siden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} t siden`;
  return `${Math.floor(diff / 86400)} d siden`;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("agree_count", { ascending: false })
      .order("created_at", { ascending: false });
    setFeedbacks(data ?? []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    await supabase.from("feedback").insert({
      name: name.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setName("");
    setMessage("");
    fetchFeedback();
  };

  const handleAgree = async (id: string, currentCount: number) => {
    if (agreed.has(id)) return;
    setAgreed((prev) => new Set([...prev, id]));
    await supabase
      .from("feedback")
      .update({ agree_count: currentCount + 1 })
      .eq("id", id);
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, agree_count: currentCount + 1 } : f))
    );
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Hjem
          </Link>
          <div className="w-px h-5 bg-slate-700" />
          <div>
            <h1 className="text-lg font-semibold">Tilbakemeldinger</h1>
          </div>
        </div>

        <p className="text-slate-400 text-sm mb-6">
          Hva savner du? Hva kan bli bedre? Alle forslag hjelper oss å bygge noe familien faktisk bruker.
          Klikk «Jeg ønsker dette også» på innspill du er enig i.
        </p>

        {/* Skjema */}
        <div className="bg-slate-800 rounded-xl p-5 mb-8">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🙌</p>
              <p className="font-semibold mb-1">Takk for innspillet!</p>
              <p className="text-slate-400 text-sm mb-4">Det hjelper oss å bygge noe bedre.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Send et nytt innspill
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Send inn et forslag</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Ditt navn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-700 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <textarea
                  placeholder="Hva tenker du? Hva savner du?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-slate-700 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || !message.trim() || submitting}
                  className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium"
                >
                  {submitting ? "Sender…" : "Send innspill"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Liste */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Innspill fra andre ({feedbacks.length})
        </h2>

        {loading && <p className="text-slate-500 text-sm">Laster…</p>}

        {!loading && feedbacks.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">
            Ingen innspill ennå — vær den første!
          </p>
        )}

        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white mb-1">{fb.message}</p>
                  <p className="text-xs text-slate-500">
                    {fb.name} · {timeAgo(fb.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleAgree(fb.id, fb.agree_count)}
                  disabled={agreed.has(fb.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    agreed.has(fb.id)
                      ? "bg-blue-500/20 text-blue-400 cursor-default"
                      : "bg-slate-700 hover:bg-blue-500/20 hover:text-blue-400 text-slate-400"
                  }`}
                >
                  <span className="text-base">👍</span>
                  <span>{fb.agree_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
