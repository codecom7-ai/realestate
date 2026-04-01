'use client';

// ═══════════════════════════════════════════════════════════════
// Reconciliation Dashboard - شاشة التحصيل
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Mock Data for Reconciliation
const mockKPIs = {
  totalDue: 8500000,
  collected: 6200000,
  overdue: 1250000,
  collectionRate: 72.9,
};

const mockOverdueInstallments = [
  { id: '1', clientName: 'أحمد محمد علي', dealNumber: 'D-2024-001', overdueAmount: 150000, daysOverdue: 45, phone: '+20 123 456 7890' },
  { id: '2', clientName: 'سارة إبراهيم', dealNumber: 'D-2024-015', overdueAmount: 85000, daysOverdue: 38, phone: '+20 987 654 3210' },
  { id: '3', clientName: 'محمد خالد', dealNumber: 'D-2024-022', overdueAmount: 200000, daysOverdue: 32, phone: '+20 555 123 4567' },
  { id: '4', clientName: 'فاطمة أحمد', dealNumber: 'D-2024-008', overdueAmount: 75000, daysOverdue: 28, phone: '+20 111 222 3333' },
  { id: '5', clientName: 'علي حسن', dealNumber: 'D-2024-031', overdueAmount: 120000, daysOverdue: 22, phone: '+20 444 555 6666' },
  { id: '6', clientName: 'منى سعيد', dealNumber: 'D-2024-045', overdueAmount: 95000, daysOverdue: 18, phone: '+20 777 888 9999' },
  { id: '7', clientName: 'خالد عمر', dealNumber: 'D-2024-052', overdueAmount: 180000, daysOverdue: 12, phone: '+20 333 222 1111' },
  { id: '8', clientName: 'نور الدين', dealNumber: 'D-2024-060', overdueAmount: 65000, daysOverdue: 8, phone: '+20 666 555 4444' },
];

const mockMonthlyCollection = [
  { month: 'أكتوبر', collected: 850000, due: 1100000 },
  { month: 'نوفمبر', collected: 920000, due: 1050000 },
  { month: 'ديسمبر', collected: 1100000, due: 1200000 },
  { month: 'يناير', collected: 980000, due: 1150000 },
  { month: 'فبراير', collected: 1050000, due: 1100000 },
  { month: 'مارس', collected: 1300000, due: 1400000 },
];

