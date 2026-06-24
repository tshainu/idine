import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { clearUser } from "../lib/auth";
import { BottomNav } from "./tables";

const C = {
  navy:   "#0D1B6E",
  navy3:  "#0A1255",
  accent: "#4F6EF7",
  white:  "#FFFFFF",
  light:  "#EEF0FB",
  muted:  "#8891B8",
  green:  "#22C55E",
  greenBg:"#DCFCE7",
  amber:  "#F59E0B",
  amberBg:"#FEF3C7",
  card:   "#F7F8FE",
  border: "#DDE1F5",
};

export default function NotificationsScreen() {
  const router = useRouter();

  const { data, refetch } = useQuery({
    queryKey: ["notif-ready"],
    queryFn: async () => {
      const res = await (api.orders.$get as any)({ query: { branchId: "1", status: "ready" } });
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
        <TouchableOpacity onPress={() => router.push("/tables" as any)} style={s.backBtn}>
          <Ionicons name="home" size={19} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notifications</Text>
          {orders.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countTxt}>{orders.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()}>
          <Ionicons name="refresh" size={18} color={C.white} />
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={38} color={C.muted} />
          </View>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyBody}>No new notifications right now</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}
          ListHeaderComponent={
            <Text style={s.sectionHeader}>
              KITCHEN READY  ·  {orders.length} order{orders.length !== 1 ? "s" : ""}
            </Text>
          }
          renderItem={({ item: o }) => {
            const orderNum = o.orderNumber ?? `#${String(o.id).padStart(4, "0")}`;
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push("/ready-items" as any)}
                activeOpacity={0.8}
              >
                <View style={s.iconWrap}>
                  <Ionicons name="checkmark-circle" size={28} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.notifTitle}>Ready to Serve  ·  {orderNum}</Text>
                  <Text style={s.notifBody}>
                    {o.customerName ?? "Guest"}  ·  Table {o.tableId}
                  </Text>
                  <View style={s.readyChip}>
                    <Text style={s.readyChipTxt}>Tap to mark served →</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.muted} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      <BottomNav active="notifications" router={router} onLogout={handleLogout} />
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
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: "700" },
  countBadge: { backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countTxt: { color: C.white, fontSize: 12, fontWeight: "800" },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white + "18", alignItems: "center", justifyContent: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.light, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { color: C.navy, fontSize: 17, fontWeight: "700" },
  emptyBody: { color: C.muted, fontSize: 13 },

  sectionHeader: { color: C.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4 },

  card: {
    backgroundColor: C.white, borderRadius: 14, flexDirection: "row", alignItems: "center",
    padding: 14, gap: 12,
    shadowColor: C.navy, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.greenBg, alignItems: "center", justifyContent: "center" },
  notifTitle: { color: C.navy, fontSize: 14, fontWeight: "700" },
  notifBody: { color: C.muted, fontSize: 12, marginTop: 3 },
  readyChip: { marginTop: 6, backgroundColor: C.greenBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  readyChipTxt: { color: C.green, fontSize: 11, fontWeight: "700" },
});
