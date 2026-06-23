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

const NAVY = "#0D1B6E";
const NAVY2 = "#162280";
const WHITE = "#FFFFFF";
const LIGHT = "#E8ECF8";
const MUTED = "#8891B8";
const BORDER = "#2A3A9A";
const SUCCESS = "#22C55E";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";
const GOLD = "#F5A623";

const STATUS_COLORS: Record<string, string> = {
  available: SUCCESS,
  occupied: WARNING,
  reserved: "#A855F7",
  cleaning: DANGER,
};

const STATUS_LABELS: Record<string, string> = {
  available: "Free",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
};

function getDateTime() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${d}.${m}.${y} ${hh}:${mm}`;
}

export default function TablesScreen() {
  const router = useRouter();
  const [user, setUser] = useState<WaiterUser | null>(null);
  const [dateTime, setDateTime] = useState(getDateTime());

  useEffect(() => {
    loadUser().then((u) => {
      if (!u) { router.replace("/"); return; }
      setUser(u);
    });
    const interval = setInterval(() => setDateTime(getDateTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  const branchId = user?.branchId ?? 1;

  const { data: tablesData, isLoading, refetch } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: async () => {
      const res = await api.tables.$get({ query: { branchId: String(branchId) } });
      const json = await res.json() as any;
      return json.tables ?? json;
    },
    refetchInterval: 20000,
    enabled: !!user,
  });

  const tables: any[] = Array.isArray(tablesData) ? tablesData : [];
  const freeTables = tables.filter(t => t.status === "available").length;
  const busyTables = tables.filter(t => t.status === "occupied").length;

  const grouped: Record<string, any[]> = {};
  for (const t of tables) {
    const zone = t.zone || "Main";
    if (!grouped[zone]) grouped[zone] = [];
    grouped[zone].push(t);
  }

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => { await clearUser(); router.replace("/"); }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Ionicons name="restaurant" size={18} color={WHITE} />
          </View>
          <Text style={styles.brandName}>AXIS RESTAURANT</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.waiterName}>{user?.name ?? "Waiter"}</Text>
          <Text style={styles.waiterRole}>{user?.role ?? "Waiter"}</Text>
          <Text style={styles.dateTime}>{dateTime}</Text>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{tables.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: SUCCESS }]}>{freeTables}</Text>
          <Text style={styles.statLabel}>Free</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: WARNING }]}>{busyTables}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Ionicons name="refresh" size={16} color={NAVY} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={WHITE} />
          <Text style={styles.loadText}>Loading tables...</Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(grouped)}
          keyExtractor={([zone]) => zone}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item: [zone, zoneTables] }) => (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.zoneLabel}>{zone}</Text>
              <View style={styles.tableGrid}>
                {zoneTables.map((table: any) => {
                  const color = STATUS_COLORS[table.status] || MUTED;
                  const isCleaning = table.status === "cleaning";
                  return (
                    <TouchableOpacity
                      key={table.id}
                      style={[styles.tableCard, { borderColor: color + "66" }, isCleaning && { opacity: 0.5 }]}
                      onPress={() => {
                        if (!isCleaning) {
                          router.push(`/waiter-order?tableId=${table.id}&name=${encodeURIComponent(table.name)}&status=${table.status}` as any);
                        }
                      }}
                      activeOpacity={0.75}
                      disabled={isCleaning}
                    >
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <Text style={styles.tableName}>{table.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="people-outline" size={11} color={MUTED} />
                        <Text style={styles.tableCapacity}>{table.capacity}</Text>
                      </View>
                      <Text style={[styles.tableStatus, { color }]}>
                        {STATUS_LABELS[table.status] || table.status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/history" as any)}>
          <Ionicons name="time-outline" size={20} color={MUTED} />
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/notifications" as any)}>
          <View style={{ position: "relative" }}>
            <Ionicons name="notifications-outline" size={20} color={MUTED} />
            <View style={styles.notifDot} />
          </View>
          <Text style={styles.navLabel}>Notification</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/ready-items" as any)}>
          <Ionicons name="checkmark-circle-outline" size={20} color={MUTED} />
          <Text style={styles.navLabel}>Ready item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={MUTED} />
          <Text style={styles.navLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: NAVY, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: WHITE + "20", alignItems: "center", justifyContent: "center" },
  brandName: { color: WHITE, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  headerRight: { alignItems: "flex-end" },
  waiterName: { color: WHITE, fontSize: 13, fontWeight: "700" },
  waiterRole: { color: MUTED, fontSize: 11 },
  dateTime: { color: MUTED, fontSize: 11 },
  statsBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, paddingHorizontal: 16, paddingVertical: 10,
    gap: 16,
  },
  statItem: { alignItems: "center" },
  statNum: { color: NAVY, fontSize: 18, fontWeight: "800" },
  statLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  statDivider: { width: 1, height: 28, backgroundColor: BORDER + "44" },
  refreshBtn: { backgroundColor: LIGHT, borderRadius: 20, padding: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadText: { color: MUTED, fontSize: 13 },
  zoneLabel: { color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  tableGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tableCard: {
    width: "30%", minWidth: 90,
    backgroundColor: WHITE,
    borderRadius: 12, borderWidth: 2,
    padding: 12, alignItems: "center", gap: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  tableName: { color: NAVY, fontSize: 15, fontWeight: "800" },
  tableCapacity: { color: MUTED, fontSize: 11 },
  tableStatus: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  bottomNav: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: NAVY2,
    flexDirection: "row",
    paddingVertical: 10, paddingBottom: 20,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  navItem: { flex: 1, alignItems: "center", gap: 2 },
  navLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  notifDot: {
    position: "absolute", top: -1, right: -1,
    width: 8, height: 8, borderRadius: 4, backgroundColor: SUCCESS,
  },
});
