import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";

const NAVY = "#0D1B6E";
const NAVY2 = "#162280";
const WHITE = "#FFFFFF";
const MUTED = "#8891B8";
const BORDER = "#C5CCE8";
const DARK_BORDER = "#2A3A9A";
const SUCCESS = "#22C55E";

export default function NotificationsScreen() {
  const router = useRouter();

  // Use ready orders as notifications
  const { data: ordersData, refetch } = useQuery({
    queryKey: ["orders-ready-notif"],
    queryFn: async () => {
      const res = await (api.orders.$get as any)({ query: { branchId: "1", status: "ready" } });
      const json = await res.json() as any;
      return json.orders ?? json;
    },
    refetchInterval: 15000,
  });

  const readyOrders: any[] = Array.isArray(ordersData) ? ordersData : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.logoBox}>
          <Ionicons name="restaurant" size={14} color={WHITE} />
        </View>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={18} color={WHITE} />
        </TouchableOpacity>
      </View>

      {readyOrders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={52} color={MUTED} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={readyOrders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item: order }) => {
            const orderNum = order.orderNumber ?? `ORD-${String(order.id).padStart(4, "0")}`;
            return (
              <TouchableOpacity
                style={styles.notifCard}
                onPress={() => router.push("/ready-items" as any)}
                activeOpacity={0.8}
              >
                <View style={styles.notifIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={SUCCESS} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Order Ready · {orderNum}</Text>
                  <Text style={styles.notifBody}>
                    {order.customerName ?? "Guest"} · Table {order.tableId} · Order is ready to serve
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/history" as any)}>
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem}>
          <View style={{ position: "relative" }}>
            <Text style={[styles.navLabel, { color: "#F5A623" }]}>Notification</Text>
            {readyOrders.length > 0 && <View style={styles.notifDot} />}
          </View>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/ready-items" as any)}>
          <Text style={styles.navLabel}>Ready item</Text>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/tables" as any)}>
          <Text style={styles.navLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },
  header: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  logoBox: { width: 28, height: 28, borderRadius: 6, backgroundColor: WHITE + "22", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: WHITE, fontSize: 16, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { color: NAVY, fontSize: 18, fontWeight: "700" },
  emptyText: { color: MUTED, fontSize: 13 },
  notifCard: {
    backgroundColor: WHITE, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
  },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: SUCCESS + "18", alignItems: "center", justifyContent: "center" },
  notifTitle: { color: NAVY, fontSize: 13, fontWeight: "700" },
  notifBody: { color: MUTED, fontSize: 11, marginTop: 2 },
  bottomNav: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    backgroundColor: NAVY2, paddingVertical: 12, paddingBottom: 18,
    borderTopWidth: 1, borderTopColor: DARK_BORDER,
  },
  navItem: { flex: 1, alignItems: "center" },
  navLabel: { color: WHITE, fontSize: 12, fontWeight: "600" },
  navDivider: { width: 1, height: 18, backgroundColor: WHITE + "33" },
  notifDot: {
    position: "absolute", top: -2, right: -8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: SUCCESS,
  },
});
