'use client';

// ═══════════════════════════════════════════════════════════════
// Reports Page - التقارير المالية
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

// Types
interface MonthlyRevenue {
  month: string;
  year: number;
  totalDeals: number;
  closedDeals: number;
  totalRevenue: number;
  totalCommission: number;
  avgDealValue: number;
}

interface ETASummary {
  period: string;
  totalReceipts: number;
  validReceipts: number;
  invalidReceipts: number;
  pendingReceipts: number;
  totalAmount: number;
  totalTax: number;
}

interface FinancialSummary {
  totalRevenue: number;
  totalCommission: number;
  totalExpenses: number;
  netProfit: number;
  totalDeals: number;
  closedDeals: number;
  pendingDeals: number;
  conversionRate: number;
}

// Mock data for demo
const mockMonthlyRevenue: MonthlyRevenue[] = [
  { month: 'يناير', year: 2025, totalDeals: 12, closedDeals: 8, totalRevenue: 8500000, totalCommission: 212500, avgDealValue: 1062500 },
  { month: 'فبراير', year: 2025, totalDeals: 15, closedDeals: 10, totalRevenue: 10200000, totalCommission: 255000, avgDealValue: 1020000 },
  { month: 'مارس', year: 2025, totalDeals: 18, closedDeals: 12, totalRevenue: 12500000, totalCommission: 312500, avgDealValue: 1041667 },
  { month: 'أبريل', year: 2025, totalDeals: 14, closedDeals: 9, totalRevenue: 9800000, totalCommission: 245000, avgDealValue: 1088889 },
  { month: 'مايو', year: 2025, totalDeals: 20, closedDeals: 14, totalRevenue: 15000000, totalCommission: 375000, avgDealValue: 1071429 },
  { month: 'يونيو', year: 2025, totalDeals: 16, closedDeals: 11, totalRevenue: 11200000, totalCommission: 280000, avgDealValue: 1018182 },
];

const mockETASummary: ETASummary = {
  period: '2025',
  totalReceipts: 156,
  validReceipts: 142,
  invalidReceipts: 8,
  pendingReceipts: 6,
  totalAmount: 5250000,
  totalTax: 735000,
};

const mockFinancialSummary: FinancialSummary = {
  totalRevenue: 67200000,
  totalCommission: 1680000,
  totalExpenses: 450000,
  netProfit: 1230000,
  totalDeals: 95,
  closedDeals: 64,
  pendingDeals: 31,
  conversionRate: 67.4,
};

