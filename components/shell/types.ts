export type NavItem = {
  icon: string;
  label: string;
  href?: string;
  badge?: string;
  badgeClass?: "g" | "r" | "soon";
  disabled?: boolean;
  active?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};
