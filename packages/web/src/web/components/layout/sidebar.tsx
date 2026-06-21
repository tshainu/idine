import { useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, TrendingUp, BarChart3, Package,
  Receipt, Settings, Printer, Users, UtensilsCrossed, LogOut,
  ChevronDown, ChevronRight, Tag, Utensils, ShoppingBag, Monitor,
  Coffee, BookOpen, Building2, Table2, Globe, Percent, Wallet,
  Star, Truck, CreditCard
} from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";

type NavItem = { path: string; label: string; icon?: any };
type NavGroup = { id: string; label: string; icon: any; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    icon: LayoutDashboard,
    items: [
      { path: "/home", label: "Dashboard", icon: LayoutDashboard },
      { path: "/pos", label: "POS", icon: ShoppingCart },
      { path: "/kds", label: "Kitchen Display", icon: Monitor },
    ],
  },
  {
    id: "sale",
    label: "Sale",
    icon: ShoppingBag,
    items: [
      { path: "/sales", label: "List Sale", icon: TrendingUp },
      { path: "/customers", label: "List Customer", icon: Users },
      { path: "/promotions", label: "List Promotion", icon: Star },
    ],
  },
  {
    id: "item",
    label: "Item",
    icon: UtensilsCrossed,
    items: [
      { path: "/products", label: "List Food Menu", icon: UtensilsCrossed },
      { path: "/categories", label: "List Menu Category", icon: Tag },
      { path: "/ingredients", label: "List Ingredient", icon: Utensils },
      { path: "/modifiers", label: "List Modifier", icon: BookOpen },
    ],
  },
  {
    id: "purchase",
    label: "Purchase",
    icon: Package,
    items: [
      { path: "/purchase", label: "List Purchase", icon: Package },
      { path: "/expenses", label: "List Expense", icon: Receipt },
    ],
  },
  {
    id: "panel",
    label: "Panel",
    icon: Monitor,
    items: [
      { path: "/kitchen", label: "Kitchen Setup", icon: Printer },
      { path: "/users", label: "Users / Waiters", icon: Users },
      { path: "/tables", label: "Tables", icon: Table2 },
      { path: "/admin", label: "Admin", icon: Building2 },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    items: [
      { path: "/reports", label: "Sales Report", icon: BarChart3 },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { path: "/settings", label: "General Settings", icon: Settings },
      { path: "/settings/outlet", label: "Outlet Setting", icon: Building2 },
      { path: "/settings/tax", label: "Tax Setting", icon: Percent },
      { path: "/settings/payment", label: "Payment Methods", icon: CreditCard },
      { path: "/settings/printers", label: "Printer Setup", icon: Printer },
      { path: "/settings/delivery", label: "Delivery Partners", icon: Truck },
      { path: "/settings/loyalty", label: "Loyalty & Wallet", icon: Wallet },
    ],
  },
];

export function Sidebar() {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({
    main: true,
    sale: false,
    item: false,
    purchase: false,
    panel: false,
    reports: false,
    settings: false,
  });

  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(path: string) {
    return location === path || (path !== "/home" && path !== "/" && location.startsWith(path));
  }

  function groupHasActive(group: NavGroup) {
    return group.items.some(item => isActive(item.path));
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
        {GROUPS.map(group => {
          const isOpen = open[group.id];
          const hasActive = groupHasActive(group);

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => toggle(group.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-all"
                style={{
                  color: hasActive ? GOLD : MUTED,
                  background: hasActive && !isOpen ? GOLD + "11" : "transparent",
                }}
              >
                <div className="flex items-center gap-2">
                  <group.icon size={14} />
                  {group.label}
                </div>
                {isOpen
                  ? <ChevronDown size={12} />
                  : <ChevronRight size={12} />
                }
              </button>

              {/* Group items */}
              {isOpen && (
                <div className="pb-1">
                  {group.items.map(item => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="w-full flex items-center gap-2.5 pl-7 pr-3 py-2 text-xs font-medium transition-all text-left"
                        style={{
                          background: active ? GOLD + "22" : "transparent",
                          color: active ? GOLD : DIM,
                          borderLeft: active ? `2px solid ${GOLD}` : "2px solid transparent",
                        }}
                      >
                        {item.icon && <item.icon size={12} />}
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
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
          style={{ color: "#EF4444" }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );
}
