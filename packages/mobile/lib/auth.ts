import AsyncStorage from "@react-native-async-storage/async-storage";

export type WaiterUser = {
  id: number;
  name: string;
  role: string;
  branchId: number;
};

const KEY = "waiter_user";

export async function saveUser(user: WaiterUser) {
  await AsyncStorage.setItem(KEY, JSON.stringify(user));
}

export async function loadUser(): Promise<WaiterUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearUser() {
  await AsyncStorage.removeItem(KEY);
}
