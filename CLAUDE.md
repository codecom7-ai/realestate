# CLAUDE.md — تعليمات التكويد
## نظام تشغيل المكتب العقاري المصري — نسخة Single-Tenant
### آخر تحديث: 21 مارس 2026

> **هذه النسخة:** تطبيق لمكتب عقاري واحد — يُباع مرة واحدة ويُنصَّب على سيرفر العميل.
> لا subscription، لا platform admin، لا feature gates.
> كل الميزات مفتوحة من اليوم الأول.

---

## 🔴 القواعد الست التي لا تُكسر أبداً

### 1. RTL-First دائماً
- `dir="rtl"` على كل container رئيسي
- `text-align: start` وليس `text-align: right`
- `margin-inline-start` وليس `margin-left`
- Tailwind: `ms-4` بدل `ml-4`، `ps-4` بدل `pl-4`
- الخطوط: `font-family: 'Cairo', 'Noto Sans Arabic', sans-serif`

### 2. Mobile-First دائماً
- كل component تبدأ من 320px
- Bottom navigation موبايل، Sidebar desktop
- Touch targets: لا تقل عن 44×44px
- DevTools على 375px بعد كل component

### 3. لا Mock Data — لا Static Content
- لا hardcoded names, numbers في الكود
- كل شيء من API أو state
- بيانات الـ seed في ملفات منفصلة

### 4. UI States الثلاثة دائماً
- كل قائمة: loading (skeleton) + empty (رسالة + action) + error (boundary)
- كل form: validation + accessibility labels

### 5. Security-First
- لا secrets في الكود — كل شيء في `.env`
- لا `console.log` لبيانات حساسة
- كل endpoint: auth guard + permissions guard

### 6. ETA — لا افتراض أبداً
- أي شيء يخص ETA: العودة لـ `upload/skill.md` قسم ETA حصراً
- مصدر الحقيقة: `sdk.invoicing.eta.gov.eg`

---

## 🏢 نموذج النسخة Single-Tenant

```
هذا تطبيق لمكتب عقاري واحد — ليس SaaS

عند التثبيت:
  1. setup wizard يعمل مرة واحدة
  2. ينشئ organization record واحد في DB
  3. يُخزَّن ORG_ID في .env
  4. لا يمكن إنشاء organization ثانية

البنية:
  - لا Subscription model
  - لا Platform Admin
  - لا Feature Gates
  - لا AI Credits metering
  - لا Billing
  - كل الميزات مفتوحة دائماً

Auth يعمل بـ JWT عادي — لا organizationId في كل query
  (هناك organization واحدة فقط — معروفة من .env)
```

---

## 📦 Package Versions — 21 مارس 2026

### Frontend (`apps/web`)
```json
{
  "next": "^16.2.1",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "typescript": "^5.8.2",
  "tailwindcss": "^4.2.2",
  "@tanstack/react-query": "^5.66.0",
  "zustand": "^5.0.3",
  "react-hook-form": "^7.54.0",
  "zod": "^3.24.0",
  "next-intl": "^4.1.0",
  "date-fns": "^4.1.0",
  "framer-motion": "^12.6.0",
  "lucide-react": "^0.476.0",
  "recharts": "^2.15.0"
}
```

### Backend (`apps/api`)
```json
{
  "@nestjs/core": "^11.1.17",
  "@nestjs/common": "^11.1.17",
  "@nestjs/platform-fastify": "^11.1.17",
  "@nestjs/swagger": "^11.0.7",
  "@nestjs/jwt": "^11.0.0",
  "@nestjs/schedule": "^5.0.1",
  "fastify": "^5.8.2",
  "prisma": "^6.5.0",
  "@prisma/client": "^6.5.0",
  "bullmq": "^5.41.0",
  "ioredis": "^5.4.2",
  "class-validator": "^0.14.1",
  "class-transformer": "^0.5.1",
  "bcryptjs": "^3.0.2"
}
```

### AI & Integrations
```json
{
  "@anthropic-ai/sdk": "^0.45.0",
  "@google/generative-ai": "^0.24.0",
  "openai": "^4.86.0"
}
```

### Infrastructure
```
Node.js:    v22 LTS
PostgreSQL: 17.x
Redis:      7.4.x
```

> ⚠️ لا Next.js 15.x — ثغرات معروفة
> ⚠️ لا @nestjs/core < 11.1.17 — CVE-2026-2293
> ⚠️ لا Node.js v18/v20 — v22 LTS فقط

---

## 🤖 AI Providers

```typescript
// Tier 1 — Daily tasks
model: "claude-sonnet-4-6"   // ردود واتساب، تلخيص، تصنيف leads

// Tier 2 — Deep analysis
model: "claude-opus-4-6"     // AI Copilot، تحليل عقود، تقارير
thinking: { type: "adaptive" }  // ✅ الجديد — ❌ لا budget_tokens

// Tier 3 — Vision & OCR (أرخص)
model: "gemini-3.1-pro-preview"  // OCR وثائق، صور عقارات
// ⚠️ "gemini-3-pro-preview" يتوقف 26 مارس 2026!

// Tier 4 — Budget batch
// via OpenRouter: "deepseek/deepseek-v3.2"

// Tier 5 — Arabic TTS
// MiniMax Speech 2.6 — https://api.minimax.io/v1/t2a_v2

// Fallback
baseURL: "https://openrouter.ai/api/v1"
```

---

## 🚫 القائمة الحمراء

```
❌ لا Express — Fastify 5.8 فقط
❌ لا class components
❌ لا Redux — Zustand فقط
❌ لا logic في views
❌ لا raw SQL مباشر
❌ لا AI يصدر قرارات مالية/قانونية مستقلة
❌ لا refresh tokens في localStorage
❌ لا any في TypeScript
❌ لا API calls مباشرة في components
❌ لا افتراض أي حقل ETA — skill.md فقط
❌ لا إرسال ETA من Flutter مباشرة — NestJS يوقّع
❌ لا Node.js v18/v20 — v22 LTS فقط
❌ لا Next.js 15.x أو NestJS < 11.1.17
❌ لا thinking: { type: "enabled", budget_tokens } — API قديم
❌ لا output_format في Anthropic SDK — استخدم output_config
❌ لا إنشاء organization ثانية — مكتب واحد فقط → يُرجع ALREADY_SETUP
❌ لا subscription checks — كل الميزات مفتوحة
❌ لا تشغيل /setup مرة ثانية بعد SETUP_DONE=true
```

---

## 📁 المراجع (ملفات المشروع)

```
upload/prd.md           ← متطلبات المنتج الكاملة
upload/plan.md          ← خطة التنفيذ
upload/architecture.md  ← هندسة النظام
upload/data-model.md    ← نموذج البيانات (Prisma)
upload/api-contracts.md ← عقود الـ API
upload/tasks.md         ← المهام التفصيلية
upload/project-rules.md ← قواعد المشروع
upload/security.md      ← مواصفات الأمان
upload/skill.md         ← المعرفة النطاقية (ETA + السوق)
```
