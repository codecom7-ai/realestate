'use client';

// ═══════════════════════════════════════════════════════════════
// Compliance Dashboard Page - مركز الامتثال
// قانون 578/2025
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

// Types
interface ComplianceStatus {
  organizationStatus: 'compliant' | 'warning' | 'non_compliant';
  organizationStatusAr: string;
  compliancePercentage: number;
  totalRecords: number;
  validRecords: number;
  expiringRecords: number;
  expiredRecords: number;
  totalBrokers: number;
  compliantBrokers: number;
  activeAlerts: number;
  officeClassification?: 'A' | 'B' | 'C';
  officeLicenseExpiry?: string;
  officeLicenseDaysRemaining?: number;
}

interface ComplianceAlert {
  id: string;
  type: string;
  typeAr: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  entityType: string;
  entityId: string;
  entityName: string;
  recordType?: string;
  expiresAt?: string;
  daysRemaining?: number;
  priority: number;
  createdAt: string;
  isRead: boolean;
}

interface ComplianceRecord {
  id: string;
  entityType: string;
  entityId: string;
  recordType: string;
  recordTypeAr: string;
  referenceNumber?: string;
  status: string;
  statusAr: string;
  issuedAt?: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
  documentUrl?: string;
  notes?: string;
  createdAt: string;
}

interface BrokerRegistryItem {
  userId: string;
  name: string;
  nameAr: string;
  email: string;
  phone?: string;
  brokerLicenseNo?: string;
  brokerClassification?: 'A' | 'B' | 'C';
  brokerLicenseExp?: string;
  complianceStatus: 'compliant' | 'warning' | 'non_compliant';
  complianceStatusAr: string;
  daysUntilExpiry?: number;
  missingDocuments: string[];
  expiredDocuments: string[];
}

// Classification config
const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string; capital: string }> = {
  A: {
    label: 'ممتاز (أ)',
    color: 'bg-green-100 text-green-800 border-green-200',
    capital: '1,000,000 ج.م',
  },
  B: {
    label: 'أول (ب)',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    capital: '500,000 ج.م',
  },
  C: {
    label: 'ثاني (ج)',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    capital: '250,000 ج.م',
  },
};

// Status config
const RECORD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  valid: {
    label: 'ساري',
    color: 'bg-green-100 text-green-800',
  },
  expiring_soon: {
    label: 'قريب الانتهاء',
    color: 'bg-yellow-100 text-yellow-800',
  },
  expired: {
    label: 'منتهي',
    color: 'bg-red-100 text-red-800',
  },
  pending_renewal: {
    label: 'في انتظار التجديد',
    color: 'bg-orange-100 text-orange-800',
  },
  suspended: {
    label: 'موقوف',
    color: 'bg-gray-100 text-gray-800',
  },
};

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Compliance Progress Ring
function ComplianceRing({ percentage }: { percentage: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 50) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90" width="120" height="120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={getColor()}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-2xl font-bold">{percentage}%</span>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`card p-4 border-r-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-full bg-gray-100">{icon}</div>
      </div>
    </div>
  );
}

