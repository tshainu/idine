import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  green:  "#22C55E",
  greenBg:"#DCFCE7",
  card:   "#F7F8FE",
  border: "#DDE1F5",
};

export default function ReadyItemsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orders-ready"],
    queryFn: async () => {
      const res = await (api.orders.$get as any)({ query: { branchId: "1", status: "ready" } });
      const json = await res.json() as any;
      return json.orders ?? json;
    },
    refetchInterval: 10000,
  });

  const orders: any[] = Array.isArray(data) ? data : [];

  const markServed = useMutation({
    mutationFn: async (id: number) => {
      const res = await (api.orders[":id"].$patch as any)({
        param: { id: String(id) },
        json: { status: "served" },
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders-ready"] }),
    onError: () => Alert.alert("Error", "Could not update order"),
  });

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
          <Text style={s.headerTitle}>Ready to Serve</Text>
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

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyCircle}>
            <Ionicons name="checkmark-done" size={40} color={C.green} />
          </View>
          <Text style={s.emptyTitle}>All cleared!</Text>
          <Text style={s.emptyBody}>No orders waiting to be served</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}
          renderItem={({ item: o }) => {
            const orderNum = o.orderNumber ?? `#${String(o.id).padStart(4, "0")}`;
            const itemCount = o.items?.length ?? 0;
            const busy = markServed.isPending;
            return (
              <View style={s.card}>
                {/* Green left bar */}
                <View style={s.cardBar} />
                <View style={s.cardInner}>
                  <View style={s.greenCircle}>
                    <Ionicons name="checkmark" size={22} color={C.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderNum}>{orderNum}</Text>
                    <Text style={s.orderMeta}>{o.customerName ?? "Guest"}  ·  Table {o.tableId}</Text>
                    <Text style={s.orderMeta}>{itemCount} item{itemCount !== 1 ? "s" : ""}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.serveBtn, busy && { opacity: 0.5 }]}
                    onPress={() => markServed.mutate(o.id)}
                    disabled={busy}
                  >
                    {busy
                      ? <ActivityIndicator size="small" color={C.white} />
                      : <>
                          <Ionicons name="checkmark-circle" size={16} color={C.white} />
                          <Text style={s.serveTxt}>Served</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <BottomNav active="ready" router={router} onLogout={handleLogout} />
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
  emptyCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.greenBg, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { color: C.navy, fontSize: 18, fontWeight: "800" },
  emptyBody: { color: C.muted, fontSize: 13, textAlign: "center" },

  card: {
    backgroundColor: C.white, borderRadius: 14, flexDirection: "row", overflow: "hidden",
    shadowColor: C.navy, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBar: { width: 4, backgroundColor: C.green },
  cardInner: { flex: 1, flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  greenCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  orderNum: { color: C.navy, fontSize: 15, fontWeight: "800" },
  orderMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  serveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.navy, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  serveTxt: { color: C.white, fontSize: 13, fontWeight: "700" },
});
