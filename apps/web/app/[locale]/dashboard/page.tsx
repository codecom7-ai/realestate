'use client';

// ═══════════════════════════════════════════════════════════════
// Dashboard Page - لوحة التحكم التنفيذية World-Class
// Features: Glass Morphism, Animated Counters, RTL Support
// Responsive Design: 320px (xs) → 4K (2560px)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
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
  Area,
  AreaChart,
  Legend,
} from 'recharts';

// Import World-Class Components
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { LeadsChart, LeadsChartSkeleton } from '@/components/dashboard/LeadsChart';
import { PipelineOverview, PipelineOverviewSkeleton } from '@/components/dashboard/PipelineOverview';
import { RecentActivities, RecentActivitiesSkeleton } from '@/components/dashboard/RecentActivities';

// ═══════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════

const kpiData = [
  {
    id: 'pipeline',
    title: 'قيمة Pipeline',
    value: 12500000,
    change: 12.5,
    trend: 'up' as const,
    color: 'primary' as const,
    isCurrency: true,
    sparklineData: [65, 72, 68, 85, 92, 88, 95],
    icon: <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
  },
  {
    id: 'leads',
    title: 'Leads جديدة',
    value: 45,
    change: 8.3,
    trend: 'up' as const,
    color: 'success' as const,
    sparklineData: [28, 32, 38, 35, 42, 48, 45],
    icon: <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
  },
  {
    id: 'deals',
    title: 'صفقات مغلقة',
    value: 12,
    change: 20,
    trend: 'up' as const,
    color: 'warning' as const,
    sparklineData: [5, 8, 6, 10, 9, 11, 12],
    icon: <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
  },
  {
    id: 'commission',
    title: 'عمولات متوقعة',
    value: 325000,
    change: 15.2,
    trend: 'up' as const,
    color: 'secondary' as const,
    isCurrency: true,
    sparklineData: [180, 220, 195, 280, 310, 290, 325],
    icon: <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
  },
  {
    id: 'properties',
    title: 'عقارات متاحة',
    value: 78,
    change: 0,
    trend: 'stable' as const,
    color: 'info' as const,
    sparklineData: [72, 75, 78, 76, 80, 78, 78],
    icon: <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
  },
  {
    id: 'viewings',
    title: 'معاينات مجدولة',
    value: 23,
    change: -5,
    trend: 'down' as const,
    color: 'danger' as const,
    sparklineData: [30, 28, 25, 27, 24, 25, 23],
    icon: <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />,
  },
];

const leadsByStage = [
  { name: 'جديد', value: 15 },
  { name: 'تواصل', value: 12 },
  { name: 'مؤهل', value: 8 },
  { name: 'تفاوض', value: 6 },
  { name: 'مغلق', value: 4 },
];

const propertiesByType = [
  { name: 'شقة', value: 35, fill: '#3b82f6' },
  { name: 'فيلا', value: 18, fill: '#8b5cf6' },
  { name: 'مكتب', value: 12, fill: '#f59e0b' },
  { name: 'محل', value: 8, fill: '#22c55e' },
  { name: 'أرض', value: 5, fill: '#ef4444' },
];

const monthlyTrends = [
  { month: 'أكتوبر', leads: 32, properties: 15, deals: 5, commission: 125000 },
  { month: 'نوفمبر', leads: 38, properties: 18, deals: 8, commission: 180000 },
  { month: 'ديسمبر', leads: 45, properties: 22, deals: 10, commission: 220000 },
  { month: 'يناير', leads: 52, properties: 25, deals: 12, commission: 280000 },
  { month: 'فبراير', leads: 48, properties: 20, deals: 11, commission: 250000 },
  { month: 'مارس', leads: 55, properties: 28, deals: 14, commission: 325000 },
];

