import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useLocation } from "wouter";

const PINS = [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"] as const;

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (pinCode: string) => {
      const res = await api.users.login.$post({ json: { pin: pinCode } });
      if (!res.ok) throw new Error("Invalid PIN");
      return res.json();
    },
    onSuccess: (data: any) => {
      localStorage.setItem("user", JSON.stringify(data));
      if (data.role === "admin") navigate("/admin");
      else if (data.role === "kds") navigate("/kds");
      else navigate("/pos");
    },
    onError: () => {
      setError("Invalid PIN. Try again.");
      setPin("");
    },
  });

  const handleKey = (key: typeof PINS[number]) => {
    setError("");
    if (key === "⌫") {
      setPin(p => p.slice(0, -1));
    } else if (key === "✓") {
      if (pin.length < 4) { setError("Enter full PIN"); return; }
      loginMutation.mutate(pin);
    } else {
      if (pin.length >= 6) return;
      setPin(p => p + String(key));
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 32,
    }}>
      {/* Logo / Brand */}
      <div style={{ textAlign: "center" }}>
        <img src="/logo-login.png" alt="iDine"
          style={{ width: 240, maxWidth: "70vw", height: "auto", margin: "0 auto", display: "block", objectFit: "contain" }} />
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 16 }}>Enter your PIN to continue</p>
      </div>

      {/* PIN Display */}
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "24px 32px",
        width: 300,
        boxShadow: "0 4px 24px #0005",
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: "50%",
              background: i < pin.length ? "var(--color-gold)" : "var(--color-border)",
              transition: "all 0.2s",
              boxShadow: i < pin.length ? "0 0 8px var(--color-gold)88" : "none",
            }} />
          ))}
        </div>

        {error && (
          <p style={{ color: "var(--color-danger)", textAlign: "center", fontSize: 13, marginBottom: 8 }}>{error}</p>
        )}

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
          {PINS.map((key, i) => (
            <button
              key={i}
              onClick={() => handleKey(key)}
              disabled={loginMutation.isPending}
              style={{
                height: 60,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontSize: key === "✓" ? 20 : 20,
                fontWeight: 600,
                transition: "all 0.15s",
                background: key === "✓"
                  ? "linear-gradient(135deg, var(--color-gold), #C97800)"
                  : key === "⌫"
                  ? "var(--color-surface-2)"
                  : "var(--color-surface-2)",
                color: key === "✓" ? "#000" : "var(--color-text)",
                boxShadow: key === "✓" ? "0 4px 16px var(--color-gold)44" : "none",
              }}
            >
              {loginMutation.isPending && key === "✓" ? "..." : key}
            </button>
          ))}
        </div>
      </div>

      <p style={{ color: "var(--color-text-dim)", fontSize: 12 }}>
        iDine POS · Multi-Branch Edition
      </p>
    </div>
  );
}
