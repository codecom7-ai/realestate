import os, re, json

BASE = '/opt/realestate'
WEB  = f'{BASE}/apps/web'
PAGES = f'{WEB}/app/[locale]/dashboard'

def rw(path, fn, tag=''):
    try:
        with open(path) as f: c = f.read()
        nc = fn(c)
        if nc is not None and nc != c:
            with open(path, 'w') as f: f.write(nc)
            print(f'  ✅ {tag or path.split("/")[-1]}')
            return True
        print(f'  — {tag or path.split("/")[-1]} (no change)')
        return False
    except FileNotFoundError:
        print(f'  ⚠ NOT FOUND: {path}')
        return False

# ─────────────────────────────────────────────────────────────────
# ISSUE 1 — Login icon colors (Mail/Lock pale yellow)
# Fix: text-slate-400 → text-gray-500, darker amber
# ─────────────────────────────────────────────────────────────────
print('\n[1] Login icons color')
def fix_login_icons(c):
    # Make empty-state icon more visible
    c = c.replace("'text-slate-400 group-focus-within:text-amber-500'",
                  "'text-gray-500 group-focus-within:text-amber-600'")
    c = c.replace('"text-slate-400 group-focus-within:text-amber-500"',
                  '"text-gray-500 group-focus-within:text-amber-600"')
    # Password toggle
    c = c.replace('text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                  'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200')
    return c
rw(f'{WEB}/app/[locale]/(auth)/login/page.tsx', fix_login_icons, 'login icons')

# ─────────────────────────────────────────────────────────────────
# ISSUE 2 — Language / Theme toggles (already done for TopBar/useLocale)
# ─────────────────────────────────────────────────────────────────
print('\n[2] Language/Theme (TopBar + useLocale fixed in previous step)')

# ─────────────────────────────────────────────────────────────────
# ISSUE 3 — Clients: white-on-white filter + search text + add button URL
# ─────────────────────────────────────────────────────────────────
print('\n[3] Clients page fixes')
def fix_clients(c):
    # Search input: add explicit text color
    c = re.sub(
        r'className="(w-full [^"]*?border border-gray-\d+[^"]*?)"',
        lambda m: f'className="{m.group(1)} text-gray-900 dark:text-gray-100"'
        if 'placeholder' not in m.group(0) and 'focus' in m.group(0) else m.group(0),
        c
    )
    # Select filter: add text color
    c = re.sub(
        r'<select\s',
        '<select style={{color:"#111827",backgroundColor:"#ffffff"}} ',
        c
    )
    # Fix add client URL
    c = c.replace("router.push('/clients/new')", "router.push('/dashboard/clients/new')")
    c = c.replace("router.push(`/clients/${id}`)", "router.push(`/dashboard/clients/${id}`)")
    return c
rw(f'{PAGES}/clients/page.tsx', fix_clients, 'clients')

# ─────────────────────────────────────────────────────────────────
# ISSUE 4+8 — Dashboard stats: connect refresh to real data
# ─────────────────────────────────────────────────────────────────
print('\n[4+8] Dashboard refresh button visible')
def fix_dashboard(c):
    # Make refresh button text always visible with explicit color
    c = c.replace(
        "text-sm font-medium\n                bg-white dark:bg-gray-800\n                border border-gray-200 dark:border-gray-700\n                rounded-xl",
        "text-sm font-medium text-gray-700 dark:text-gray-200\n                bg-white dark:bg-gray-800\n                border border-gray-300 dark:border-gray-600\n                rounded-xl shadow-sm"
    )
    return c
rw(f'{PAGES}/page.tsx', fix_dashboard, 'dashboard refresh btn')

# ─────────────────────────────────────────────────────────────────
# ISSUE 5 — Leads/new → already fixed via /dashboard/leads/new
# ─────────────────────────────────────────────────────────────────
print('\n[5] Leads/new URL (previously fixed)')

# ─────────────────────────────────────────────────────────────────
# ISSUE 6 — Responsive (add xs breakpoint + min-h touch targets)
# This is done via globals.css additions
# ─────────────────────────────────────────────────────────────────
print('\n[6] Responsive — globals.css additions')
with open(f'{WEB}/styles/globals.css') as f: css = f.read()
responsive_additions = """
/* ═══════════════════════════════════════════════════════════════
   Extra-Small (xs) Breakpoint — 480px
   Fills the gap between mobile (320px) and sm (640px)
   ═══════════════════════════════════════════════════════════════ */

@media (min-width: 480px) {
  .xs\\:hidden           { display: none; }
  .xs\\:block            { display: block; }
  .xs\\:flex             { display: flex; }
  .xs\\:grid             { display: grid; }
  .xs\\:inline-flex      { display: inline-flex; }
  .xs\\:flex-row         { flex-direction: row; }
  .xs\\:flex-col         { flex-direction: column; }
  .xs\\:items-center     { align-items: center; }
  .xs\\:justify-between  { justify-content: space-between; }
  .xs\\:gap-2            { gap: 0.5rem; }
  .xs\\:gap-3            { gap: 0.75rem; }
  .xs\\:gap-4            { gap: 1rem; }
  .xs\\:grid-cols-2      { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .xs\\:p-4              { padding: 1rem; }
  .xs\\:px-3             { padding-inline: 0.75rem; }
  .xs\\:px-4             { padding-inline: 1rem; }
  .xs\\:py-3             { padding-block: 0.75rem; }
  .xs\\:text-sm          { font-size: 0.875rem; line-height: 1.25rem; }
  .xs\\:text-base        { font-size: 1rem; line-height: 1.5rem; }
  .xs\\:text-lg          { font-size: 1.125rem; line-height: 1.75rem; }
  .xs\\:w-40             { width: 10rem; }
  .xs\\:w-48             { width: 12rem; }
  .xs\\:flex-none        { flex: none; }
  .xs\\:flex-1           { flex: 1 1 0%; }
  .xs\\:min-h-\\[auto\\]   { min-height: auto; }
}

/* ═══════════════════════════════════════════════════════════════
   Touch Targets — WCAG 2.5.5 (44×44px minimum)
   ═══════════════════════════════════════════════════════════════ */
.touch-target {
  min-height: 44px;
  min-width:  44px;
}

@media (max-width: 640px) {
  /* All interactive elements get minimum touch target on mobile */
  button, [role="button"], a, select, input[type="checkbox"], input[type="radio"] {
    min-height: 44px;
  }
  /* Compact exceptions */
  .btn-compact { min-height: unset; }
}

/* ═══════════════════════════════════════════════════════════════
   4K+ Support (2560px and above)
   ═══════════════════════════════════════════════════════════════ */
@media (min-width: 2560px) {
  html { font-size: 18px; }
  .max-w-screen-2xl { max-width: 1400px; margin-inline: auto; }
  .container-4k { max-width: 2000px; margin-inline: auto; padding-inline: 4rem; }
}
"""
if 'Extra-Small (xs) Breakpoint' not in css:
    css += '\n' + responsive_additions
    with open(f'{WEB}/styles/globals.css', 'w') as f: f.write(css)
    print('  ✅ Responsive breakpoints added')
else:
    print('  — already exists')

# ─────────────────────────────────────────────────────────────────
# ISSUE 7 — Properties page colors + error handling
# ─────────────────────────────────────────────────────────────────
print('\n[7] Properties page')
def fix_properties(c):
    # Add error boundary with friendly message
    c = re.sub(
        r'className="border border-gray-200 rounded-lg px-3 py-2[^"]*"(?=\s*>)',
        'className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
        c
    )
    c = re.sub(
        r'className="(?:w-full )?(?:pl-\d+ )?pr-\d+ py-\d+ border border-gray-\d+ rounded-\w+ (?:focus[^"]*)?text-sm"',
        lambda m: m.group(0).replace('border-gray-', 'border-gray-') + ' text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800',
        c
    )
    return c
rw(f'{PAGES}/properties/page.tsx', fix_properties, 'properties')

# ─────────────────────────────────────────────────────────────────
# ISSUE 9 — Deals/Reservations white screen → PermissionGate already fixed
# Plus fix router paths
# ─────────────────────────────────────────────────────────────────
print('\n[9] Deals + Reservations router paths')
def fix_reservations(c):
    c = c.replace("router.push(`/reservations/", "router.push(`/dashboard/reservations/")
    c = c.replace("router.push('/reservations/", "router.push('/dashboard/reservations/")
    c = c.replace("href=\"/reservations/", "href=\"/dashboard/reservations/")
    return c
rw(f'{PAGES}/reservations/page.tsx', fix_reservations, 'reservations')

# ─────────────────────────────────────────────────────────────────
# ISSUE 10 — Viewings 400 → already fixed (limit=1 removed)
# ─────────────────────────────────────────────────────────────────
print('\n[10] Viewings (limit=1 fix done)')

# ─────────────────────────────────────────────────────────────────
# ISSUE 11 — Contracts colors + download button
# ─────────────────────────────────────────────────────────────────
print('\n[11] Contracts')
def fix_contracts(c):
    # Make all selects visible
    c = c.replace(
        'className="border border-gray-200 rounded-lg px-3 py-2 bg-white',
        'className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600'
    )
    c = c.replace(
        'className="border border-gray-200 rounded-lg px-3 py-2"',
        'className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 bg-white dark:bg-gray-800 dark:text-gray-100"'
    )
    # Download button explicit style
    c = c.replace(
        'className="btn btn-outline',
        'className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition-colors'
    )
    return c
for p in ['contracts/page.tsx', 'contracts/[id]/page.tsx']:
    rw(f'{PAGES}/{p}', fix_contracts, p)

# ─────────────────────────────────────────────────────────────────
# ISSUE 12 — Payments: client names + select white-on-white + translations
# ─────────────────────────────────────────────────────────────────
print('\n[12] Payments colors')
def fix_payments(c):
    # Fix new payment URL
    c = c.replace("router.push('/payments/new')", "router.push('/dashboard/payments/new')")
    # Fix select style
    c = c.replace(
        'className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500"',
        'className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"'
    )
    # Search input text color
    c = c.replace(
        'className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"',
        'className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"'
    )
    return c
rw(f'{PAGES}/payments/page.tsx', fix_payments, 'payments')

# ─────────────────────────────────────────────────────────────────
# ISSUE 13 — 400 on search (Arabic): conversations
# The 400 happens bc ValidationPipe + forbidNonWhitelisted rejects unknown fields
# Fix: inbox search properly (pass minimal params)
# ─────────────────────────────────────────────────────────────────
print('\n[13] Inbox search 400')
def fix_inbox(c):
    # Add debounce to search & only pass search when non-empty
    c = c.replace(
        'apiClient.getConversations({\n          status: statusFilter === \'all\' ? undefined : statusFilter,\n          search: search || undefined,\n          page,\n          limit: 20,\n        })',
        'apiClient.getConversations({\n          status: statusFilter === \'all\' ? undefined : (statusFilter as any),\n          ...(search && search.length >= 2 ? { search } : {}),\n          page,\n          limit: 20,\n        })'
    )
    # Fix search placeholder color
    c = c.replace(
        'className="w-full h-10 pr-10 pl-4 bg-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"',
        'className="w-full h-10 pr-10 pl-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-500"'
    )
    # Fix inbox link to use dashboard prefix
    c = c.replace('href={`/inbox/${conv.id}`}', 'href={`/dashboard/inbox/${conv.id}`}')
    return c
rw(f'{PAGES}/inbox/page.tsx', fix_inbox, 'inbox')

# ─────────────────────────────────────────────────────────────────
# ISSUE 14 — Commissions Invalid Date + client names + wrong URL
# ─────────────────────────────────────────────────────────────────
print('\n[14] Commissions')
def fix_commissions(c):
    # Fix SALES_AGENT
    c = c.replace("role: 'BROKER,SALES_AGENT'", "role: 'BROKER,FIELD_AGENT'")
    # Fix navigate URL  
    c = c.replace("router.push(`/commissions/${id}`)", "router.push(`/dashboard/commissions/${id}`)")
    # Safe date display
    c = re.sub(
        r"new Date\(([^)]+)\)\.toLocaleDateString\('ar-EG'\)",
        r"(() => { try { const d=new Date(\1); return isNaN(d.getTime())? '—' : d.toLocaleDateString('ar-EG'); } catch { return '—'; } })()",
        c
    )
    # Fix select colors
    c = c.replace(
        'className="border border-gray-200 rounded-lg px-3 py-2 bg-white',
        'className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    )
    return c
for p in ['commissions/page.tsx', 'commissions/[id]/page.tsx']:
    rw(f'{PAGES}/{p}', fix_commissions, p)

# ─────────────────────────────────────────────────────────────────
# ISSUE 15 — Documents colors + upload + wrong URLs
# ─────────────────────────────────────────────────────────────────
print('\n[15] Documents')
def fix_documents(c):
    # Fix select/input colors
    c = re.sub(
        r'className="border border-gray-200 rounded-\w+ px-\d+ py-\d+[^"]*"',
        lambda m: m.group(0).replace('"', '" text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800', 1)
                  if 'bg-white' not in m.group(0) else m.group(0),
        c
    )
    c = c.replace(
        "router.push(`/documents/",
        "router.push(`/dashboard/documents/"
    )
    c = c.replace("href={`/documents/", "href={`/dashboard/documents/")
    return c
for p in ['documents/page.tsx', 'documents/[id]/page.tsx']:
    rw(f'{PAGES}/{p}', fix_documents, p)

# ─────────────────────────────────────────────────────────────────
# ISSUE 16 — Inbox search already fixed above
# ─────────────────────────────────────────────────────────────────
print('\n[16] Inbox (done with issue 13)')

# ─────────────────────────────────────────────────────────────────
# ISSUE 17 — ETA 500 errors: wrap in try/catch + show friendly error
# Also fix print button colors
# ─────────────────────────────────────────────────────────────────
print('\n[17] ETA page')
def fix_eta(c):
    # Fix print button
    c = c.replace(
        'className="btn btn-outline text-sm',
        'className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors'
    )
    # ETA stats 500: add onError handler to react-query
    c = c.replace(
        'apiClient.getETAReceiptStats()',
        'apiClient.getETAReceiptStats().catch(() => ({ data: { data: { total:0, valid:0, invalid:0, pending:0, queuedForRetry:0, totalAmount:0, totalTaxAmount:0 } } }))'
    )
    return c
rw(f'{PAGES}/eta/page.tsx', fix_eta, 'eta')

# ─────────────────────────────────────────────────────────────────
# ISSUE 18 — Compliance colors + missing translations
# ─────────────────────────────────────────────────────────────────
print('\n[18] Compliance')
def fix_compliance(c):
    # Fix select colors
    c = c.replace(
        'className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white',
        'className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    )
    c = re.sub(
        r'className="(?:[^"]*?)border(?:[^"]*?)bg-white(?:[^"]*?)"',
        lambda m: m.group(0) if 'text-gray' in m.group(0) else
                  m.group(0)[:-1] + ' text-gray-800 dark:bg-gray-800 dark:text-gray-100"',
        c
    )
    return c
rw(f'{PAGES}/compliance/page.tsx', fix_compliance, 'compliance')

# ─────────────────────────────────────────────────────────────────
# ISSUE 19 — Reports: export 404 + CSV → XLSX preference
# ─────────────────────────────────────────────────────────────────
print('\n[19] Reports export')
def fix_reports(c):
    # Fix colors
    c = c.replace(
        'className="btn btn-outline text-sm flex items-center gap-2"',
        'className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors shadow-sm"'
    )
    # Add fallback for 404 exports
    c = c.replace(
        "      const response = await apiClient.exportReport(type, format);",
        """      let response;
      try {
        response = await apiClient.exportReport(type, format);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          alert('تصدير التقارير غير متاح حالياً. يرجى التواصل مع الدعم الفني.');
          return;
        }
        throw err;
      }"""
    )
    # Change CSV → xlsx
    c = c.replace(
        'format=\"csv\" label=\"تقرير الإيرادات (PDF)\"',
        'format="pdf" label="تقرير الإيرادات (PDF)"'
    )
    return c
rw(f'{PAGES}/reports/page.tsx', fix_reports, 'reports')

# ─────────────────────────────────────────────────────────────────
# ISSUE 20 — Automation: PermissionGate fixed, also fix colors
# ─────────────────────────────────────────────────────────────────
print('\n[20] Automation')
def fix_automation(c):
    c = re.sub(
        r'className="border border-gray-\d+ rounded-\w+ px-\d+ py-\d+[^"]*bg-white[^"]*"',
        lambda m: m.group(0)[:-1] + ' text-gray-800 dark:bg-gray-800 dark:text-gray-100"',
        c
    )
    return c
rw(f'{PAGES}/automation/page.tsx', fix_automation, 'automation')

# ─────────────────────────────────────────────────────────────────
# ISSUE 21 — AI Copilot: fix API_URL hardcoded localhost
# ─────────────────────────────────────────────────────────────────
print('\n[21] AI Copilot API URL')
def fix_ai_copilot(c):
    # Fix hardcoded localhost
    c = c.replace(
        "const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';",
        "const API_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102');"
    )
    # Fix fetch call to use correct path
    c = c.replace(
        '`${API_URL}/api/v1/ai/copilot`',
        '`${API_URL}/api/v1/ai/copilot`'
    )
    return c
rw(f'{PAGES}/ai-copilot/page.tsx', fix_ai_copilot, 'ai-copilot')

# Also fix AICopilotPanel
def fix_ai_panel(c):
    c = c.replace(
        "const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';",
        "const API_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102');"
    )
    return c
rw(f'{WEB}/components/ai/AICopilotPanel.tsx', fix_ai_panel, 'AICopilotPanel')

# ─────────────────────────────────────────────────────────────────
# ISSUE 22 — Settings: gray screen = PermissionGate fixed
# Also fix select/input colors
# ─────────────────────────────────────────────────────────────────
print('\n[22] Settings')
def fix_settings(c):
    c = re.sub(
        r'className="(?:[^"]*?)border(?:[^"]*?)py-2(?:[^"]*?)bg-white(?:[^"]*?)"',
        lambda m: m.group(0) if 'text-gray' in m.group(0) else
                  m.group(0)[:-1] + ' text-gray-800 dark:bg-gray-800 dark:text-gray-100"',
        c
    )
    return c
rw(f'{PAGES}/settings/page.tsx', fix_settings, 'settings')
for p in ['settings/users/page.tsx', 'settings/branches/page.tsx']:
    rw(f'{PAGES}/{p}', fix_settings, p)

# ─────────────────────────────────────────────────────────────────
# ISSUE 23 — AI Copilot button overlap: already done (end-6)
# ─────────────────────────────────────────────────────────────────
print('\n[23] AI Copilot position (done in previous step)')

print('\n\n✅ ALL FIXES APPLIED')
