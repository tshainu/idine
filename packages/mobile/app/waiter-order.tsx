import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView, TextInput,
  Alert, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { loadUser, WaiterUser } from "../lib/auth";

const NAVY = "#0D1B6E";
const NAVY2 = "#162280";
const NAVY3 = "#0A1255";
const WHITE = "#FFFFFF";
const LIGHT = "#E8ECF8";
const MUTED = "#8891B8";
const BORDER = "#C5CCE8";
const DARK_BORDER = "#2A3A9A";
const SUCCESS = "#22C55E";
const DANGER = "#EF4444";
const RED = "#E53935";
const GOLD = "#F5A623";

type Variation = { id: number; name: string; code?: string; priceDineIn: number };
type CartItem = {
  menuItemId: number;
  name: string;
  price: number;
  qty: number;
  notes: string;
  variationId?: number;
  variationName?: string;
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

// Cart key: menuItemId + variationId
function cartKey(menuItemId: number, variationId?: number) {
  return `${menuItemId}_${variationId ?? "base"}`;
}

export default function WaiterOrderScreen() {
  const { tableId, name: tableName } = useLocalSearchParams<{
    tableId: string; name: string; status: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [user, setUser] = useState<WaiterUser | null>(null);
  const [dateTime, setDateTime] = useState(getDateTime());
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    loadUser().then(setUser);
    const interval = setInterval(() => setDateTime(getDateTime()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Categories
  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.categories.$get();
      const json = await res.json() as any;
      return json.categories ?? [];
    },
  });
  const categories: any[] = catData ?? [];

  // Menu items
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ["menu-items", selectedCategory],
    queryFn: async () => {
      const res = await api["menu-items"].$get({
        query: selectedCategory ? { categoryId: String(selectedCategory) } : {},
      });
      const json = await res.json() as any;
      return json.menuItems ?? [];
    },
  });
  const allItems: any[] = menuData ?? [];

  const filteredItems = allItems.filter(item =>
    item.isActive !== false &&
    (searchText === "" || item.name.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Cart helpers
  const cartList = Object.values(cart);
  const totalQty = cartList.reduce((s, c) => s + c.qty, 0);

  function addItem(item: any, variationId?: number, variationName?: string, variationPrice?: number) {
    const price = variationPrice ?? Number(item.priceDineIn ?? item.price ?? 0);
    const key = cartKey(item.id, variationId);
    setCart(prev => {
      const existing = prev[key];
      if (existing) {
        return { ...prev, [key]: { ...existing, qty: existing.qty + 1 } };
      }
      return {
        ...prev,
        [key]: {
          menuItemId: item.id,
          name: item.name,
          price,
          qty: 1,
          notes: "",
          variationId,
          variationName,
        },
      };
    });
  }

  function removeItem(key: string) {
    setCart(prev => {
      const existing = prev[key];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...existing, qty: existing.qty - 1 } };
    });
  }

  function getQty(menuItemId: number, variationId?: number) {
    return cart[cartKey(menuItemId, variationId)]?.qty ?? 0;
  }

  function resetCart() {
    Alert.alert("Reset", "Clear all items?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => setCart({}) },
    ]);
  }

  // Place order (send KOT)
  const placeOrder = useMutation({
    mutationFn: async () => {
      if (cartList.length === 0) throw new Error("Cart is empty");

      // Create order
      const orderRes = await api.orders.$post({
        json: {
          tableId: Number(tableId),
          branchId: user?.branchId ?? 1,
          customerName: customerName || `Table ${tableName}`,
          coverCount: 1,
          status: "pending",
          source: "waiter",
          waiterId: user?.id,
        },
      });
      const orderJson = await orderRes.json() as any;
      const orderId = orderJson.order?.id ?? orderJson.id;

      // Add items
      await api["order-items"].bulk.$post({
        json: {
          items: cartList.map(c => ({
            orderId,
            menuItemId: c.menuItemId,
            name: c.variationName ? c.name + ' (' + c.variationName + ')' : c.name,
            price: c.price,
            qty: c.qty,
          })),
        },
      });

      return orderId;
    },
    onSuccess: (orderId) => {
      Alert.alert("Order Placed ✅", `KOT sent to kitchen.`, [
        {
          text: "New Order",
          onPress: () => { setCart({}); setCustomerName(""); qc.invalidateQueries({ queryKey: ["tables"] }); },
        },
        {
          text: "Back to Tables",
          onPress: () => { setCart({}); qc.invalidateQueries({ queryKey: ["tables"] }); router.back(); },
        },
      ]);
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to place order"),
  });

  // Hold order
  const holdOrder = useMutation({
    mutationFn: async () => {
      if (cartList.length === 0) throw new Error("Cart is empty");
      const orderRes = await api.orders.$post({
        json: {
          tableId: Number(tableId),
          branchId: user?.branchId ?? 1,
          customerName: customerName || `Table ${tableName}`,
          coverCount: 1,
          status: "hold",
          source: "waiter",
          waiterId: user?.id,
        },
      });
      const orderJson = await orderRes.json() as any;
      const orderId = orderJson.order?.id ?? orderJson.id;
      await api["order-items"].bulk.$post({
        json: {
          items: cartList.map(c => ({
            orderId,
            menuItemId: c.menuItemId,
            name: c.variationName ? c.name + ' (' + c.variationName + ')' : c.name,
            price: c.price,
            qty: c.qty,
          })),
        },
      });
      return orderId;
    },
    onSuccess: () => {
      Alert.alert("Order On Hold", "Order saved as held.", [
        { text: "OK", onPress: () => { setCart({}); setCustomerName(""); } },
      ]);
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to hold order"),
  });

  const isLoading = placeOrder.isPending || holdOrder.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 6 }}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={styles.logoBox}>
            <Ionicons name="restaurant" size={14} color={WHITE} />
          </View>
          <Text style={styles.brandName}>AXIS RESTAURANT</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.waiterName}>{user?.name ?? "Waiter"}</Text>
          <Text style={styles.waiterRole}>{user?.role ?? "Waiter"}</Text>
          <Text style={styles.dateTime}>{dateTime}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]}>

          {/* ── Order Panel ── */}
          <View style={styles.orderPanel}>
            {/* Panel top: customer input + table number */}
            <View style={styles.panelTopRow}>
              <Text style={styles.panelTitle}>Ordered items</Text>
              <TextInput
                style={styles.customerInput}
                placeholder="Customer Detail"
                placeholderTextColor={MUTED}
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TouchableOpacity style={styles.addCustomerBtn}>
                <Ionicons name="add" size={16} color={NAVY} />
              </TouchableOpacity>
              <Text style={styles.tableNumber}>Table Number: {tableName}</Text>
            </View>

            {/* Items table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 3 }]}>Item</Text>
              <Text style={[styles.th, { flex: 2 }]}>Variation</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "center" }]}>Qty</Text>
              <Text style={[styles.th, { flex: 2, textAlign: "right" }]}>Remark</Text>
            </View>

            {/* Cart items */}
            <View style={styles.cartItemsBox}>
              {cartList.length === 0 ? (
                <Text style={styles.emptyCart}>No items added yet</Text>
              ) : (
                cartList.map((item) => (
                  <View key={cartKey(item.menuItemId, item.variationId)} style={styles.cartItemRow}>
                    <Text style={[styles.td, { flex: 3 }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.td, { flex: 2 }]}>{item.variationName ?? ""}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: "center", fontWeight: "700" }]}>{item.qty}</Text>
                    <Text style={[styles.td, { flex: 2, textAlign: "right", color: MUTED }]}>{item.notes || ""}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionBar}>
              <View style={styles.actionLeft}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.placeBtn, (isLoading || cartList.length === 0) && { opacity: 0.5 }]}
                  onPress={() => placeOrder.mutate()}
                  disabled={isLoading || cartList.length === 0}
                >
                  {placeOrder.isPending
                    ? <ActivityIndicator size="small" color={WHITE} />
                    : <Text style={styles.placeBtnText}>Place Order</Text>
                  }
                </TouchableOpacity>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={[styles.actionBtn, (isLoading || cartList.length === 0) && { opacity: 0.5 }]}
                  onPress={() => holdOrder.mutate()}
                  disabled={isLoading || cartList.length === 0}
                >
                  {holdOrder.isPending
                    ? <ActivityIndicator size="small" color={WHITE} />
                    : <Text style={styles.actionBtnText}>Hold</Text>
                  }
                </TouchableOpacity>
              </View>
              <View style={styles.actionRight}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.back()}
                >
                  <Text style={styles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={[styles.actionBtn, cartList.length === 0 && { opacity: 0.5 }]}
                  onPress={resetCart}
                  disabled={cartList.length === 0}
                >
                  <Text style={styles.actionBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Search ── */}
          <View style={styles.searchBox}>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={MUTED} style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search item"
                placeholderTextColor={MUTED}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText !== "" && (
                <TouchableOpacity onPress={() => setSearchText("")} style={{ marginRight: 12 }}>
                  <Ionicons name="close-circle" size={16} color={MUTED} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Category Filter ── */}
          <View style={styles.catSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
              <TouchableOpacity
                style={[styles.catChip, selectedCategory === null && styles.catChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.catChipText, selectedCategory === null && styles.catChipTextActive]}>All item</Text>
              </TouchableOpacity>
              {categories.filter(c => c.isActive !== false).map((cat: any) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={[styles.catChipText, selectedCategory === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Menu Items ── */}
          {menuLoading ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <ActivityIndicator size="large" color={NAVY} />
            </View>
          ) : (
            <View style={styles.menuList}>
              {filteredItems.map((item: any) => {
                const variations: Variation[] = item.variations ?? [];
                const hasVariations = variations.length > 0;

                // Show up to 2 variation shortcuts (F / N from design)
                const v1 = variations[0];
                const v2 = variations[1];

                return (
                  <View key={item.id} style={styles.menuCard}>
                    {/* Item image */}
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    ) : (
                      <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                        <Ionicons name="fast-food-outline" size={22} color={MUTED} />
                      </View>
                    )}

                    {/* Item name */}
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>

                    {/* Variation buttons (F / N) */}
                    <View style={styles.varBtns}>
                      {hasVariations ? (
                        <>
                          {v1 && (
                            <TouchableOpacity
                              style={styles.varBtn}
                              onPress={() => addItem(item, v1.id, v1.name, v1.priceDineIn)}
                            >
                              <Text style={styles.varBtnText}>{v1.code ?? v1.name.charAt(0).toUpperCase()}</Text>
                            </TouchableOpacity>
                          )}
                          {v2 && (
                            <TouchableOpacity
                              style={styles.varBtn}
                              onPress={() => addItem(item, v2.id, v2.name, v2.priceDineIn)}
                            >
                              <Text style={styles.varBtnText}>{v2.code ?? v2.name.charAt(0).toUpperCase()}</Text>
                            </TouchableOpacity>
                          )}
                          {!v2 && <View style={styles.varBtnGhost} />}
                        </>
                      ) : (
                        <>
                          <View style={styles.varBtnGhost} />
                          <View style={styles.varBtnGhost} />
                        </>
                      )}
                    </View>

                    {/* Qty controls (base / no variation) */}
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => removeItem(cartKey(item.id))}
                        disabled={getQty(item.id) === 0}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={[
                        styles.qtyNum,
                        getQty(item.id) > 0 && { color: RED, fontWeight: "800" }
                      ]}>
                        {getQty(item.id)}
                      </Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => addItem(item)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {filteredItems.length === 0 && (
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Ionicons name="search-outline" size={36} color={MUTED} />
                  <Text style={{ color: MUTED, marginTop: 10 }}>No items found</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom Nav ── */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/history" as any)}>
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={[styles.navItem, { position: "relative" }]} onPress={() => router.push("/notifications" as any)}>
          <View style={{ position: "relative", alignSelf: "center" }}>
            <Text style={styles.navLabel}>Notification</Text>
            <View style={styles.notifDot} />
          </View>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/ready-items" as any)}>
          <Text style={styles.navLabel}>Ready item</Text>
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity style={styles.navItem} onPress={() => router.back()}>
          <Text style={styles.navLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoBox: { width: 28, height: 28, borderRadius: 6, backgroundColor: WHITE + "22", alignItems: "center", justifyContent: "center" },
  brandName: { color: WHITE, fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  headerRight: { alignItems: "flex-end" },
  waiterName: { color: WHITE, fontSize: 12, fontWeight: "700" },
  waiterRole: { color: MUTED, fontSize: 10 },
  dateTime: { color: MUTED, fontSize: 10 },

  // Order panel
  orderPanel: {
    backgroundColor: WHITE, margin: 10, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, overflow: "hidden",
  },
  panelTopRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    gap: 6, flexWrap: "wrap",
  },
  panelTitle: { color: NAVY, fontSize: 12, fontWeight: "700" },
  customerInput: {
    flex: 1, minWidth: 100,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    fontSize: 12, color: NAVY,
  },
  addCustomerBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: LIGHT, alignItems: "center", justifyContent: "center",
  },
  tableNumber: { color: NAVY, fontSize: 12, fontWeight: "600" },

  // Table header
  tableHeader: {
    flexDirection: "row", backgroundColor: "#F0F2FA",
    paddingHorizontal: 10, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  th: { fontSize: 11, fontWeight: "700", color: NAVY },

  // Cart items
  cartItemsBox: { minHeight: 60, maxHeight: 140 },
  emptyCart: { color: MUTED, fontSize: 12, textAlign: "center", paddingVertical: 16 },
  cartItemRow: {
    flexDirection: "row", paddingHorizontal: 10, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: "#F0F2FA",
  },
  td: { fontSize: 11, color: NAVY },

  // Action bar
  actionBar: {
    flexDirection: "row",
    backgroundColor: NAVY, paddingVertical: 0,
  },
  actionLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  actionRight: { flexDirection: "row", alignItems: "center" },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  placeBtn: {},
  placeBtnText: { color: WHITE, fontSize: 13, fontWeight: "700" },
  actionBtnText: { color: WHITE, fontSize: 13, fontWeight: "600" },
  actionDivider: { width: 1, height: 28, backgroundColor: WHITE + "33" },

  // Search
  searchBox: { marginHorizontal: 10, marginTop: 8 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 25,
    borderWidth: 1, borderColor: BORDER,
    height: 38,
  },
  searchInput: { flex: 1, paddingHorizontal: 8, fontSize: 13, color: NAVY },

  // Categories
  catSection: { backgroundColor: WHITE, marginTop: 6 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: NAVY,
    backgroundColor: WHITE,
  },
  catChipActive: { backgroundColor: NAVY },
  catChipText: { color: NAVY, fontSize: 12, fontWeight: "600" },
  catChipTextActive: { color: WHITE },

  // Menu items
  menuList: { paddingHorizontal: 8, paddingBottom: 80 },
  menuCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: WHITE, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    marginVertical: 4, paddingHorizontal: 10, paddingVertical: 8,
    gap: 8,
  },
  itemImage: { width: 46, height: 46, borderRadius: 23 },
  itemImagePlaceholder: {
    backgroundColor: LIGHT, alignItems: "center", justifyContent: "center",
  },
  itemName: { flex: 1, fontSize: 13, fontWeight: "600", color: NAVY },
  varBtns: { flexDirection: "row", gap: 6 },
  varBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: NAVY3, alignItems: "center", justifyContent: "center",
  },
  varBtnText: { color: WHITE, fontSize: 12, fontWeight: "700" },
  varBtnGhost: { width: 30, height: 30 },

  // Qty row
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: NAVY3, alignItems: "center", justifyContent: "center",
  },
  qtyBtnText: { color: WHITE, fontSize: 16, fontWeight: "700", lineHeight: 20 },
  qtyNum: { width: 22, textAlign: "center", fontSize: 15, color: NAVY, fontWeight: "700" },

  // Bottom nav
  bottomNav: {
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
