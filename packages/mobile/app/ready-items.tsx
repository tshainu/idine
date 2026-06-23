import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function ReadyItemsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ["orders-ready"],
    queryFn: async () => {
      const res = await (api.orders.$get as any)({ query: { branchId: "1", status: "ready" } });
      const json = await res.json() as any;
      return json.orders ?? json;
    },
    refetchInterval: 10000,
  });

  const orders: any[] = Array.isArray(ordersData) ? ordersData : [];

  const markServed = useMutation({
    mutationFn: async (id: number) => {
      const res = await (api.orders[":id"].$patch as any)({
        param: { id: String(id) },
        json: { status: "served" },
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders-ready"] }),
  });

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
        <Text style={styles.headerTitle}>Ready Items</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={18} color={WHITE} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={56} color={SUCCESS} />
          <Text style={styles.emptyTitle}>All clear!</Text>
          <Text style={styles.emptyText}>No ready orders waiting to be served</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item: order }) => {
            const orderNum = order.orderNumber ?? `ORD-${String(order.id).padStart(4, "0")}`;
            const itemCount = order.items?.length ?? 0;
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderLeft}>
                  <View style={styles.readyBadge}>
                    <Ionicons name="checkmark" size={18} color={WHITE} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNum}>{orderNum}</Text>
                  <Text style={styles.orderMeta}>{order.customerName ?? "Guest"} · Table {order.tableId}</Text>
                  <Text style={styles.orderMeta}>{itemCount} item{itemCount !== 1 ? "s" : ""}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.serveBtn, markServed.isPending && { opacity: 0.5 }]}
                  onPress={() => markServed.mutate(order.id)}
                  disabled={markServed.isPending}
                >
                  <Text style={styles.serveBtnText}>Mark Served</Text>
                </TouchableOpacity>
              </View>
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
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/notifications" as any)}>
          <Text style={styles.navLabel}>Notification</Text>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navLabel, { color: "#F5A623" }]}>Ready item</Text>
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
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center" },
  orderCard: {
    backgroundColor: WHITE, borderRadius: 10,
    borderWidth: 1, borderColor: "#B8F5C8",
    borderLeftWidth: 4, borderLeftColor: SUCCESS,
    padding: 12, flexDirection: "row", alignItems: "center", gap: 12,
  },
  orderLeft: {},
  readyBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: SUCCESS, alignItems: "center", justifyContent: "center",
  },
  orderNum: { color: NAVY, fontSize: 14, fontWeight: "700" },
  orderMeta: { color: MUTED, fontSize: 11, marginTop: 1 },
  serveBtn: {
    backgroundColor: NAVY, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  serveBtnText: { color: WHITE, fontSize: 12, fontWeight: "700" },
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
