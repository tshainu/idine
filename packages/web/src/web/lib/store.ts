// ---- Theme ----
const THEME_KEY = "idine_theme";

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || "dark";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// ---- Branch store ----
// Simple in-memory branch store (persisted to localStorage)
const BRANCH_KEY = "idine_branch_id";
const USER_KEY = "idine_user";

export function getBranchId(): number {
  return parseInt(localStorage.getItem(BRANCH_KEY) || "1");
}

export function setBranchId(id: number) {
  localStorage.setItem(BRANCH_KEY, String(id));
}

export function getUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}
