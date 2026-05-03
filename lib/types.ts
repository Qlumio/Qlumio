export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  color: string;
  created_at: string;
};

export type EventException = {
  event_id: string;
  date: string; // YYYY-MM-DD
};

export type Event = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (startdato, brukes også for ukedag ved gjentagelse)
  start_time: string | null;
  end_time: string | null;
  recurring: boolean;
  created_at: string;
  participant_ids: string[]; // fra event_participants
};
