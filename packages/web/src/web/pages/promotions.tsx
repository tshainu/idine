import { Sidebar } from "../components/layout/sidebar";
import { Star, Clock } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

export default function PromotionsPage() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Promotions</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(245,166,35,0.1)", border: `1px solid ${BORD}` }}>
              <Star size={28} color={GOLD} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: TEXT }}>Promotions & Discounts</h2>
            <p className="text-sm mb-1" style={{ color: MUTED }}>Create discount codes, combo deals, and happy hour pricing.</p>
            <p className="text-xs" style={{ color: DIM }}>Items tagged as "Promo" in Menu Items will appear here.</p>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs" style={{ color: DIM }}>
              <Clock size={12} />
              <span>Coming in next update</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