// Alert Card Component
function AlertCard({ alert }: { alert: ComplianceAlert }) {
  const priorityColors = {
    1: 'border-red-500 bg-red-50',
    2: 'border-yellow-500 bg-yellow-50',
    3: 'border-orange-500 bg-orange-50',
  };

  return (
    <div
      className={`p-4 rounded-lg border-r-4 ${priorityColors[alert.priority as keyof typeof priorityColors] || priorityColors[2]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{alert.titleAr}</p>
          <p className="text-sm text-gray-600 mt-1">{alert.messageAr}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{alert.entityName}</span>
            {alert.daysRemaining !== undefined && (
              <span
                className={
                  alert.daysRemaining <= 7 ? 'text-red-600 font-medium' : ''
                }
              >
                {alert.daysRemaining > 0
                  ? `${alert.daysRemaining} يوم متبقي`
                  : 'منتهي'}
              </span>
            )}
          </div>
        </div>
        <BellAlertIcon className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}

// Broker Row Component
function BrokerRow({ broker }: { broker: BrokerRegistryItem }) {
  const statusColors = {
    compliant: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    non_compliant: 'bg-red-100 text-red-800',
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="font-medium">{broker.name}</p>
            <p className="text-sm text-gray-500">{broker.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        {broker.brokerClassification ? (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              CLASSIFICATION_CONFIG[broker.brokerClassification]?.color
            }`}
          >
            {CLASSIFICATION_CONFIG[broker.brokerClassification]?.label}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm">{broker.brokerLicenseNo || '-'}</td>
      <td className="py-3 px-4">
        {broker.brokerLicenseExp ? (
          <div className="text-sm">
            <p>{formatDate(broker.brokerLicenseExp)}</p>
            {broker.daysUntilExpiry !== undefined && (
              <p
                className={`text-xs ${
                  broker.daysUntilExpiry <= 30
                    ? 'text-red-600'
                    : broker.daysUntilExpiry <= 90
                    ? 'text-yellow-600'
                    : 'text-gray-500'
                }`}
              >
                {broker.daysUntilExpiry > 0
                  ? `${broker.daysUntilExpiry} يوم`
                  : 'منتهي'}
              </p>
            )}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            statusColors[broker.complianceStatus]
          }`}
        >
          {broker.complianceStatusAr}
        </span>
      </td>
      <td className="py-3 px-4">
        {broker.missingDocuments.length > 0 ||
        broker.expiredDocuments.length > 0 ? (
          <div className="text-xs space-y-1">
            {broker.missingDocuments.length > 0 && (
              <p className="text-red-600">
                {broker.missingDocuments.length} مستند مفقود
              </p>
            )}
            {broker.expiredDocuments.length > 0 && (
              <p className="text-orange-600">
                {broker.expiredDocuments.length} مستند منتهي
              </p>
            )}
          </div>
        ) : (
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
        )}
      </td>
    </tr>
  );
}

// Section Component
function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card">
      <div
        className={`flex items-center justify-between ${
          collapsible ? 'cursor-pointer' : ''
        }`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {badge}
        </div>
        {collapsible && (
          <button className="p-1 hover:bg-gray-100 rounded">
            {isOpen ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </button>
        )}
      </div>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );
}

// Main Page Component
export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'brokers' | 'records'>(
    'overview'
  );

  // Fetch compliance status
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['compliance-status'],
    queryFn: async () => {
      const response = await apiClient.getComplianceStatus();
      return response.data.data as ComplianceStatus;
    },
  });

  // Fetch alerts
  const { data: alertsData } = useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: async () => {
      const response = await apiClient.getComplianceAlerts();
      return response.data.data as ComplianceAlert[];
    },
  });

  // Fetch broker registry
  const { data: brokersData, isLoading: isLoadingBrokers } = useQuery({
    queryKey: ['broker-registry'],
    queryFn: async () => {
      const response = await apiClient.getBrokerRegistry();
      return response.data.data as BrokerRegistryItem[];
    },
  });

  // Fetch compliance records
  const { data: recordsData, isLoading: isLoadingRecords } = useQuery({
    queryKey: ['compliance-records'],
    queryFn: async () => {
      const response = await apiClient.getComplianceRecords({ limit: 50 });
      return response.data.data as ComplianceRecord[];
    },
  });

  const status = statusData;
  const alerts = alertsData || [];
  const brokers = brokersData || [];
  const records = recordsData || [];

  // Loading state
  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مركز الامتثال</h1>
          <p className="text-gray-500 mt-1">قانون السمسرة العقارية رقم 578/2025</p>
        </div>
        {status?.officeClassification && (
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
              CLASSIFICATION_CONFIG[status.officeClassification]?.color
            }`}
          >
            <ShieldCheckIcon className="w-5 h-5" />
            <span className="font-medium">
              تصنيف المكتب: {CLASSIFICATION_CONFIG[status.officeClassification]?.label}
            </span>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {status && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg border ${
            status.organizationStatus === 'compliant'
              ? 'bg-green-50 border-green-200'
              : status.organizationStatus === 'warning'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-4">
            {status.organizationStatus === 'compliant' ? (
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            ) : status.organizationStatus === 'warning' ? (
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
            ) : (
              <XCircleIcon className="w-8 h-8 text-red-600" />
            )}
            <div>
              <p className="text-lg font-semibold">{status.organizationStatusAr}</p>
              <p className="text-sm opacity-80">
                نسبة الامتثال: {status.compliancePercentage}%
              </p>
            </div>
          </div>
          <ComplianceRing percentage={status.compliancePercentage} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: 'نظرة عامة' },
          { id: 'brokers', label: 'سجل السماسرة' },
          { id: 'records', label: 'سجلات الامتثال' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              title="إجمالي السجلات"
              value={status?.totalRecords || 0}
              icon={<DocumentTextIcon className="w-5 h-5 text-blue-600" />}
              color="border-blue-500"
            />
            <StatsCard
              title="السجلات السارية"
              value={status?.validRecords || 0}
              icon={<CheckCircleIcon className="w-5 h-5 text-green-600" />}
              color="border-green-500"
            />
            <StatsCard
              title="قريبة الانتهاء"
              value={status?.expiringRecords || 0}
              icon={<ClockIcon className="w-5 h-5 text-yellow-600" />}
              color="border-yellow-500"
            />
            <StatsCard
              title="السجلات المنتهية"
              value={status?.expiredRecords || 0}
              icon={<XCircleIcon className="w-5 h-5 text-red-600" />}
              color="border-red-500"
            />
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <Section
              title="تنبيهات الامتثال"
              badge={
                <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              }
            >
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
                {alerts.length > 5 && (
                  <button
                    onClick={() => setActiveTab('records')}
                    className="text-sm text-primary hover:underline"
                  >
                    عرض جميع التنبيهات ({alerts.length})
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Office License Info */}
          {status?.officeLicenseExpiry && (
            <Section title="رخصة المكتب">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">تاريخ الانتهاء</p>
                  <p className="text-lg font-semibold mt-1">
                    {formatDate(status.officeLicenseExpiry)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">الأيام المتبقية</p>
                  <p
                    className={`text-lg font-semibold mt-1 ${
                      (status.officeLicenseDaysRemaining || 0) <= 30
                        ? 'text-red-600'
                        : (status.officeLicenseDaysRemaining || 0) <= 90
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}
                  >
                    {status.officeLicenseDaysRemaining || 0} يوم
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* Classification Info */}
          <Section title="تصنيفات السمسرة (قانون 578/2025)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(CLASSIFICATION_CONFIG).map(([key, config]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border ${
                    status?.officeClassification === key
                      ? 'border-2 border-primary bg-primary/5'
                      : 'border-gray-200'
                  }`}
                >
                  <p className="font-medium">{config.label}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    رأس مال: {config.capital}
                  </p>
                  {status?.officeClassification === key && (
                    <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      تصنيفك الحالي
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Brokers Tab */}
      {activeTab === 'brokers' && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">سجل السماسرة ({brokers.length})</h3>
          </div>
          {isLoadingBrokers ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : brokers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <UserIcon className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-2">لا يوجد سماسرة مسجلين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      السمسري
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      التصنيف
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      رقم الرخصة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      انتهاء الرخصة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      حالة الامتثال
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                      ملاحظات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {brokers.map((broker) => (
                    <BrokerRow key={broker.userId} broker={broker} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">سجلات الامتثال ({records.length})</h3>
          </div>
          {isLoadingRecords ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-2">لا توجد سجلات امتثال</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{record.recordTypeAr}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        رقم المرجع: {record.referenceNumber || '-'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        RECORD_STATUS_CONFIG[record.status]?.color ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {record.statusAr}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-2 text-sm text-gray-500">
                    {record.issuedAt && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        إصدار: {formatDate(record.issuedAt)}
                      </span>
                    )}
                    {record.expiresAt && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        انتهاء: {formatDate(record.expiresAt)}
                        {record.daysUntilExpiry !== undefined && (
                          <span
                            className={`mr-1 ${
                              record.daysUntilExpiry <= 0
                                ? 'text-red-600'
                                : record.daysUntilExpiry <= 30
                                ? 'text-yellow-600'
                                : ''
                            }`}
                          >
                            ({record.daysUntilExpiry > 0
                              ? `${record.daysUntilExpiry} يوم`
                              : 'منتهي'}
                            )
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {record.documentUrl && (
                    <a
                      href={record.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-2 inline-block"
                    >
                      عرض المستند
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