// Chart colors
const CHART_COLORS = ['#1e40af', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

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

// KPI Card Component
function KPICard({
  title,
  value,
  change,
  changeType,
  icon,
  color,
}: {
  title: string;
  value: string;
  change?: number;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`card p-4 border-r-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2 text-sm">
              {changeType === 'up' && (
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
              )}
              {changeType === 'down' && (
                <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
              )}
              <span
                className={
                  changeType === 'up'
                    ? 'text-green-600'
                    : changeType === 'down'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }
              >
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-gray-400">من الشهر الماضي</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-full bg-gray-100">{icon}</div>
      </div>
    </div>
  );
}

// Section Component
function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

// Export Button Component
function ExportButton({
  type,
  format,
  label,
}: {
  type: string;
  format: 'pdf' | 'pdf';
  label: string;
}) {
  const handleExport = async () => {
    try {
      let response;
      try {
        response = await apiClient.exportReport(type, format);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          alert('تصدير التقارير غير متاح حالياً. يرجى التواصل مع الدعم الفني.');
          return;
        }
        throw err;
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      link.setAttribute('download', `${type}-report-${new Date().toISOString().split('T')[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors shadow-sm">
      <ArrowDownTrayIcon className="w-4 h-4" />
      {label}
    </button>
  );
}

// Main Page Component
export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [selectedYear, setSelectedYear] = useState(2025);

  const financialSummary = mockFinancialSummary;
  const monthlyRevenue = mockMonthlyRevenue;
  const etaSummary = mockETASummary;

  // Calculate totals
  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalCommission = monthlyRevenue.reduce((sum, m) => sum + m.totalCommission, 0);

  // Revenue by month for chart
  const revenueChartData = monthlyRevenue.map((m) => ({
    name: m.month,
    revenue: m.totalRevenue,
    commission: m.totalCommission,
    deals: m.closedDeals,
  }));

  // ETA status for pie chart
  const etaStatusData = [
    { name: 'مقبولة', value: etaSummary.validReceipts, fill: '#22c55e' },
    { name: 'مرفوضة', value: etaSummary.invalidReceipts, fill: '#ef4444' },
    { name: 'في الانتظار', value: etaSummary.pendingReceipts, fill: '#eab308' },
  ];

  // Deals by status for pie chart
  const dealsStatusData = [
    { name: 'مغلقة', value: financialSummary.closedDeals, fill: '#22c55e' },
    { name: 'قيد المتابعة', value: financialSummary.pendingDeals, fill: '#eab308' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقارير المالية</h1>
          <p className="text-gray-500 mt-1">تقارير الإيرادات والضرائب الإلكترونية</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
          <button
            onClick={() => window.print()}
            className="btn btn-outline flex items-center gap-2"
          >
            <PrinterIcon className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="إجمالي الإيرادات"
          value={formatCurrency(financialSummary.totalRevenue)}
          change={12.5}
          changeType="up"
          icon={<CurrencyDollarIcon className="w-5 h-5 text-green-600" />}
          color="border-green-500"
        />
        <KPICard
          title="إجمالي العمولات"
          value={formatCurrency(financialSummary.totalCommission)}
          change={8.3}
          changeType="up"
          icon={<CurrencyDollarIcon className="w-5 h-5 text-blue-600" />}
          color="border-blue-500"
        />
        <KPICard
          title="الصفقات المغلقة"
          value={String(financialSummary.closedDeals)}
          change={15.2}
          changeType="up"
          icon={<ChartBarIcon className="w-5 h-5 text-purple-600" />}
          color="border-purple-500"
        />
        <KPICard
          title="معدل التحويل"
          value={`${financialSummary.conversionRate}%`}
          change={3.1}
          changeType="up"
          icon={<ArrowTrendingUpIcon className="w-5 h-5 text-orange-600" />}
          color="border-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Section
          title="الإيرادات الشهرية"
          actions={
            <ExportButton type="monthly-revenue" format="pdf" label="تصدير" />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ textAlign: 'right' }}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="الإيرادات"
                  fill="#1e40af"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="commission"
                  name="العمولات"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Deals Chart */}
        <Section title="الصفقات المغلقة">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip labelStyle={{ textAlign: 'right' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="deals"
                  name="الصفقات المغلقة"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* ETA Summary & Deals Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ETA Summary */}
        <Section
          title="ملخص الإيصالات الإلكترونية (ETA)"
          actions={
            <ExportButton type="eta-summary" format="pdf" label="تصدير" />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={etaStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {etaStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">إجمالي الإيصالات</span>
                <span className="font-bold">{etaSummary.totalReceipts}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-500">إجمالي المبالغ</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(etaSummary.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-500">إجمالي الضرائب</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(etaSummary.totalTax)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-500">نسبة القبول</span>
                <span className="font-bold text-purple-600">
                  {((etaSummary.validReceipts / etaSummary.totalReceipts) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* Deals Distribution */}
        <Section title="توزيع الصفقات">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dealsStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {dealsStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">إجمالي الصفقات</span>
                <span className="font-bold">{financialSummary.totalDeals}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-500">صفقات مغلقة</span>
                <span className="font-bold text-green-600">
                  {financialSummary.closedDeals}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-gray-500">قيد المتابعة</span>
                <span className="font-bold text-yellow-600">
                  {financialSummary.pendingDeals}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-500">متوسط قيمة الصفقة</span>
                <span className="font-bold text-purple-600">
                  {formatCurrency(
                    financialSummary.totalRevenue / financialSummary.closedDeals
                  )}
                </span>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Financial Summary Table */}
      <Section
        title="ملخص الإيرادات الشهرية"
        actions={
          <ExportButton type="financial-summary" format="pdf" label="تصدير CSV" />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  الشهر
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  الصفقات
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  المغلقة
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  الإيرادات
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  العمولات
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                  متوسط الصفقة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyRevenue.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{row.month}</td>
                  <td className="px-4 py-3 text-center">{row.totalDeals}</td>
                  <td className="px-4 py-3 text-center">{row.closedDeals}</td>
                  <td className="px-4 py-3 text-left font-medium">
                    {formatCurrency(row.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-left text-green-600">
                    {formatCurrency(row.totalCommission)}
                  </td>
                  <td className="px-4 py-3 text-left text-gray-600">
                    {formatCurrency(row.avgDealValue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td className="px-4 py-3">الإجمالي</td>
                <td className="px-4 py-3 text-center">
                  {monthlyRevenue.reduce((sum, r) => sum + r.totalDeals, 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  {monthlyRevenue.reduce((sum, r) => sum + r.closedDeals, 0)}
                </td>
                <td className="px-4 py-3 text-left">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="px-4 py-3 text-left text-green-600">
                  {formatCurrency(totalCommission)}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">تصدير التقارير</h3>
        <div className="flex flex-wrap gap-3">
          <ExportButton type="monthly-revenue" format="pdf" label="تقرير الإيرادات (CSV)" />
          <ExportButton type="monthly-revenue" format="pdf" label="تقرير الإيرادات (PDF)" />
          <ExportButton type="eta-summary" format="pdf" label="تقرير ETA (CSV)" />
          <ExportButton type="financial-summary" format="pdf" label="التقرير المالي (CSV)" />
        </div>
      </div>
    </div>
  );
}
