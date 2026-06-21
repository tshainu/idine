import { Tabs } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OneDollarStatsProvider } from "../lib/analytics";
import { Ionicons } from "@expo/vector-icons";
import appJson from "../app.json";

const queryClient = new QueryClient();

const applicationId = appJson.expo.extra.applicationId ?? "";
const hostname = applicationId ? `${applicationId}-mobile` : "localhost";

const GOLD = "#F5A623";
const BG = "#0D0618";
const SURFACE = "#1A0A2E";
const DIM = "#6B5A8A";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <OneDollarStatsProvider
        config={{
          hostname,
          collectorUrl: "https://r.lilstts.com/events",
          devmode: true,
        }}
      >
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarStyle: {
                  backgroundColor: SURFACE,
                  borderTopColor: "#2A1A4A",
                  borderTopWidth: 1,
                  height: 64,
                  paddingBottom: 8,
                },
                tabBarActiveTintColor: GOLD,
                tabBarInactiveTintColor: DIM,
                tabBarLabelStyle: {
                  fontSize: 11,
                  fontWeight: "600",
                },
              }}
            >
              <Tabs.Screen
                name="index"
                options={{
                  title: "Tables",
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="grid-outline" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="order/[tableId]"
                options={{
                  href: null, // hidden from tab bar — opened programmatically
                  title: "Order",
                }}
              />
              <Tabs.Screen
                name="orders"
                options={{
                  title: "Orders",
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="receipt-outline" size={size} color={color} />
                  ),
                }}
              />
            </Tabs>
          </QueryClientProvider>
        </SafeAreaProvider>
      </OneDollarStatsProvider>
    </ErrorBoundary>
  );
}
