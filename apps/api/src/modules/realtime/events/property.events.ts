// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Property Events - أحداث العقارات
// ═══════════════════════════════════════════════════════════════

import { SocketEventDataMap, PropertyStatus } from '@realestate/shared-types';

/**
 * أنواع أحداث العقار
 * Property event types
 */
export type PropertyEventType = 
  | 'property.created'
  | 'property.updated'
  | 'property.locked'
  | 'property.unlocked';

/**
 * حدث إنشاء عقار
 * Property created event
 */
export interface PropertyCreatedEvent {
  type: 'property.created';
  data: SocketEventDataMap['property.created'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث تحديث عقار
 * Property updated event
 */
export interface PropertyUpdatedEvent {
  type: 'property.updated';
  data: SocketEventDataMap['property.updated'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث حجز عقار
 * Property locked event
 */
export interface PropertyLockedEvent {
  type: 'property.locked';
  data: SocketEventDataMap['property.locked'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث إلغاء حجز عقار
 * Property unlocked event
 */
export interface PropertyUnlockedEvent {
  type: 'property.unlocked';
  data: SocketEventDataMap['property.unlocked'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * جميع أحداث العقار
 * All property events union type
 */
export type PropertyEvent = 
  | PropertyCreatedEvent 
  | PropertyUpdatedEvent 
  | PropertyLockedEvent 
  | PropertyUnlockedEvent;

/**
 * أسماء حالات العقار بالعربية
 * Property status names in Arabic
 */
export const PROPERTY_STATUS_AR: Record<PropertyStatus, string> = {
  AVAILABLE: 'متاح',
  RESERVED_TEMP: 'محجوز مؤقتاً',
  RESERVED_CONFIRMED: 'محجوز مؤكد',
  SOLD: 'مباع',
  RENTED: 'مؤجر',
  SUSPENDED: 'معلق',
  UNDER_MAINTENANCE: 'تحت الصيانة',
};

/**
 * أنواع الحجز
 * Lock types
 */
export const LOCK_TYPE_AR: Record<'temporary' | 'confirmed', string> = {
  temporary: 'حجز مؤقت',
  confirmed: 'حجز مؤكد',
};

/**
 * إنشاء رسالة إشعار لحجز العقار
 * Create notification message for property lock
 */
export function createLockMessage(
  propertyTitle: string,
  lockType: 'temporary' | 'confirmed'
): { title: string; body: string; titleAr: string; bodyAr: string } {
  return {
    title: 'Property Locked',
    titleAr: 'حجز عقار',
    body: `"${propertyTitle}" has been locked (${LOCK_TYPE_AR[lockType]})`,
    bodyAr: `تم حجز "${propertyTitle}" (${LOCK_TYPE_AR[lockType]})`,
  };
}

/**
 * إنشاء رسالة إشعار لإلغاء حجز العقار
 * Create notification message for property unlock
 */
export function createUnlockMessage(
  propertyTitle: string
): { title: string; body: string; titleAr: string; bodyAr: string } {
  return {
    title: 'Property Unlocked',
    titleAr: 'إلغاء حجز عقار',
    body: `"${propertyTitle}" has been unlocked`,
    bodyAr: `تم إلغاء حجز "${propertyTitle}"`,
  };
}
