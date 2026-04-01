// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Lead Events - أحداث العملاء المحتملين
// ═══════════════════════════════════════════════════════════════

import { SocketEventDataMap, LeadStage } from '@realestate/shared-types';

/**
 * أنواع أحداث الـ Lead
 * Lead event types
 */
export type LeadEventType = 
  | 'lead.created'
  | 'lead.updated'
  | 'lead.stage_changed'
  | 'lead.assigned';

/**
 * حدث إنشاء عميل محتمل
 * Lead created event
 */
export interface LeadCreatedEvent {
  type: 'lead.created';
  data: SocketEventDataMap['lead.created'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث تحديث عميل محتمل
 * Lead updated event
 */
export interface LeadUpdatedEvent {
  type: 'lead.updated';
  data: SocketEventDataMap['lead.updated'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث تغيير مرحلة العميل
 * Lead stage changed event
 */
export interface LeadStageChangedEvent {
  type: 'lead.stage_changed';
  data: SocketEventDataMap['lead.stage_changed'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * حدث تعيين مسؤول للعميل
 * Lead assigned event
 */
export interface LeadAssignedEvent {
  type: 'lead.assigned';
  data: SocketEventDataMap['lead.assigned'];
  timestamp: Date;
  userId: string;
  organizationId: string;
}

/**
 * جميع أحداث الـ Lead
 * All lead events union type
 */
export type LeadEvent = 
  | LeadCreatedEvent 
  | LeadUpdatedEvent 
  | LeadStageChangedEvent 
  | LeadAssignedEvent;

/**
 * أسماء مراحل الـ Lead بالعربية
 * Lead stage names in Arabic
 */
export const LEAD_STAGE_AR: Record<LeadStage, string> = {
  NEW: 'جديد',
  CONTACTED: 'تم التواصل',
  QUALIFIED: 'مؤهل',
  PROPERTY_PRESENTED: 'تم عرض عقار',
  VIEWING_SCHEDULED: 'معاينة مجدولة',
  VIEWED: 'تمت المعاينة',
  NEGOTIATING: 'في التفاوض',
  RESERVED: 'محجوز',
  CONTRACT_SENT: 'تم إرسال العقد',
  CONTRACT_SIGNED: 'تم توقيع العقد',
  CLOSED_WON: 'مغلق (نجاح)',
  CLOSED_LOST: 'مغلق (فقدان)',
};

/**
 * إنشاء رسالة إشعار لتغيير المرحلة
 * Create notification message for stage change
 */
export function createStageChangeMessage(
  previousStage: LeadStage,
  newStage: LeadStage,
  clientName?: string
): { title: string; body: string; titleAr: string; bodyAr: string } {
  const clientText = clientName ? ` - ${clientName}` : '';
  
  return {
    title: `Lead Stage Changed${clientText}`,
    titleAr: `تغيير مرحلة العميل${clientText}`,
    body: `Stage changed from ${LEAD_STAGE_AR[previousStage]} to ${LEAD_STAGE_AR[newStage]}`,
    bodyAr: `تم تغيير المرحلة من ${LEAD_STAGE_AR[previousStage]} إلى ${LEAD_STAGE_AR[newStage]}`,
  };
}

/**
 * إنشاء رسالة إشعار للتعيين
 * Create notification message for assignment
 */
export function createAssignmentMessage(
  assigneeName: string,
  clientName?: string
): { title: string; body: string; titleAr: string; bodyAr: string } {
  const clientText = clientName ? ` (${clientName})` : '';
  
  return {
    title: 'Lead Assigned',
    titleAr: 'تعيين عميل محتمل',
    body: `${assigneeName} has been assigned${clientText}`,
    bodyAr: `تم تعيين ${assigneeName}${clientText}`,
  };
}
