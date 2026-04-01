'use client';

import { ReactNode } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Permission, PERMISSIONS } from '@realestate/shared-types';

interface PermissionGateProps {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * PermissionGate — shows children only when user has required permissions.
 * While auth is loading, shows loadingFallback (defaults to children to avoid flash).
 */
export function PermissionGate({
  permissions,
  children,
  fallback = null,
  loadingFallback,
}: PermissionGateProps) {
  const { user, isLoading } = useAuthStore();

  // While auth is resolving, show loadingFallback or children (prevents flash)
  if (isLoading) {
    return <>{loadingFallback ?? children}</>;
  }

  if (!user) return <>{fallback}</>;

  // Owner / wildcard permission
  if (user.role === 'OWNER') return <>{children}</>;
  if (user.permissions?.includes('*')) return <>{children}</>;

  const hasAll = permissions.every((p) => user.permissions?.includes(p));
  return <>{hasAll ? children : fallback}</>;
}

export function useHasPermission(permission: Permission): boolean {
  const { user, isLoading } = useAuthStore();
  if (isLoading || !user) return false;
  if (user.role === 'OWNER' || user.permissions?.includes('*')) return true;
  return user.permissions?.includes(permission) ?? false;
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { user, isLoading } = useAuthStore();
  if (isLoading || !user) return false;
  if (user.role === 'OWNER' || user.permissions?.includes('*')) return true;
  return permissions.some((p) => user.permissions?.includes(p));
}

export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { user, isLoading } = useAuthStore();
  if (isLoading || !user) return false;
  if (user.role === 'OWNER' || user.permissions?.includes('*')) return true;
  return permissions.every((p) => user.permissions?.includes(p));
}

export default PermissionGate;
