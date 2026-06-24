import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  StatusBar, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { loadUser, saveUser, WaiterUser } from "../lib/auth";
import { Ionicons } from "@expo/vector-icons";

// ── Design tokens ────────────────────────────────────────────────
const C = {
  navy:    "#0D1B6E",
  navy2:   "#162280",
  navy3:   "#0A1255",
  accent:  "#4F6EF7",
  white:   "#FFFFFF",
  light:   "#EEF0FB",
  muted:   "#8891B8",
  red:     "#EF4444",
  green:   "#22C55E",
  gold:    "#F5A623",
  card:    "#F7F8FE",
  border:  "#DDE1F5",
};

export default function LoginScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const shakeAnim = new Animated.Value(0);

  useEffect(() => {
    loadUser().then((u) => {
      if (u) router.replace("/tables" as any);
      else setChecking(false);
    });
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const loginMutation = useMutation({
    mutationFn: async (pinVal: string) => {
      const res = await api.users.login.$post({ json: { pin: pinVal, branchId: 1 } });
      if (!res.ok) throw new Error("Invalid PIN");
      return res.json() as Promise<{ user: WaiterUser }>;
    },
    onSuccess: async ({ user }) => {
      await saveUser({ ...user, branchId: user.branchId ?? 1 });
      router.replace("/tables" as any);
    },
    onError: () => {
      setError("Incorrect PIN. Try again.");
      setPin("");
      shake();
    },
  });

  const handleDigit = (d: string) => {
    if (loginMutation.isPending) return;
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length >= 4) setTimeout(() => loginMutation.mutate(next), 120);
  };

  const handleDel = () => {
    setPin(p => p.slice(0, -1));
    setError("");
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const PAD = [["1","2","3"],["4","5","6"],["7","8","9"],["","0","del"]];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy3} />

      {/* ── Brand ── */}
      <View style={s.brandWrap}>
        <View style={s.logoCircle}>
          <Ionicons name="restaurant" size={28} color={C.white} />
        </View>
        <Text style={s.brandName}>AXIS RESTAURANT</Text>
        <Text style={s.brandSub}>Waiter Portal</Text>
      </View>

      {/* ── Card ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Enter your PIN</Text>

        {/* Dots */}
        <Animated.View style={[s.dots, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
          ))}
        </Animated.View>

        {error ? (
          <View style={s.errorRow}>
            <Ionicons name="alert-circle" size={14} color={C.red} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : <View style={{ height: 22 }} />}

        {/* Numpad */}
        <View style={s.pad}>
          {PAD.map((row, ri) => (
            <View key={ri} style={s.padRow}>
              {row.map((d, di) =>
                d === "" ? <View key={di} style={s.padKey} /> :
                d === "del" ? (
                  <TouchableOpacity key={di} style={[s.padKey, s.padKeyDel]} onPress={handleDel} activeOpacity={0.7}>
                    <Ionicons name="backspace-outline" size={22} color={C.muted} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity key={di} style={s.padKey} onPress={() => handleDigit(d)} activeOpacity={0.7}>
                    <Text style={s.padKeyTxt}>{d}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ))}
        </View>

        {loginMutation.isPending && (
          <View style={s.loadRow}>
            <ActivityIndicator color={C.accent} size="small" />
            <Text style={s.loadTxt}>Authenticating…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.navy, alignItems: "center", justifyContent: "center" },

  brandWrap: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
    marginBottom: 14,
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brandName: { color: C.white, fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  brandSub: { color: C.muted, fontSize: 13, marginTop: 2, letterSpacing: 0.5 },

  card: {
    backgroundColor: C.white, borderRadius: 24, paddingHorizontal: 28, paddingVertical: 32,
    width: "88%", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardTitle: { color: C.navy, fontSize: 17, fontWeight: "700", marginBottom: 22 },

  dots: { flexDirection: "row", gap: 12, marginBottom: 4 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: C.border, backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: C.accent, borderColor: C.accent },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, height: 22 },
  errorTxt: { color: C.red, fontSize: 12, fontWeight: "600" },

  pad: { gap: 12, marginTop: 8 },
  padRow: { flexDirection: "row", gap: 14 },
  padKey: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: C.light, alignItems: "center", justifyContent: "center",
  },
  padKeyDel: { backgroundColor: C.card },
  padKeyTxt: { color: C.navy, fontSize: 26, fontWeight: "600" },

  loadRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  loadTxt: { color: C.muted, fontSize: 13 },
});
