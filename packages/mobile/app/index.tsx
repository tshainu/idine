import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  StatusBar, TextInput, KeyboardAvoidingView, Platform, ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { loadUser, saveUser, WaiterUser } from "../lib/auth";

const NAVY = "#0D1B6E";
const NAVY2 = "#162280";
const WHITE = "#FFFFFF";
const LIGHT = "#E8ECF8";
const MUTED = "#8891B8";
const RED = "#E53935";
const SUCCESS = "#22C55E";

export default function LoginScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // Auto-login if session exists
  useEffect(() => {
    loadUser().then((u) => {
      if (u) router.replace("/tables" as any);
      else setChecking(false);
    });
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (pinVal: string) => {
      const res = await api.users.login.$post({
        json: { pin: pinVal, branchId: 1 },
      });
      if (!res.ok) throw new Error("Invalid PIN");
      return res.json() as Promise<{ user: WaiterUser }>;
    },
    onSuccess: async ({ user }) => {
      await saveUser({ ...user, branchId: user.branchId ?? 1 });
      router.replace("/tables" as any);
    },
    onError: () => {
      setError("Invalid PIN. Try again.");
      setPin("");
    },
  });

  const handlePinPress = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError("");
    if (newPin.length >= 4) {
      // Try login after 4+ digits
      setTimeout(() => loginMutation.mutate(newPin), 100);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError("");
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo / Brand */}
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🍽️</Text>
            </View>
            <Text style={styles.brandName}>AXIS RESTAURANT</Text>
          </View>

          <Text style={styles.subtitle}>Waiter Login</Text>
          <Text style={styles.hint}>Enter your PIN to continue</Text>

          {/* PIN dots */}
          <View style={styles.pinDots}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                ]}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Number pad */}
          <View style={styles.numPad}>
            {[["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]].map((row, ri) => (
              <View key={ri} style={styles.numRow}>
                {row.map((digit, di) => (
                  <TouchableOpacity
                    key={di}
                    style={[styles.numBtn, digit === "" && { opacity: 0 }]}
                    onPress={() => digit === "⌫" ? handleDelete() : digit && handlePinPress(digit)}
                    disabled={loginMutation.isPending}
                    activeOpacity={0.7}
                  >
                    {digit === "⌫"
                      ? <Text style={styles.numBtnText}>⌫</Text>
                      : <Text style={styles.numBtnText}>{digit}</Text>
                    }
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {loginMutation.isPending && (
            <ActivityIndicator color={WHITE} style={{ marginTop: 16 }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingVertical: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
  logoBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: WHITE + "22", alignItems: "center", justifyContent: "center" },
  logoIcon: { fontSize: 24 },
  brandName: { color: WHITE, fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  subtitle: { color: WHITE, fontSize: 24, fontWeight: "700", marginBottom: 6 },
  hint: { color: MUTED, fontSize: 14, marginBottom: 32 },
  pinDots: { flexDirection: "row", gap: 12, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: WHITE + "55", backgroundColor: "transparent" },
  dotFilled: { backgroundColor: WHITE, borderColor: WHITE },
  errorText: { color: RED, fontSize: 13, marginBottom: 16, textAlign: "center" },
  numPad: { gap: 14, marginTop: 8 },
  numRow: { flexDirection: "row", gap: 20 },
  numBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: NAVY2,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: WHITE + "22",
  },
  numBtnText: { color: WHITE, fontSize: 24, fontWeight: "600" },
});