const mockBranches = [
  { id: 'all', name: 'جميع الفروع' },
  { id: '1', name: 'المقر الرئيسي' },
  { id: '2', name: 'فرع مدينة نصر' },
  { id: '3', name: 'فرع المعادي' },
];

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format number with percentage
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Get delay status
function getDelayStatus(daysOverdue: number): {
  status: 'critical' | 'warning' | 'normal';
  label: string;
  colorClass: string;
} {
  if (daysOverdue > 30) {
    return { status: 'critical', label: 'حرج', colorClass: 'bg-red-100 text-red-800 border-red-200' };
  } else if (daysOverdue >= 15) {
    return { status: 'warning', label: 'تحذير', colorClass: 'bg-orange-100 text-orange-800 border-orange-200' };
  } else {
    return { status: 'normal', label: 'عادي', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
}

// KPI Card Component
function KPICard({
  title,
  value,
  icon: Icon,
  color,
  isPercentage = false,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'purple';
  isPercentage?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {isPercentage ? formatPercentage(value) : formatCurrency(value)}
          </p>
        </div>
        <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Overdue Table Row Component
function OverdueRow({
  installment,
  onContact,
}: {
  installment: typeof mockOverdueInstallments[0];
  onContact: (installment: typeof mockOverdueInstallments[0]) => void;
}) {
  const delayStatus = getDelayStatus(installment.daysOverdue);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-4 px-4">
        <div className="font-medium text-gray-900">{installment.clientName}</div>
      </td>
      <td className="py-4 px-4 text-gray-600">{installment.dealNumber}</td>
      <td className="py-4 px-4 font-medium text-gray-900">{formatCurrency(installment.overdueAmount)}</td>
      <td className="py-4 px-4 text-center">
        <span className="font-medium">{installment.daysOverdue}</span>
        <span className="text-gray-500 text-sm mr-1">يوم</span>
      </td>
      <td className="py-4 px-4">
        <span className={`badge ${delayStatus.colorClass}`}>{delayStatus.label}</span>
      </td>
      <td className="py-4 px-4">
        <button
          onClick={() => onContact(installment)}
          className="btn btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          <PhoneIcon className="w-4 h-4" />
          تواصل
        </button>
      </td>
    </tr>
  );
}

// Main Reconciliation Page
export default function ReconciliationPage() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [selectedDelayStatus, setSelectedDelayStatus] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter overdue installments based on selected delay status
  const filteredOverdue = useMemo(() => {
    if (selectedDelayStatus === 'all') return mockOverdueInstallments;
    return mockOverdueInstallments.filter((item) => {
      const status = getDelayStatus(item.daysOverdue);
      return status.status === selectedDelayStatus;
    });
  }, [selectedDelayStatus]);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Handle contact client
  const handleContactClient = (installment: typeof mockOverdueInstallments[0]) => {
    // In real app, this would open WhatsApp or phone
    window.open(`tel:${installment.phone}`, '_self');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">شاشة التحصيل</h1>
          <p className="text-gray-500 mt-1">متابعة الأقساط والمتحصلات</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            آخر تحديث: {new Date().toLocaleString('ar-EG')}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-outline flex items-center gap-2"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          {/* Branch Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">الفرع</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="input"
            >
              {mockBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">الفترة</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="input"
            >
              <option value="thisMonth">هذا الشهر</option>
              <option value="lastMonth">الشهر الماضي</option>
              <option value="last3Months">آخر 3 أشهر</option>
              <option value="last6Months">آخر 6 أشهر</option>
              <option value="thisYear">هذا العام</option>
            </select>
          </div>

          {/* Delay Status Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">حالة التأخير</label>
            <select
              value={selectedDelayStatus}
              onChange={(e) => setSelectedDelayStatus(e.target.value)}
              className="input"
            >
              <option value="all">الكل</option>
              <option value="critical">حرج فقط (أكثر من 30 يوم)</option>
              <option value="warning">تحذير فقط (15-30 يوم)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="إجمالي المستحق"
          value={mockKPIs.totalDue}
          icon={CurrencyDollarIcon}
          color="blue"
        />
        <KPICard
          title="المحصل"
          value={mockKPIs.collected}
          icon={CheckCircleIcon}
          color="green"
        />
        <KPICard
          title="المتأخر"
          value={mockKPIs.overdue}
          icon={ExclamationTriangleIcon}
          color="red"
        />
        <KPICard
          title="نسبة التحصيل"
          value={mockKPIs.collectionRate}
          icon={ChartBarIcon}
          color="purple"
          isPercentage
        />
      </div>

      {/* Monthly Collection Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">التحصيل الشهري</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockMonthlyCollection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ textAlign: 'right' }}
              />
              <Legend />
              <Bar
                dataKey="collected"
                name="المحصل"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="due"
                name="المستحق"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overdue Installments Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">الأقساط المتأخرة</h3>
          <span className="badge bg-red-100 text-red-800">
            {filteredOverdue.length} قسط متأخر
          </span>
        </div>

        {filteredOverdue.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">ممتاز! لا توجد أقساط متأخرة</p>
            <p className="text-gray-500 mt-1">جميع الأقساط مسددة في موعدها</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">اسم العميل</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">رقم الصفقة</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المبلغ المتأخر</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">أيام التأخير</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">حالة التأخير</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredOverdue.map((installment) => (
                  <OverdueRow
                    key={installment.id}
                    installment={installment}
                    onContact={handleContactClient}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {filteredOverdue.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 justify-between">
              <div>
                <span className="text-gray-500">إجمالي المتأخر: </span>
                <span className="font-bold text-red-600">
                  {formatCurrency(filteredOverdue.reduce((sum, item) => sum + item.overdueAmount, 0))}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="badge bg-red-100 text-red-800">
                  حرج: {filteredOverdue.filter((i) => i.daysOverdue > 30).length}
                </span>
                <span className="badge bg-orange-100 text-orange-800">
                  تحذير: {filteredOverdue.filter((i) => i.daysOverdue >= 15 && i.daysOverdue <= 30).length}
                </span>
                <span className="badge bg-blue-100 text-blue-800">
                  عادي: {filteredOverdue.filter((i) => i.daysOverdue < 15).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
