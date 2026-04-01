// ═══════════════════════════════════════════════════════════════
// Layout for Setup Page
// ═══════════════════════════════════════════════════════════════

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
