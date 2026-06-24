import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { clearUser } from "../lib/auth";
import { BottomNav } from "./tables";

const C = {
  navy:   "#0D1B6E",
  navy2:  "#162280",
  navy3:  "#0A1255",
  accent: "#4F6EF7",
  white:  "#FFFFFF",
  light:  "#EEF0FB",
  muted:  "#8891B8",
  red:    "#EF4444",
  green:  "#22C55E",
  amber:  "#F59E0B",
  blue:   "#38BDF8",
  card:   "#F7F8FE",
  border: "#DDE1F5",
  navBg:  "#111A5C",
};

const STATUS: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: C.amber,  bg: "#FEF3C7", label: "Pending" },
  hold:      { color: C.muted,  bg: C.light,   label: "On Hold" },
  preparing: { color: C.blue,   bg: "#E0F5FE", label: "Preparing" },
  ready:     { color: C.green,  bg: "#DCFCE7", label: "Ready" },
  served:    { color: C.green,  bg: "#DCFCE7", label: "Served" },
  completed: { color: C.navy,   bg: C.light,   label: "Done" },
  cancelled: { color: C.red,    bg: "#FEE2E2", label: "Cancelled" },
};

const FILTERS = ["all", "pending", "preparing", "ready", "completed", "cancelled"];

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orders-history", filter],
    queryFn: async () => {
      const q: Record<string, string> = { branchId: "1" };
      if (filter !== "all") q.status = filter;
      const res = await (api.orders.$get as any)({ query: q });
      const json = await res.json() as any;
      return json.orders ?? json;
    },
    refetchInterval: 15000,
  });

  const orders: any[] = Array.isArray(data) ? data : [];

  const handleLogout = () => {
    Alert.alert("Logout", "Sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await clearUser(); router.replace("/"); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy3} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Order History</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()}>
          <Ionicons name="refresh" size={18} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* ── Filter chips ── */}
      <View style={s.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={i => i}
          contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 10 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipTxt, filter === f && s.chipTxtActive]}>
                {f === "all" ? "All" : STATUS[f]?.label ?? f}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="receipt-outline" size={38} color={C.muted} />
          </View>
          <Text style={s.emptyTitle}>No orders found</Text>
          <Text style={s.emptyBody}>Try a different filter</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}
          renderItem={({ item: o }) => {
            const st = STATUS[o.status] ?? { color: C.muted, bg: C.light, label: o.status };
            const orderNum = o.orderNumber ?? `#${String(o.id).padStart(4, "0")}`;
            const itemCount = o.items?.length ?? 0;
            return (
              <View style={s.card}>
                <View style={[s.cardAccent, { backgroundColor: st.color }]} />
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <View>
                      <Text style={s.orderNum}>{orderNum}</Text>
                      <Text style={s.orderMeta}>
                        {o.customerName || "Guest"}  ·  Table {o.tableId}
                      </Text>
                      <Text style={s.orderMeta}>{itemCount} item{itemCount !== 1 ? "s" : ""}</Text>
                    </View>
                    <View style={s.cardRight}>
                      <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <View style={[s.badgeDot, { backgroundColor: st.color }]} />
                        <Text style={[s.badgeTxt, { color: st.color }]}>{st.label}</Text>
                      </View>
                      <Text style={s.total}>Rs. {Number(o.total ?? 0).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <BottomNav active="history" router={router} onLogout={handleLogout} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.card },

  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white + "18", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, color: C.white, fontSize: 17, fontWeight: "700" },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white + "18", alignItems: "center", justifyContent: "center" },

  filterWrap: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipTxt: { color: C.muted, fontSize: 12, fontWeight: "600" },
  chipTxtActive: { color: C.white },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.light, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { color: C.navy, fontSize: 16, fontWeight: "700" },
  emptyBody: { color: C.muted, fontSize: 13 },

  card: {
    backgroundColor: C.white, borderRadius: 14, flexDirection: "row", overflow: "hidden",
    shadowColor: C.navy, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 14 },
  orderNum: { color: C.navy, fontSize: 15, fontWeight: "800" },
  orderMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeTxt: { fontSize: 11, fontWeight: "700" },
  total: { color: C.navy, fontSize: 14, fontWeight: "800" },
});
