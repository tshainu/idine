import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";

const NAVY = "#0D1B6E";
const NAVY2 = "#162280";
const WHITE = "#FFFFFF";
const LIGHT = "#E8ECF8";
const MUTED = "#8891B8";
const BORDER = "#C5CCE8";
const DARK_BORDER = "#2A3A9A";
const SUCCESS = "#22C55E";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";
const INFO = "#38BDF8";

const STATUS_COLORS: Record<string, string> = {
  pending: WARNING,
  hold: MUTED,
  preparing: INFO,
  ready: SUCCESS,
  served: SUCCESS,
  completed: SUCCESS,
  cancelled: DANGER,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  hold: "On Hold",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ["orders-history", filter],
    queryFn: async () => {
      const query: Record<string, string> = { branchId: "1" };
      if (filter !== "all") query.status = filter;
      const res = await (api.orders.$get as any)({ query });
      const json = await res.json() as any;
      return json.orders ?? json;
    },
    refetchInterval: 15000,
  });

  const orders: any[] = Array.isArray(ordersData) ? ordersData : [];
  const filters = ["all", "pending", "preparing", "ready", "completed"];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.logoBox}>
          <Ionicons name="restaurant" size={14} color={WHITE} />
        </View>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={18} color={WHITE} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterBar}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={48} color={MUTED} />
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item: order }) => {
            const statusColor = STATUS_COLORS[order.status] ?? MUTED;
            const orderNum = order.orderNumber ?? `ORD-${String(order.id).padStart(4, "0")}`;
            const itemCount = order.items?.length ?? 0;
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNum}>{orderNum}</Text>
                    <Text style={styles.orderMeta}>
                      {order.customerName || "Guest"} · Table {order.tableId}
                    </Text>
                    <Text style={styles.orderMeta}>{itemCount} item{itemCount !== 1 ? "s" : ""}</Text>
                  </View>
                  <View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Text>
                    </View>
                    <Text style={styles.orderTotal}>
                      Rs. {Number(order.total ?? 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.back()}>
          <Text style={[styles.navLabel, { color: "#F5A623" }]}>History</Text>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/notifications" as any)}>
          <Text style={styles.navLabel}>Notification</Text>
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
    backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 12,
    gap: 8,
  },
  logoBox: { width: 28, height: 28, borderRadius: 6, backgroundColor: WHITE + "22", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: WHITE, fontSize: 16, fontWeight: "700" },
  filterBar: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: NAVY + "44",
  },
  filterChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterText: { color: NAVY, fontSize: 12, fontWeight: "600" },
  filterTextActive: { color: WHITE },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { color: MUTED, fontSize: 14 },
  orderCard: {
    backgroundColor: WHITE, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, padding: 12,
  },
  orderTop: { flexDirection: "row", gap: 10 },
  orderNum: { color: NAVY, fontSize: 14, fontWeight: "700" },
  orderMeta: { color: MUTED, fontSize: 11, marginTop: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-end" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  orderTotal: { color: NAVY, fontSize: 14, fontWeight: "700", textAlign: "right", marginTop: 6 },
  bottomNav: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    backgroundColor: NAVY2, paddingVertical: 12, paddingBottom: 18,
    borderTopWidth: 1, borderTopColor: DARK_BORDER,
  },
  navItem: { flex: 1, alignItems: "center" },
  navLabel: { color: WHITE, fontSize: 12, fontWeight: "600" },
  navDivider: { width: 1, height: 18, backgroundColor: WHITE + "33" },
});
