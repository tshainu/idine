import { Sidebar } from "../components/layout/sidebar";
import { Package, Plus } from "lucide-react";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURF = "#1A0A2E";
const BORD = "#2D1B4E";
const MUTED = "#9CA3AF";
const DIM = "#6B7280";
const TEXT = "#F3F4F6";

export default function PurchasePage() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ background: SURF, borderColor: BORD }}>
          <div className="font-bold text-base" style={{ color: TEXT }}>Purchase</div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold opacity-50 cursor-not-allowed"
            style={{ background: GOLD, color: "#1A0A2E" }}>
            <Plus size={13} />
            New Purchase
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto" style={{ background: SURF, border: `2px dashed ${BORD}` }}>
              <Package size={32} style={{ color: DIM }} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: TEXT }}>Purchase Management</div>
              <div className="text-xs mt-1" style={{ color: DIM }}>Coming soon — track supplier purchases,<br />inventory intake, and stock levels.</div>
            </div>
            <div className="px-4 py-2 rounded-lg text-xs inline-block" style={{ background: SURF, border: `1px solid ${BORD}`, color: MUTED }}>
              Feature in development
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
