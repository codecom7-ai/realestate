// ═══════════════════════════════════════════════════════════════
// Layout for Authentication Pages (Login, Register, etc.)
// World-Class UI/UX with Animated Background
// ═══════════════════════════════════════════════════════════════

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {children}
    </div>
  );
}
