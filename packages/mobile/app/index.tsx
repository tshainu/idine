import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, SafeAreaView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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

const STATUS_COLORS: Record<string, string> = {
  available: SUCCESS,
  occupied: GOLD,
  reserved: WARNING,
  cleaning: DANGER,
};

const STATUS_LABELS: Record<string, string> = {
  available: "Free",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
};

export default function TablesScreen() {
  const router = useRouter();
  const [branchId] = useState(1);

  const { data: tables, isLoading, refetch } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: async () => {
      const res = await api.tables.$get({ query: { branchId: String(branchId) } });
      return res.json();
    },
    refetchInterval: 15000,
  });

  const grouped = (() => {
    if (!tables || !Array.isArray(tables)) return [];
    const map: Record<string, any[]> = {};
    for (const t of tables) {
      const zone = t.zone || "Main";
      if (!map[zone]) map[zone] = [];
      map[zone].push(t);
    }
    return Object.entries(map);
  })();

  const totalTables = tables?.length ?? 0;
  const freeTables = (tables as any[])?.filter(t => t.status === "available").length ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🍽️ iDine</Text>
          <Text style={styles.headerSub}>Floor View · Branch {branchId}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: SUCCESS + "22" }]}>
            <Text style={[styles.statNum, { color: SUCCESS }]}>{freeTables}</Text>
            <Text style={[styles.statLabel, { color: SUCCESS }]}>Free</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: GOLD + "22" }]}>
            <Text style={[styles.statNum, { color: GOLD }]}>{totalTables - freeTables}</Text>
            <Text style={[styles.statLabel, { color: GOLD }]}>Busy</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
          <Text style={styles.loadingText}>Loading tables...</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={([zone]) => zone}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item: [zone, zoneTables] }) => (
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.zoneLabel}>{zone}</Text>
              <View style={styles.tableGrid}>
                {zoneTables.map((table: any) => {
                  const color = STATUS_COLORS[table.status] || MUTED;
                  return (
                    <TouchableOpacity
                      key={table.id}
                      style={[styles.tableCard, {
                        borderColor: color + "66",
                        backgroundColor: SURFACE,
                      }]}
                      onPress={() => {
                        if (table.status !== "cleaning") {
                          router.push(`/order/${table.id}?name=${encodeURIComponent(table.name)}&status=${table.status}`);
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.tableStatusDot, { backgroundColor: color }]} />
                      <Text style={styles.tableName}>{table.name}</Text>
                      <Text style={styles.tableCapacity}>
                        <Ionicons name="people-outline" size={11} color={MUTED} /> {table.capacity}
                      </Text>
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

      {/* Refresh button */}
      <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
        <Ionicons name="refresh" size={22} color={BG} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { color: TEXT, fontSize: 20, fontWeight: "700" },
  headerSub: { color: MUTED, fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 10, fontWeight: "600", marginTop: -2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: MUTED, marginTop: 12, fontSize: 14 },
  zoneLabel: { color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 4 },
  tableGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tableCard: {
    width: "30%",
    minWidth: 90,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  tableStatusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  tableName: { color: TEXT, fontSize: 14, fontWeight: "700" },
  tableCapacity: { color: MUTED, fontSize: 11 },
  tableStatus: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  refreshBtn: {
    position: "absolute",
    bottom: 80,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
