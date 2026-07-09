export type Role = "owner" | "chef" | "driver" | "voxa_admin" | "public";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  client_id: string | null;
  role: Role;
};

export type Client = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  industry: string;
  data_project: "takeaway" | "taxi";
  online_ordering_enabled: boolean;
  is_open: boolean;
  plan_tier: "basic" | "pro" | "empire";
  owner_phone: string | null;
  brand_color: string;
  created_at: string;
};
