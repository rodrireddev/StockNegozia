import { create } from "zustand";

const STORAGE_KEY = "stocknegozia-admin-session";

interface AdminSession {
  accessToken: string;
  email: string;
  expiresAt: string;
}

interface AuthState {
  session: AdminSession | null;
  setSession: (session: AdminSession) => void;
  clearSession: () => void;
}

function loadPersistedSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  session: loadPersistedSession(),
  setSession: (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({ session });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ session: null });
  },
}));
