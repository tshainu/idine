import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, SafeAreaView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURFACE = "#1A0A2E";
const SURFACE2 = "#221040";
const BORDER = "#2A1A4A";
const TEXT = "#EDE8F5";
const MUTED = "#9D8EC0";
const SUCCESS = "#22C55E";
const WARNING = "#EAB308";
const DANGER = "#EF4444";
const INFO = "#38BDF8";

const STATUS_COLORS: Record<string, string> = {
  pending: WARNING,
  preparing: INFO,
  ready: SUCCESS,
  served: MUTED,
  cancelled: DANGER,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

const NEXT_STATUS: Record<string, string> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
};

export default function OrdersScreen() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const qc = useQueryClient();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["orders", filterStatus],
    queryFn: async () => {
      const query: Record<string, string> = { branchId: "1" };
      if (filterStatus !== "all") query.status = filterStatus;
      const res = await (api.orders.$get as any)({ query });
      return res.json();
    },
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.orders[":id"].$patch({
        param: { id: String(id) },
        json: { status },
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  const orderList: any[] = Array.isArray(orders) ? orders : [];

  const filters = ["all", "pending", "preparing", "ready", "served"];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Running Orders</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={GOLD} />
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <FlatList
        data={filters}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={f => f}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: BORDER }}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === f && styles.filterChipActive]}
            onPress={() => setFilterStatus(f)}
          >
            <Text style={[styles.filterChipText, filterStatus === f && { color: BG }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : orderList.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={48} color={MUTED} />
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={orderList}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item: order }) => {
            const statusColor = STATUS_COLORS[order.status] || MUTED;
            const nextStatus = NEXT_STATUS[order.status];
            const orderNum = `ORD-${String(order.id).padStart(4, "0")}`;
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderNum}>{orderNum}</Text>
                    <Text style={styles.orderMeta}>
                      {order.customerName || "Guest"} · Table {order.tableId}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_LABELS[order.status] || order.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDivider} />

                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>
                    Rs. {(Number(order.total) || 0).toFixed(2)}
                  </Text>
                  {nextStatus && (
                    <TouchableOpacity
                      style={styles.advanceBtn}
                      onPress={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                      disabled={updateStatus.isPending}
                    >
                      <Text style={styles.advanceBtnText}>
                        Mark {STATUS_LABELS[nextStatus]} →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { color: TEXT, fontSize: 18, fontWeight: "700" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  filterChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  filterChipText: { color: MUTED, fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: MUTED, fontSize: 15, marginTop: 8 },
  orderCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 8,
  },
  orderNum: { color: TEXT, fontSize: 15, fontWeight: "700" },
  orderMeta: { color: MUTED, fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  orderDivider: { height: 1, backgroundColor: BORDER },
  orderFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  orderTotal: { color: GOLD, fontSize: 16, fontWeight: "700" },
  advanceBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  advanceBtnText: { color: BG, fontSize: 12, fontWeight: "700" },
});
