'use client';

// ═══════════════════════════════════════════════════════════════
// Financial Reports - التقارير المالية
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Mock Data for Financial Reports
const mockMonthlyRevenue = {
  thisMonth: 4250000,
  lastMonth: 3850000,
  change: 10.4,
  trend: 'up' as const,
};

const mockRevenueData = [
  { month: 'يناير', revenue: 3200000, collected: 2800000 },
  { month: 'فبراير', revenue: 3500000, collected: 3100000 },
  { month: 'مارس', revenue: 3800000, collected: 3400000 },
  { month: 'أبريل', revenue: 3600000, collected: 3300000 },
  { month: 'مايو', revenue: 4000000, collected: 3600000 },
  { month: 'يونيو', revenue: 4250000, collected: 3900000 },
];

const mockETASummary = {
  totalInvoices: 156,
  totalAmount: 8500000,
  validInvoices: 142,
  invalidInvoices: 5,
  pendingInvoices: 9,
};

const mockCommissionSummary = {
  calculated: { count: 45, amount: 1250000 },
  approved: { count: 38, amount: 1050000 },
  paid: { count: 30, amount: 850000 },
  pendingApproval: { count: 7, amount: 200000 },
  pendingPayment: { count: 8, amount: 200000 },
};

const mockBranches = [
  { id: 'all', name: 'جميع الفروع' },
  { id: '1', name: 'المقر الرئيسي' },
  { id: '2', name: 'فرع مدينة نصر' },
  { id: '3', name: 'فرع المعادي' },
];

const mockMonthlyTableData = [
  { month: 'يناير', revenue: 3200000, collected: 2800000, pending: 400000, rate: 87.5 },
  { month: 'فبراير', revenue: 3500000, collected: 3100000, pending: 400000, rate: 88.6 },
  { month: 'مارس', revenue: 3800000, collected: 3400000, pending: 400000, rate: 89.5 },
  { month: 'أبريل', revenue: 3600000, collected: 3300000, pending: 300000, rate: 91.7 },
  { month: 'مايو', revenue: 4000000, collected: 3600000, pending: 400000, rate: 90.0 },
  { month: 'يونيو', revenue: 4250000, collected: 3900000, pending: 350000, rate: 91.8 },
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

// Format number
function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}