const topAgents = [
  { id: '1', name: 'أحمد محمد', deals: 5, value: 8500000, leads: 18, avatar: 'أ م' },
  { id: '2', name: 'سارة علي', deals: 4, value: 6200000, leads: 15, avatar: 'س ع' },
  { id: '3', name: 'محمد خالد', deals: 3, value: 4500000, leads: 12, avatar: 'م خ' },
];

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444'];

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ج.م`;
  }
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ═══════════════════════════════════════════════════════════════
// Custom Chart Components
// ═══════════════════════════════════════════════════════════════

function CustomLineTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl p-3 min-w-[140px]">
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">{item.name}</span>
          <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload) return null;

  const data = payload[0];
  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl p-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.payload.fill }} />
        <span className="font-semibold text-gray-900 dark:text-white">{data.name}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{data.value} عقار</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Dashboard Page
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [realStats, setRealStats] = useState<any>(null);

  // Fetch real stats from API
  useEffect(() => {
    const loadStats = async () => {
      try {
        const { api } = await import('@/lib/api');
        const response = await api.get('/dashboard/stats');
        if (response.data?.data) {
          setRealStats(response.data.data);
        }
      } catch {
        // Fallback to mock data if API unavailable
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger page data refresh
    await new Promise(resolve => setTimeout(resolve, 300));
    window.dispatchEvent(new CustomEvent("dashboard:refresh"));
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-gray-100/30 dark:from-gray-950 dark:to-gray-900">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
        
        {/* ═══════════════════════════════════════════════════════════════
            Page Header
            ═══════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              لوحة التحكم
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
              آخر تحديث: {new Date().toLocaleString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`
                flex items-center gap-2
                px-4 py-2
                text-sm font-medium
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-600
                rounded-xl shadow-sm
                hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-700 dark:text-gray-200
                transition-all duration-200
                ${isRefreshing ? 'opacity-70' : ''}
              `}
            >
              <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            {/* Add Lead Button */}
            <Link
              href="/dashboard/leads/new"
              className="
                flex items-center gap-2
                px-4 sm:px-5 py-2.5
                text-sm font-medium
                bg-gradient-to-r from-blue-600 to-blue-700
                hover:from-blue-500 hover:to-blue-600
                text-white
                rounded-xl
                shadow-lg shadow-blue-500/25
                hover:shadow-xl hover:shadow-blue-500/30
                transition-all duration-200
                hover:-translate-y-0.5
              "
            >
              <PlusIcon className="w-5 h-5" />
              <span>إضافة Lead</span>
            </Link>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            KPI Cards Grid
            ═══════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
          {isLoading
            ? [...Array(6)].map((_, i) => <KPICardSkeleton key={i} />)
            : kpiData.map((kpi, index) => (
                <KPICard
                  key={kpi.id}
                  title={kpi.title}
                  value={kpi.value}
                  change={kpi.change}
                  trend={kpi.trend}
                  color={kpi.color}
                  isCurrency={kpi.isCurrency}
                  sparklineData={kpi.sparklineData}
                  icon={kpi.icon}
                  delay={index * 75}
                />
              ))
          }
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            Main Content Grid
            ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column - Charts */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Leads by Stage Chart */}
            {isLoading ? (
              <LeadsChartSkeleton />
            ) : (
              <LeadsChart data={leadsByStage} delay={200} />
            )}

            {/* Monthly Trends Chart */}
            <div
              className="
                rounded-2xl 
                border border-gray-200/60 dark:border-gray-800/40
                bg-gradient-to-br from-white/80 to-white/50 
                dark:from-gray-900/80 dark:to-gray-900/50
                backdrop-blur-sm
                shadow-lg shadow-gray-500/5 dark:shadow-black/10
                overflow-hidden
                animate-fade-in-up
              "
              style={{ animationDelay: '300ms' }}
            >
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-800/50">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  الاتجاهات الشهرية
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  آخر 6 أشهر
                </p>
              </div>

              <div className="p-4 sm:p-6">
                <div className="h-72 sm:h-80 lg:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends}>
                      <defs>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
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
                      />
                      <Tooltip content={<CustomLineTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        name="Leads"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorLeads)"
                      />
                      <Area
                        type="monotone"
                        dataKey="deals"
                        name="صفقات"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#colorDeals)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Properties Distribution & Top Agents Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Properties by Type */}
              <div
                className="
                  rounded-2xl 
                  border border-gray-200/60 dark:border-gray-800/40
                  bg-gradient-to-br from-white/80 to-white/50 
                  dark:from-gray-900/80 dark:to-gray-900/50
                  backdrop-blur-sm
                  shadow-lg shadow-gray-500/5 dark:shadow-black/10
                  overflow-hidden
                  animate-fade-in-up
                "
                style={{ animationDelay: '400ms' }}
              >
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-800/50">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    توزيع العقارات
                  </h3>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={propertiesByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          animationBegin={400}
                          animationDuration={800}
                        >
                          {propertiesByType.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend 
                          layout="vertical" 
                          align="left"
                          verticalAlign="middle"
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => (
                            <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Top Agents */}
              <div
                className="
                  rounded-2xl 
                  border border-gray-200/60 dark:border-gray-800/40
                  bg-gradient-to-br from-white/80 to-white/50 
                  dark:from-gray-900/80 dark:to-gray-900/50
                  backdrop-blur-sm
                  shadow-lg shadow-gray-500/5 dark:shadow-black/10
                  overflow-hidden
                  animate-fade-in-up
                "
                style={{ animationDelay: '500ms' }}
              >
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-800/50">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    أفضل الوكلاء
                  </h3>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  {topAgents.map((agent, index) => (
                    <div
                      key={agent.id}
                      className="
                        flex items-center gap-4
                        p-3 rounded-xl
                        bg-gray-50/50 dark:bg-gray-800/50
                        hover:bg-gray-100/50 dark:hover:bg-gray-700/50
                        transition-colors duration-200
                        animate-fade-in-up
                      "
                      style={{ animationDelay: `${500 + index * 100}ms` }}
                    >
                      {/* Rank Badge */}
                      <div className={`
                        flex-shrink-0
                        w-8 h-8
                        rounded-full
                        flex items-center justify-center
                        text-sm font-bold
                        ${index === 0 
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30' 
                          : index === 1 
                            ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }
                      `}>
                        {index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{agent.avatar}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {agent.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {agent.deals} صفقات • {agent.leads} Leads
                        </p>
                      </div>

                      {/* Value */}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(agent.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Pipeline & Activities */}
          <div className="space-y-6">
            {/* Pipeline Overview */}
            {isLoading ? (
              <PipelineOverviewSkeleton />
            ) : (
              <PipelineOverview delay={200} />
            )}

            {/* Recent Activities */}
            {isLoading ? (
              <RecentActivitiesSkeleton />
            ) : (
              <RecentActivities delay={400} />
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            Quick Actions
            ═══════════════════════════════════════════════════════════════ */}
        <section
          className="
            rounded-2xl 
            border border-gray-200/60 dark:border-gray-800/40
            bg-gradient-to-br from-white/80 to-white/50 
            dark:from-gray-900/80 dark:to-gray-900/50
            backdrop-blur-sm
            shadow-lg shadow-gray-500/5 dark:shadow-black/10
            overflow-hidden
            p-4 sm:p-6
            animate-fade-in-up
          "
          style={{ animationDelay: '600ms' }}
        >
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            إجراءات سريعة
          </h3>
          
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/leads/new"
              className="
                flex items-center gap-2
                px-4 py-2.5
                text-sm font-medium
                bg-gradient-to-r from-blue-600 to-blue-700
                hover:from-blue-500 hover:to-blue-600
                text-white
                rounded-xl
                shadow-lg shadow-blue-500/25
                hover:shadow-xl
                transition-all duration-200
                hover:-translate-y-0.5
              "
            >
              <PlusIcon className="w-4 h-4" />
              إضافة Lead
            </Link>
            
            <Link
              href="/dashboard/properties/new"
              className="
                flex items-center gap-2
                px-4 py-2.5
                text-sm font-medium
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                text-gray-700 dark:text-gray-300
                rounded-xl
                hover:bg-gray-50 dark:hover:bg-gray-700
                hover:border-gray-300 dark:hover:border-gray-600
                transition-all duration-200
              "
            >
              <PlusIcon className="w-4 h-4" />
              إضافة عقار
            </Link>
            
            <Link
              href="/dashboard/clients/new"
              className="
                flex items-center gap-2
                px-4 py-2.5
                text-sm font-medium
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                text-gray-700 dark:text-gray-300
                rounded-xl
                hover:bg-gray-50 dark:hover:bg-gray-700
                hover:border-gray-300 dark:hover:border-gray-600
                transition-all duration-200
              "
            >
              <PlusIcon className="w-4 h-4" />
              إضافة عميل
            </Link>
            
            <Link
              href="/dashboard/calendar"
              className="
                flex items-center gap-2
                px-4 py-2.5
                text-sm font-medium
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                text-gray-700 dark:text-gray-300
                rounded-xl
                hover:bg-gray-50 dark:hover:bg-gray-700
                hover:border-gray-300 dark:hover:border-gray-600
                transition-all duration-200
              "
            >
              <CalendarIcon className="w-4 h-4" />
              جدولة معاينة
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
