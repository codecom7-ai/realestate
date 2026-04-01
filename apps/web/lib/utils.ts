// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════
// Date Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Format date in Arabic locale
 */
export function formatDateAr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date with time in Arabic locale
 */
export function formatDateTimeAr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time in Arabic
 */
export function formatRelativeTimeAr(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'الآن';
  } else if (diffMinutes < 60) {
    return `منذ ${diffMinutes} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else if (diffDays < 7) {
    return `منذ ${diffDays} يوم`;
  } else {
    return formatDateAr(d);
  }
}

// ═══════════════════════════════════════════════════════════════
// Number Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Format number with Arabic locale
 */
export function formatNumberAr(num: number): string {
  return num.toLocaleString('ar-EG');
}

/**
 * Format currency in Egyptian Pounds
 */
export function formatCurrencyEGP(amount: number): string {
  return `${amount.toLocaleString('ar-EG')} ج.م`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ═══════════════════════════════════════════════════════════════
// String Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Generate Arabic initials from name
 */
export function getInitialsAr(firstNameAr?: string, lastNameAr?: string): string {
  if (firstNameAr && lastNameAr) {
    return `${firstNameAr.charAt(0)}${lastNameAr.charAt(0)}`;
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════
// Phone Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Validate Egyptian phone number
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const phoneRegex = /^(\+20|0)[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format Egyptian phone number
 */
export function formatEgyptianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('20')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// ═══════════════════════════════════════════════════════════════
// ID Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ═══════════════════════════════════════════════════════════════
// Debounce Utility
// ═══════════════════════════════════════════════════════════════

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// ═══════════════════════════════════════════════════════════════
// Copy to Clipboard
// ═══════════════════════════════════════════════════════════════

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Additional Date Utilities for Chat/Inbox
// ═══════════════════════════════════════════════════════════════

/**
 * Format distance to now (relative time)
 */
export function formatDistanceToNow(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatRelativeTimeAr(d);
}

/**
 * Format date (short format)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time (hours and minutes)
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
