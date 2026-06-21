import { useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed, Tag, SlidersHorizontal,
  TrendingUp, Users, Percent, Monitor, ChefHat, Table2,
  Settings, BarChart3, LogOut, ChevronDown, ChevronRight, Sun, Moon,
} from "lucide-react";
import { useTheme } from "../../lib/useTheme";

const GOLD = "var(--color-gold)";
const SURF = "var(--color-surface)";
const BORD = "var(--color-border)";
const MUTED = "var(--color-text-muted)";
const DIM = "var(--color-text-dim)";

type NavLeaf = { path: string; label: string; icon: any };
type NavSection = { id: string; label: string; icon: any } & (
  | { type: "link"; path: string }
  | { type: "group"; items: NavLeaf[] }
);

const NAV: NavSection[] = [
  { id: "dashboard", type: "link", label: "Dashboard", icon: LayoutDashboard, path: "/home" },
  { id: "pos", type: "link", label: "POS", icon: ShoppingCart, path: "/pos" },
  {
    id: "item", type: "group", label: "Item", icon: UtensilsCrossed,
    items: [
      { path: "/products",   label: "List Item",     icon: UtensilsCrossed },
      { path: "/categories", label: "List Category",  icon: Tag },
      { path: "/modifiers",  label: "List Modifiers", icon: SlidersHorizontal },
    ],
  },
  {
    id: "sales", type: "group", label: "Sales", icon: TrendingUp,
    items: [
      { path: "/sales",       label: "List of Sales", icon: TrendingUp },
      { path: "/customers",   label: "Customers",     icon: Users },
      { path: "/promotions",  label: "Promotions",    icon: Percent },
    ],
  },
  {
    id: "panel", type: "group", label: "Panel", icon: Monitor,
    items: [
      { path: "/pos",      label: "POS",             icon: ShoppingCart },
      { path: "/kds",      label: "Kitchen Display", icon: ChefHat },
      { path: "/tables",   label: "Tables",          icon: Table2 },
    ],
  },
  {
    id: "users", type: "group", label: "Users", icon: Users,
    items: [
      { path: "/users", label: "List Users", icon: Users },
    ],
  },
  { id: "settings", type: "link", label: "Settings", icon: Settings, path: "/settings" },
  { id: "reports",  type: "link", label: "Reports",  icon: BarChart3, path: "/reports" },
];

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Only collapsible groups need open state; default all open
  const [open, setOpen] = useState<Record<string, boolean>>({
    item: true, sales: false, panel: false, users: true,
  });

  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(path: string) {
    if (path === "/home") return location === "/home";
    return location === path || location.startsWith(path + "/");
  }

  function groupHasActive(items: NavLeaf[]) {
    return items.some(i => isActive(i.path));
  }

  return (
    <div className="w-56 flex flex-col h-full border-r shrink-0" style={{ background: SURF, borderColor: BORD }}>
      {/* Logo */}
      <div className="p-4 border-b shrink-0" style={{ borderColor: BORD }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD }}>
            <UtensilsCrossed size={16} color="#1A0A2E" />
          </div>
          <div>
            <div className="font-bold text-sm" style={{ color: GOLD }}>iDine</div>
            <div className="text-[10px]" style={{ color: MUTED }}>Restaurant POS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(section => {
          if (section.type === "link") {
            const active = isActive(section.path);
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.path)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-all text-left"
                style={{
                  background: active ? GOLD + "22" : "transparent",
                  color: active ? GOLD : MUTED,
                  borderLeft: active ? `2px solid ${GOLD}` : "2px solid transparent",
                }}
              >
                <section.icon size={14} />
                {section.label}
              </button>
            );
          }

          // group
          const isOpen = open[section.id] ?? false;
          const hasActive = groupHasActive(section.items);

          return (
            <div key={section.id}>
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all"
                style={{
                  color: hasActive ? GOLD : MUTED,
                  background: hasActive && !isOpen ? GOLD + "11" : "transparent",
                }}
              >
                <div className="flex items-center gap-2">
                  <section.icon size={14} />
                  {section.label}
                </div>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {isOpen && (
                <div className="pb-1">
                  {section.items.map(item => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path + item.label}
                        onClick={() => navigate(item.path)}
                        className="w-full flex items-center gap-2.5 pl-8 pr-3 py-2 text-xs font-medium transition-all text-left"
                        style={{
                          background: active ? GOLD + "22" : "transparent",
                          color: active ? GOLD : DIM,
                          borderLeft: active ? `2px solid ${GOLD}` : "2px solid transparent",
                        }}
                      >
                        <item.icon size={12} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t shrink-0" style={{ borderColor: BORD }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium mb-1 transition-all"
          style={{ color: MUTED, background: "transparent" }}
          onMouseEnter={e => (e.currentTarget.style.background = BORD + "88")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium"
          style={{ color: "#EF4444" }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
