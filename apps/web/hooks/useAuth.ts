// ═══════════════════════════════════════════════════════════════
// Auth Store — Zustand (In-Memory Only, No localStorage)
// Tokens stored in HttpOnly cookies by the backend
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  role: string;
  permissions: string[];
  branchId?: string;
  organization: { id: string; name: string; nameAr?: string };
}

interface AuthState {
  user:            User | null;
  isAuthenticated: boolean;
  isLoading:       boolean;

  setUser:            (user: User | null)     => void;
  setLoading:         (loading: boolean)      => void;
  login:              (user: User)            => void;
  logout:             ()                      => void;
  hasPermission:      (permission: string)    => boolean;
  hasAnyPermission:   (perms: string[])       => boolean;
  hasAllPermissions:  (perms: string[])       => boolean;
  checkAuth:          ()                      => Promise<void>;
}

// ── URL helper ────────────────────────────────────────────────
// Always use current origin in browser to avoid localhost leaks
function apiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1${path}`;
  }
  // SSR fallback (should not be called server-side for auth)
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102';
  return `${base}/api/v1${path}`;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user:            null,
  isAuthenticated: false,
  isLoading:       true,

  setUser:    (user)    => set({ user, isAuthenticated: !!user }),
  setLoading: (loading) => set({ isLoading: loading }),

  login: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  logout: async () => {
    try {
      // CSRF is excluded for logout, but include header anyway
      const csrfToken = typeof document !== 'undefined'
        ? (document.cookie.match(/csrf-token=([^;]+)/)?.[1] ?? '')
        : '';
      await fetch(apiUrl('/auth/logout'), {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':   'application/json',
          'x-csrf-token':   csrfToken,
        },
      });
    } catch (e) {
      // ignore
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'OWNER') return true;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  },

  hasAnyPermission: (perms) => perms.some(p => get().hasPermission(p)),
  hasAllPermissions:(perms) => perms.every(p => get().hasPermission(p)),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // 1. Try /auth/me with existing accessToken cookie
      const meRes = await fetch(apiUrl('/auth/me'), {
        credentials: 'include',
      });

      if (meRes.ok) {
        const data = await meRes.json();
        if (data.success && data.data) {
          set({ user: data.data, isAuthenticated: true, isLoading: false });
          return;
        }
      }

      // 2. Try refresh if /auth/me failed
      const refreshRes = await fetch(apiUrl('/auth/refresh'), {
        method:      'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          // 3. Retry /auth/me after refresh
          const meRes2 = await fetch(apiUrl('/auth/me'), { credentials: 'include' });
          if (meRes2.ok) {
            const meData = await meRes2.json();
            if (meData.success && meData.data) {
              set({ user: meData.data, isAuthenticated: true, isLoading: false });
              return;
            }
          }
        }
      }

      // Not authenticated
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

export const useAuth = useAuthStore;

