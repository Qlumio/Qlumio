export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  color: string;
  created_at: string;
};

export type Event = {
  id: string;
  family_member_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  created_at: string;
};
