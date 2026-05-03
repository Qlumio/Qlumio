"use client";

import { useState } from "react";

type Member = {
  id: number;
  name: string;
  role: string;
  color: string;
};

type Event = {
  memberId: number;
  day: string;
  text: string;
  from: string;
  to: string;
};

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Home() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("parent");
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const addMember = () => {
    if (!name.trim()) return;

    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
    ];

    const newMember: Member = {
      id: Date.now(),
      name: name.trim(),
      role,
      color: colors[members.length % colors.length],
    };

    setMembers([...members, newMember]);
    setName("");
    setRole("parent");
  };

  const addEvent = (memberId: number, day: string) => {
    const input = prompt("Skriv aktivitet, f.eks: Fotball 18:00-19:15");
    if (!input) return;

    const timeMatch = input.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);

    let text = input.trim();
    let from = "";
    let to = "";

    if (timeMatch) {
      from = timeMatch[1];
      to = timeMatch[2];
      text = input.replace(timeMatch[0], "").trim();
    }

    if (!text) text = "Aktivitet";

    setEvents([...events, { memberId, day, text, from, to }]);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-2">Qlumio</h1>
      <p className="text-slate-400 mb-6">Less chaos, more family</p>

      <div className="bg-slate-800 p-4 rounded-xl mb-6 max-w-md">
        <h2 className="text-lg mb-3">Add family member</h2>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-2 p-2 rounded bg-slate-700"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full mb-3 p-2 rounded bg-slate-700"
        >
          <option value="parent">Forelder</option>
          <option value="child">Barn</option>
          <option value="grandmother">Bestemor</option>
          <option value="grandfather">Bestefar</option>
          <option value="mormor">Mormor</option>
          <option value="morfar">Morfar</option>
          <option value="uncle">Onkel</option>
          <option value="aunt">Tante</option>
          <option value="trusted">Tillitsperson</option>
          <option value="other">Annet</option>
        </select>

        <button onClick={addMember} className="w-full bg-blue-500 p-2 rounded">
          Add
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-2 mb-2">
            <div></div>
            {days.map((day) => (
              <div key={day} className="text-center text-sm text-slate-400">
                {day}
              </div>
            ))}
          </div>

          {members.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-[120px_repeat(7,1fr)] gap-2 mb-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${member.color}`} />
                <div>
                  <div>{member.name}</div>
                  <div className="text-xs text-slate-500">{member.role}</div>
                </div>
              </div>

              {days.map((day) => {
                const event = events.find(
                  (e) => e.memberId === member.id && e.day === day
                );

                return (
                  <div
                    key={day}
                    onClick={() => addEvent(member.id, day)}
                    className="h-20 bg-slate-800 rounded p-1 text-xs cursor-pointer hover:bg-slate-700"
                  >
                    {event && (
                      <div className={`${member.color} rounded p-1 text-white`}>
                        {(event.from || event.to) && (
                          <div className="text-[10px] opacity-90">
                            {event.from} - {event.to}
                          </div>
                        )}
                        <div>{event.text}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}