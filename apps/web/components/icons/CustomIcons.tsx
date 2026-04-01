'use client';

// ═══════════════════════════════════════════════════════════════
// Custom Icons - أيقونات مخصصة غير موجودة في heroicons
// ═══════════════════════════════════════════════════════════════

import { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * أيقونة السرير - BedIcon
 */
export function BedIcon({ className = 'w-6 h-6', ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

/**
 * أيقونة الحمام - BathIcon (حوض استحمام)
 */
export function BathIcon({ className = 'w-6 h-6', ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M3 14a4 4 0 004 4h10a4 4 0 004-4v-4a4 4 0 00-4-4H7a4 4 0 00-4 4v4z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 6V4a2 2 0 012-2h0a2 2 0 012 2v2"
      />
    </svg>
  );
}
