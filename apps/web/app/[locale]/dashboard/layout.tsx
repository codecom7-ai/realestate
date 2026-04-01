// ═══════════════════════════════════════════════════════════════
// Dashboard Layout - Sidebar + BottomNav + AI Copilot
// ═══════════════════════════════════════════════════════════════

import { Sidebar } from '@/components/shared/Sidebar';
import { BottomNav } from '@/components/shared/BottomNav';
import { TopBar } from '@/components/shared/TopBar';
import SkipLink from '@/components/shared/SkipLink';
import AICopilotPanel from '@/components/ai/AICopilotPanel';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Link for Accessibility */}
      <SkipLink />
      
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="lg:ms-64">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main id="main-content" role="main" className="p-4 pb-20 lg:pb-4 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* AI Copilot Floating Panel */}
      <AICopilotPanel />
    </div>
  );
}