// Format percentage
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// Main Financial Reports Page
export default function FinancialReportsPage() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('last6Months');
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf' | null>(null);

  // Handle export
  const handleExport = async (type: 'excel' | 'pdf') => {
    setIsExporting(true);
    setExportType(type);
    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsExporting(false);
    setExportType(null);
    // In real app, this would trigger a download
    alert(`تم تصدير التقرير بنجاح (${type === 'excel' ? 'Excel' : 'PDF'})`);
  };

  // Calculate totals
  const totalRevenue = useMemo(() => {
    return mockRevenueData.reduce((sum, item) => sum + item.revenue, 0);
  }, []);

  const totalCollected = useMemo(() => {
    return mockRevenueData.reduce((sum, item) => sum + item.collected, 0);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقارير المالية</h1>
          <p className="text-gray-500 mt-1">تقارير شاملة عن الأداء المالي</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="btn btn-outline flex items-center gap-2"
          >
            {isExporting && exportType === 'excel' ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="w-4 h-4" />
                تصدير Excel
              </>
            )}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="btn btn-primary flex items-center gap-2"
          >
            {isExporting && exportType === 'pdf' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <PrinterIcon className="w-4 h-4" />
                تصدير PDF
              </>
            )}
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
        </div>
      </div>

      {/* Monthly Revenue Report */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">تقرير الإيرادات الشهرية</h3>
          <div className="flex items-center gap-2">
            {mockMonthlyRevenue.trend === 'up' ? (
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
            ) : (
              <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
            )}
            <span className={mockMonthlyRevenue.trend === 'up' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {mockMonthlyRevenue.change > 0 ? '+' : ''}{mockMonthlyRevenue.change}%
            </span>
            <span className="text-gray-500 text-sm">مقارنة بالشهر السابق</span>
          </div>
        </div>

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-600 mb-1">إيرادات هذا الشهر</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(mockMonthlyRevenue.thisMonth)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">الشهر السابق</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockMonthlyRevenue.lastMonth)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-600 mb-1">الفرق</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(mockMonthlyRevenue.thisMonth - mockMonthlyRevenue.lastMonth)}
            </p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockRevenueData}>
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
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ textAlign: 'right' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name="الإيرادات"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="collected"
                name="المحصل"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ fill: '#22c55e', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ETA Summary & Commission Summary - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ETA Summary */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">ملخص الفوترة الإلكترونية (ETA)</h3>
          
          {/* ETA Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-600 mb-1">عدد الفواتير</p>
              <p className="text-2xl font-bold text-blue-900">{formatNumber(mockETASummary.totalInvoices)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-sm text-purple-600 mb-1">إجمالي المبالغ</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(mockETASummary.totalAmount)}</p>
            </div>
          </div>

          {/* Invoice Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">فواتير صالحة</span>
              </div>
              <div className="text-left">
                <span className="font-bold text-green-700">{mockETASummary.validInvoices}</span>
                <span className="text-gray-400 text-sm mr-1">فاتورة</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircleIcon className="w-5 h-5 text-red-600" />
                <span className="text-gray-700">فواتير غير صالحة</span>
              </div>
              <div className="text-left">
                <span className="font-bold text-red-700">{mockETASummary.invalidInvoices}</span>
                <span className="text-gray-400 text-sm mr-1">فاتورة</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
                <span className="text-gray-700">فواتير معلقة</span>
              </div>
              <div className="text-left">
                <span className="font-bold text-yellow-700">{mockETASummary.pendingInvoices}</span>
                <span className="text-gray-400 text-sm mr-1">فاتورة</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commission Summary */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">ملخص العمولات</h3>
          
          {/* Commission Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="text-gray-700">عمولات محسوبة</span>
                  <p className="text-xs text-gray-400">{mockCommissionSummary.calculated.count} عملية</p>
                </div>
              </div>
              <span className="font-bold text-blue-700">{formatCurrency(mockCommissionSummary.calculated.amount)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <div>
                  <span className="text-gray-700">عمولات معتمدة</span>
                  <p className="text-xs text-gray-400">{mockCommissionSummary.approved.count} عملية</p>
                </div>
              </div>
              <span className="font-bold text-green-700">{formatCurrency(mockCommissionSummary.approved.amount)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="w-5 h-5 text-purple-600" />
                <div>
                  <span className="text-gray-700">عمولات مدفوعة</span>
                  <p className="text-xs text-gray-400">{mockCommissionSummary.paid.count} عملية</p>
                </div>
              </div>
              <span className="font-bold text-purple-700">{formatCurrency(mockCommissionSummary.paid.amount)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
                <div>
                  <span className="text-gray-700">في انتظار الاعتماد</span>
                  <p className="text-xs text-gray-400">{mockCommissionSummary.pendingApproval.count} عملية</p>
                </div>
              </div>
              <span className="font-bold text-yellow-700">{formatCurrency(mockCommissionSummary.pendingApproval.amount)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-5 h-5 text-orange-600" />
                <div>
                  <span className="text-gray-700">في انتظار الدفع</span>
                  <p className="text-xs text-gray-400">{mockCommissionSummary.pendingPayment.count} عملية</p>
                </div>
              </div>
              <span className="font-bold text-orange-700">{formatCurrency(mockCommissionSummary.pendingPayment.amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">تفاصيل الإيرادات الشهرية</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الشهر</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">الإيرادات</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المحصل</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">المعلق</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">نسبة التحصيل</th>
              </tr>
            </thead>
            <tbody>
              {mockMonthlyTableData.map((row, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 font-medium text-gray-900">{row.month}</td>
                  <td className="py-4 px-4 text-gray-700">{formatCurrency(row.revenue)}</td>
                  <td className="py-4 px-4 text-green-600 font-medium">{formatCurrency(row.collected)}</td>
                  <td className="py-4 px-4 text-orange-600">{formatCurrency(row.pending)}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${row.rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12 text-left">
                        {row.rate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Table Footer */}
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="py-4 px-4 text-gray-900">الإجمالي</td>
                <td className="py-4 px-4 text-gray-900">{formatCurrency(totalRevenue)}</td>
                <td className="py-4 px-4 text-green-600">{formatCurrency(totalCollected)}</td>
                <td className="py-4 px-4 text-orange-600">{formatCurrency(totalRevenue - totalCollected)}</td>
                <td className="py-4 px-4">
                  <span className="text-green-600">
                    {formatPercentage((totalCollected / totalRevenue) * 100)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl text-white">
              <CurrencyDollarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-blue-600">إجمالي الإيرادات</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500 rounded-xl text-white">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-green-600">إجمالي المحصل</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(totalCollected)}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500 rounded-xl text-white">
              <ClockIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-orange-600">إجمالي المعلق</p>
              <p className="text-xl font-bold text-orange-900">{formatCurrency(totalRevenue - totalCollected)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
