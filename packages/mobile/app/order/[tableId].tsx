import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, SafeAreaView, ScrollView,
  Alert, TextInput,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURFACE = "#1A0A2E";
const SURFACE2 = "#221040";
const BORDER = "#2A1A4A";
const TEXT = "#EDE8F5";
const MUTED = "#9D8EC0";
const DIM = "#6B5A8A";
const SUCCESS = "#22C55E";
const DANGER = "#EF4444";

type CartItem = { menuItemId: number; name: string; price: number; qty: number; notes: string };

export default function OrderScreen() {
  const { tableId, name: tableName, status: tableStatus } = useLocalSearchParams<{
    tableId: string; name: string; status: string;
  }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [coverCount, setCoverCount] = useState("1");

  // Fetch categories
  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.categories.$get();
      return res.json();
    },
  });

  // Fetch menu items
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ["menu-items", selectedCategory],
    queryFn: async () => {
      const res = await api["menu-items"].$get({
        query: selectedCategory ? { categoryId: String(selectedCategory) } : {},
      });
      return res.json();
    },
  });

  const menuItems: any[] = (menuData as any)?.menuItems || [];

  // Send KOT mutation
  const sendKOT = useMutation({
    mutationFn: async () => {
      // 1. Create or update order
      const orderRes = await api.orders.$post({
        json: {
          tableId: Number(tableId),
          branchId: 1,
          customerName: customerName || `Table ${tableName}`,
          coverCount: Number(coverCount) || 1,
          status: "pending",
        },
      });
      const order = await orderRes.json() as any;
      const orderId = order.id;

      // 2. Add order items
      await api["order-items"].bulk.$post({
        json: {
          orderId,
          items: cart.map(c => ({
            menuItemId: c.menuItemId,
            quantity: c.qty,
            unitPrice: c.price,
            notes: c.notes,
          })),
        },
      });

      return { orderId };
    },
    onSuccess: ({ orderId }) => {
      Alert.alert(
        "KOT Sent! ✅",
        `Order #${String(orderId).padStart(4, "0")} sent to kitchen.`,
        [{ text: "OK", onPress: () => { setCart([]); setShowCart(false); qc.invalidateQueries({ queryKey: ["tables"] }); router.back(); } }]
      );
    },
    onError: () => Alert.alert("Error", "Failed to send KOT. Check connection."),
  });

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), qty: 1, notes: "" }];
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter(c => c.menuItemId !== menuItemId);
      return prev.map(c => c.menuItemId === menuItemId ? { ...c, qty: c.qty - 1 } : c);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  // ─── Cart View ───────────────────────────────────────────
  if (showCart) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setShowCart(false)}>
            <Ionicons name="arrow-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Review Order · {tableName}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Customer</Text>
            <TextInput
              style={styles.input}
              placeholder="Customer name (optional)"
              placeholderTextColor={DIM}
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Covers</Text>
            <TextInput
              style={[styles.input, { width: 80 }]}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={DIM}
              value={coverCount}
              onChangeText={setCoverCount}
            />
          </View>

          <Text style={styles.sectionLabel}>Items</Text>
          {cart.map(item => (
            <View key={item.menuItemId} style={styles.cartRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>Rs. {(item.price * item.qty).toFixed(2)}</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.menuItemId)}>
                  <Ionicons name="remove" size={16} color={TEXT} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price })}>
                  <Ionicons name="add" size={16} color={TEXT} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {cart.length === 0 && (
            <Text style={{ color: MUTED, textAlign: "center", marginTop: 32 }}>Cart is empty</Text>
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.cartBottom}>
          <View>
            <Text style={styles.totalLabel}>Total ({cartCount} items)</Text>
            <Text style={styles.totalAmount}>Rs. {cartTotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: cart.length === 0 || sendKOT.isPending ? 0.5 : 1 }]}
            disabled={cart.length === 0 || sendKOT.isPending}
            onPress={() => sendKOT.mutate()}
          >
            {sendKOT.isPending
              ? <ActivityIndicator color={BG} />
              : <Text style={styles.sendBtnText}>🖨️ Send KOT</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Menu View ───────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Sub header */}
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>Table {tableName}</Text>
        <TouchableOpacity
          style={styles.cartBadgeBtn}
          onPress={() => cart.length > 0 && setShowCart(true)}
        >
          <Ionicons name="cart-outline" size={22} color={GOLD} />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
      >
        <TouchableOpacity
          style={[styles.catChip, selectedCategory === null && styles.catChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.catChipText, selectedCategory === null && { color: BG }]}>All</Text>
        </TouchableOpacity>
        {(categories as any[] || []).map((cat: any) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[styles.catChipText, selectedCategory === cat.id && { color: BG }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu items */}
      {menuLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const inCart = cart.find(c => c.menuItemId === item.id);
            return (
              <TouchableOpacity
                style={[styles.menuCard, inCart && { borderColor: GOLD + "99" }]}
                onPress={() => addToCart(item)}
                activeOpacity={0.75}
              >
                {inCart && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{inCart.qty}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemName} numberOfLines={2}>{item.name}</Text>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                    {item.isVeg && <Text style={styles.tagVeg}>Veg</Text>}
                    {item.isBeverage && <Text style={styles.tagBev}>Bev</Text>}
                  </View>
                </View>
                <Text style={styles.menuItemPrice}>Rs. {Number(item.price).toFixed(2)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Cart float */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartFloat} onPress={() => setShowCart(true)}>
          <Text style={styles.cartFloatText}>View Order ({cartCount}) · Rs. {cartTotal.toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={18} color={BG} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  subHeaderTitle: { color: TEXT, fontSize: 16, fontWeight: "700" },
  catScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: BORDER },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  catChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  catChipText: { color: MUTED, fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  menuCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 14,
    minHeight: 110,
    justifyContent: "space-between",
    position: "relative",
  },
  menuBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBadgeText: { color: BG, fontSize: 11, fontWeight: "700" },
  menuItemName: { color: TEXT, fontSize: 14, fontWeight: "600", lineHeight: 19 },
  menuItemPrice: { color: GOLD, fontSize: 13, fontWeight: "700", marginTop: 6 },
  tagVeg: { fontSize: 10, color: SUCCESS, backgroundColor: SUCCESS + "22", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, fontWeight: "700" },
  tagBev: { fontSize: 10, color: "#38BDF8", backgroundColor: "#38BDF822", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, fontWeight: "700" },
  cartBadgeBtn: { position: "relative" },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: BG, fontSize: 10, fontWeight: "700" },
  cartFloat: {
    position: "absolute",
    bottom: 74,
    left: 16,
    right: 16,
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 6,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  cartFloatText: { color: BG, fontSize: 14, fontWeight: "700" },
  // Cart view styles
  section: { marginBottom: 16 },
  sectionLabel: { color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  input: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 8,
  },
  cartItemName: { color: TEXT, fontSize: 14, fontWeight: "600" },
  cartItemPrice: { color: GOLD, fontSize: 13, fontWeight: "700", marginTop: 2 },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { backgroundColor: SURFACE2, borderRadius: 8, padding: 6 },
  qtyText: { color: TEXT, fontSize: 16, fontWeight: "700", minWidth: 24, textAlign: "center" },
  cartBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: { color: MUTED, fontSize: 12 },
  totalAmount: { color: TEXT, fontSize: 20, fontWeight: "700" },
  sendBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sendBtnText: { color: BG, fontSize: 15, fontWeight: "700" },
});
