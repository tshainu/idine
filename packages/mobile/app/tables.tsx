import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { loadUser, clearUser, WaiterUser } from "../lib/auth";

// ── Design tokens ────────────────────────────────────────────────
const C = {
  navy:    "#0D1B6E",
  navy2:   "#162280",
  navy3:   "#0A1255",
  accent:  "#4F6EF7",
  white:   "#FFFFFF",
  light:   "#EEF0FB",
  muted:   "#8891B8",
  red:     "#EF4444",
  green:   "#22C55E",
  amber:   "#F59E0B",
  purple:  "#A855F7",
  gold:    "#F5A623",
  card:    "#F7F8FE",
  border:  "#DDE1F5",
  navBg:   "#111A5C",
};

const STATUS_COLORS: Record<string, string> = {
  available: C.green,
  occupied:  C.amber,
  reserved:  C.purple,
  cleaning:  C.red,
};
const STATUS_LABELS: Record<string, string> = {
  available: "Free",
  occupied:  "Occupied",
  reserved:  "Reserved",
  cleaning:  "Cleaning",
};
const STATUS_BG: Record<string, string> = {
  available: "#DCFCE7",
  occupied:  "#FEF3C7",
  reserved:  "#F3E8FF",
  cleaning:  "#FEE2E2",
};

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function getDate() {
  const now = new Date();
  return now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TablesScreen() {
  const router = useRouter();
  const [user, setUser] = useState<WaiterUser | null>(null);
  const [time, setTime] = useState(getTime());
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    loadUser().then((u) => { if (!u) router.replace("/"); else setUser(u); });
    const iv = setInterval(() => setTime(getTime()), 30000);
    return () => clearInterval(iv);
  }, []);

  const branchId = user?.branchId ?? 1;

  const { data: tablesData, isLoading, refetch } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: async () => {
      const res = await api.tables.$get({ query: { branchId: String(branchId) } });
      const json = await res.json() as any;
      return json.tables ?? json;
    },
    refetchInterval: 10000,
    enabled: !!user,
  });

  const tables: any[] = Array.isArray(tablesData) ? tablesData : [];

  const statuses = ["all", "available", "occupied", "reserved", "cleaning"];
  const counts: Record<string, number> = { all: tables.length };
  for (const t of tables) counts[t.status] = (counts[t.status] ?? 0) + 1;

  const filtered = activeTab === "all" ? tables : tables.filter(t => t.status === activeTab);

  const grouped: Record<string, any[]> = {};
  for (const t of filtered) {
    const z = t.zone || "Main Hall";
    if (!grouped[z]) grouped[z] = [];
    grouped[z].push(t);
  }

  const handleLogout = () => {
    Alert.alert("Logout", "Sign out of your session?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await clearUser(); router.replace("/"); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy3} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoCircle}>
            <Ionicons name="restaurant" size={15} color={C.white} />
          </View>
          <View>
            <Text style={s.brand}>AXIS RESTAURANT</Text>
            <Text style={s.date}>{getDate()}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={s.avatarWrap}>
            <Ionicons name="person" size={14} color={C.accent} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.waiterName}>{user?.name ?? "Waiter"}</Text>
            <Text style={s.waiterTime}>{time}</Text>
          </View>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          { label: "Total", val: tables.length, color: C.accent },
          { label: "Free", val: counts.available ?? 0, color: C.green },
          { label: "Busy", val: counts.occupied ?? 0, color: C.amber },
          { label: "Reserved", val: counts.reserved ?? 0, color: C.purple },
        ].map((st, i) => (
          <View key={i} style={s.statItem}>
            <Text style={[s.statNum, { color: st.color }]}>{st.val}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
        <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()}>
          <Ionicons name="refresh" size={17} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* ── Tab filter ── */}
      <View style={s.tabBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statuses}
          keyExtractor={i => i}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
          renderItem={({ item: st }) => (
            <TouchableOpacity
              style={[s.tabChip, activeTab === st && s.tabChipActive]}
              onPress={() => setActiveTab(st)}
            >
              <Text style={[s.tabChipTxt, activeTab === st && s.tabChipTxtActive]}>
                {st === "all" ? "All" : STATUS_LABELS[st] ?? st}
                {counts[st] !== undefined ? ` (${counts[st]})` : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Table grid ── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadTxt}>Loading tables…</Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(grouped)}
          keyExtractor={([z]) => z}
          contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
          renderItem={({ item: [zone, zoneTables] }) => (
            <View style={{ marginBottom: 22 }}>
              <View style={s.zoneRow}>
                <View style={s.zoneDot} />
                <Text style={s.zoneLabel}>{zone}</Text>
                <View style={s.zoneLine} />
              </View>
              <View style={s.tableGrid}>
                {zoneTables.map((t: any) => {
                  const color = STATUS_COLORS[t.status] ?? C.muted;
                  const bg    = STATUS_BG[t.status] ?? C.light;
                  const locked = t.status === "cleaning";
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[s.tableCard, locked && s.tableCardDisabled]}
                      onPress={() => {
                        if (!locked)
                          router.push(`/waiter-order?tableId=${t.id}&name=${encodeURIComponent(t.name)}&status=${t.status}` as any);
                      }}
                      activeOpacity={0.75}
                      disabled={locked}
                    >
                      {/* Color bar */}
                      <View style={[s.tableColorBar, { backgroundColor: color }]} />
                      <View style={s.tableBody}>
                        <Text style={s.tableName}>{t.name}</Text>
                        <View style={[s.tableStatusBadge, { backgroundColor: bg }]}>
                          <View style={[s.tableDot, { backgroundColor: color }]} />
                          <Text style={[s.tableStatusTxt, { color }]}>
                            {STATUS_LABELS[t.status] ?? t.status}
                          </Text>
                        </View>
                        <View style={s.tableCapRow}>
                          <Ionicons name="people-outline" size={12} color={C.muted} />
                          <Text style={s.tableCap}>{t.capacity}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      {/* ── Bottom nav ── */}
      <BottomNav active="tables" router={router} onLogout={handleLogout} />
    </SafeAreaView>
  );
}

// ── Shared bottom nav ─────────────────────────────────────────────
export function BottomNav({ active, router, onLogout }: {
  active: "tables" | "history" | "notifications" | "ready" | "order";
  router: any;
  onLogout?: () => void;
}) {
  const items = [
    { key: "history",       icon: "time-outline",              label: "History",        route: "/history" },
    { key: "notifications", icon: "notifications-outline",     label: "Alerts",         route: "/notifications" },
    { key: "ready",         icon: "checkmark-circle-outline",  label: "Ready",          route: "/ready-items" },
    { key: "tables",        icon: "grid-outline",              label: "Tables",         route: "/tables" },
  ] as const;

  return (
    <View style={nav.bar}>
      {items.map(item => {
        const isActive = active === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={nav.item}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[nav.iconWrap, isActive && nav.iconWrapActive]}>
              <Ionicons name={item.icon as any} size={21} color={isActive ? C.white : C.muted} />
            </View>
            <Text style={[nav.label, isActive && nav.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={nav.item} onPress={onLogout} activeOpacity={0.7}>
        <View style={nav.iconWrap}>
          <Ionicons name="log-out-outline" size={21} color={C.muted} />
        </View>
        <Text style={nav.label}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const nav = StyleSheet.create({
  bar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    backgroundColor: C.navBg,
    paddingTop: 10, paddingBottom: 22,
    borderTopWidth: 1, borderTopColor: "#1E2D8A",
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  iconWrap: { width: 40, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  iconWrapActive: { backgroundColor: C.accent },
  label: { color: C.muted, fontSize: 10, fontWeight: "600" },
  labelActive: { color: C.white },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
  },
  brand: { color: C.white, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  date: { color: C.muted, fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.light, alignItems: "center", justifyContent: "center",
  },
  waiterName: { color: C.white, fontSize: 13, fontWeight: "700" },
  waiterTime: { color: C.muted, fontSize: 11 },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 4,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800" },
  statLabel: { color: C.muted, fontSize: 10, fontWeight: "600", marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.light, alignItems: "center", justifyContent: "center",
  },

  tabBar: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  tabChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card,
  },
  tabChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  tabChipTxt: { color: C.muted, fontSize: 12, fontWeight: "600" },
  tabChipTxtActive: { color: C.white },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadTxt: { color: C.muted, fontSize: 13 },

  zoneRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  zoneDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  zoneLabel: { color: C.navy, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  zoneLine: { flex: 1, height: 1, backgroundColor: C.border },

  tableGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tableCard: {
    width: "30%", minWidth: 96,
    backgroundColor: C.white, borderRadius: 14,
    overflow: "hidden",
    shadowColor: C.navy, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tableCardDisabled: { opacity: 0.45 },
  tableColorBar: { height: 5 },
  tableBody: { padding: 10, alignItems: "center", gap: 6 },
  tableName: { color: C.navy, fontSize: 16, fontWeight: "800" },
  tableStatusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  tableDot: { width: 6, height: 6, borderRadius: 3 },
  tableStatusTxt: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  tableCapRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  tableCap: { color: C.muted, fontSize: 11 },
});
