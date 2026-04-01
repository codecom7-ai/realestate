# 📋 دليل نشر النظام على VPS مع PostgreSQL

## نظرة عامة

هذا الدليل يشرح كيفية نقل نظام تشغيل المكتب العقاري المصري من بيئة التطوير (SQLite) إلى بيئة الإنتاج (PostgreSQL) على VPS.

---

## 📁 هيكل الملفات

```
realestate-os/
├── apps/
│   ├── api/                    ← NestJS Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   ← ملف الـ Schema (يحتاج تعديل)
│   │   │   └── seed.ts         ← بيانات أولية
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── index.ts    ← إعدادات JWT (تم التعديل)
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts       ← تم التعديل
│   │   │   │   │   └── strategies/
│   │   │   │   │       └── jwt.strategy.ts   ← تم التعديل
│   │   │   │   └── setup/
│   │   │   │       └── setup.service.ts     ← تم التعديل
│   │   │   └── middleware/
│   │   │       └── setup.middleware.ts      ← تم التعديل
│   │   └── .env                 ← متغيرات البيئة
│   └── web/                     ← Next.js Frontend
│       └── .env.local           ← متغيرات البيئة
├── docker-compose.yml          ← تم التعديل لـ PostgreSQL
└── upload/
    └── *.md                    ← ملفات التوثيق
```

---

## 🔧 التغييرات المطلوبة في الكود

### 1. تحديث `schema.prisma` للانتقال من SQLite إلى PostgreSQL

#### الموقع: `apps/api/prisma/schema.prisma`

#### التغييرات المطلوبة:

```prisma
// ❌ قبل (SQLite):
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ✅ بعد (PostgreSQL):
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### تحويل حقول String إلى Json:

```prisma
// ❌ قبل (SQLite لا يدعم Json):
model Organization {
  settings    String   @default("{}")
  // ...
}

model User {
  permissions String   @default("[]")
  // ...
}

model Lead {
  preferredAreas String   @default("[]")
  propertyTypes  String   @default("[]")
  // ...
}

// ✅ بعد (PostgreSQL):
model Organization {
  settings    Json     @default("{}")
  // ...
}

model User {
  permissions String[] @default([])
  // ...
}

model Lead {
  preferredAreas String[] @default([])
  propertyTypes  String[]  // قائمة enum values
  // ...
}
```

#### قائمة الحقول التي يجب تحويلها:

| الجدول | الحقل | النوع الجديد |
|--------|-------|--------------|
| Organization | settings | Json |
| User | permissions | String[] |
| Lead | preferredAreas | String[] |
| Lead | propertyTypes | String[] |
| Lead | aiScoreDetails | Json |
| Client | tags | String[] |
| Activity | metadata | Json |
| AutomationRule | conditions | Json |
| AutomationRule | actions | Json |
| ETAReceipt | receiptPayload | Json |
| ETAReceipt | etaResponse | Json |
| AuditLog | oldValue | Json |
| AuditLog | newValue | Json |

---

### 2. تحديث `setup.service.ts` للعمل مع Json

#### الموقع: `apps/api/src/modules/setup/setup.service.ts`

#### التغييرات المطلوبة:

```typescript
// ❌ قبل (SQLite - يحتاج JSON.stringify):
settings: JSON.stringify({
  currency: 'EGP',
  locale: 'ar',
  timezone: 'Africa/Cairo',
}),
permissions: JSON.stringify([]),

// ✅ بعد (PostgreSQL - يدعم Json مباشرة):
settings: {
  currency: 'EGP',
  locale: 'ar',
  timezone: 'Africa/Cairo',
},
permissions: [],
```

---

### 3. تحديث `seed.ts`

#### الموقع: `apps/api/prisma/seed.ts`

#### نفس التغييرات في setup.service.ts:

```typescript
// ❌ قبل:
tags: JSON.stringify(['VIP', 'مستثمر']),
preferredAreas: JSON.stringify(['التجمع الخامس']),

// ✅ بعد:
tags: ['VIP', 'مستثمر'],
preferredAreas: ['التجمع الخامس'],
```

---

### 4. تحديث ملف `.env`

#### الموقع: `apps/api/.env`

```bash
# ❌ قبل (SQLite):
DATABASE_URL=file:../../db/dev.db

# ✅ بعد (PostgreSQL):
DATABASE_URL=postgresql://postgres:password@localhost:5432/realestate_os

# إضافة مفاتيح JWT للإنتاج:
# للتطوير: استخدم JWT_SECRET فقط
JWT_SECRET=your-256-bit-secret-key-at-least-32-characters-long

# للإنتاج: استخدم RSA keys
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

---

## 🐳 تحديث Docker Compose

#### الموقع: `docker-compose.yml`

```yaml
version: '3.9'

services:
  # ❌ قبل (SQLite فقط - لا خدمة postgres):
  
  # ✅ بعد (PostgreSQL):
  postgres:
    image: postgres:17-alpine
    container_name: realestate-postgres
    environment:
      POSTGRES_DB: realestate_os
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres123}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7.4-alpine
    container_name: realestate-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  n8n:
    image: n8nio/n8n:latest
    container_name: realestate-n8n
    ports:
      - "5678:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: ${N8N_PASSWORD:-admin123}
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: realestate_os
      DB_POSTGRESDB_USER: postgres
      DB_POSTGRESDB_PASSWORD: ${DB_PASSWORD:-postgres123}
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

---

## 📋 خطوات النشر على VPS

### الخطوة 1: تحضير الخادم

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Docker و Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# تثبيت Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت pnpm (اختياري)
npm install -g pnpm
```

### الخطوة 2: استنساخ المشروع

```bash
# إنشاء مجلد المشروع
mkdir -p /opt/realestate-os
cd /opt/realestate-os

# استنساخ من Git أو نقل الملفات
git clone <repository-url> . || scp -r ./project-files/* /opt/realestate-os/
```

### الخطوة 3: تعديل ملفات الكود

```bash
# 1. تعديل schema.prisma
cd apps/api/prisma
# غيّر provider إلى "postgresql"
# غيّر الحقول من String إلى Json/String[]

# 2. تعديل setup.service.ts
cd ../src/modules/setup
# أزل JSON.stringify() من settings و permissions

# 3. تعديل seed.ts
cd ../../../prisma
# أزل JSON.stringify() من جميع الحقول
```

### الخطوة 4: إنشاء ملف `.env`

```bash
cd /opt/realestate-os/apps/api

# إنشاء ملف .env
cat > .env << 'EOF'
# App
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://your-domain.com
SETUP_DONE=false
ORG_ID=

# Database - PostgreSQL
DATABASE_URL=postgresql://postgres:SECURE_PASSWORD@postgres:5432/realestate_os

# Redis
REDIS_URL=redis://redis:6379

# JWT (استخدم RSA في الإنتاج)
JWT_SECRET=your-256-bit-production-secret-key-change-this
# JWT_PRIVATE_KEY=...
# JWT_PUBLIC_KEY=...

# Encryption
ENCRYPTION_KEY=32-char-encryption-key-change-this

# ETA
ETA_IDENTITY_URL=https://id.eta.gov.eg
ETA_API_URL=https://api.invoicing.eta.gov.eg
ETA_CLIENT_ID=your-client-id
ETA_CLIENT_SECRET=your-client-secret

# AI (اختياري)
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=realestate-os

# WhatsApp
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
EOF
```

### الخطوة 5: تشغيل Docker Compose

```bash
cd /opt/realestate-os

# بناء وتشغيل الخدمات
docker compose up -d postgres redis

# انتظار PostgreSQL
sleep 10

# تشغيل Prisma migrations
docker compose run --rm api npx prisma migrate deploy

# تشغيل Seed (اختياري - لتخطي Setup Wizard)
docker compose run --rm api npx ts-node prisma/seed.ts

# تشغيل جميع الخدمات
docker compose up -d
```

### الخطوة 6: التحقق من العمل

```bash
# التحقق من حالة الخدمات
docker compose ps

# التحقق من صحة الباكند
curl http://localhost:3002/health

# التحقق من حالة الإعداد
curl http://localhost:3002/api/v1/setup/status

# اختبار تسجيل الدخول
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@alnil-realestate.com","password":"Admin@123"}'
```

---

## 🔐 إعدادات الأمان للإنتاج

### 1. توليد مفاتيح RSA لـ JWT

```bash
# توليد مفتاح خاص
openssl genrsa -out private.pem 2048

# توليد مفتاح عام من الخاص
openssl rsa -in private.pem -pubout -out public.pem

# تحويل إلى متغيرات بيئة
echo "JWT_PRIVATE_KEY=\"$(cat private.pem | awk '{printf "%s\\n", $0}')\""
echo "JWT_PUBLIC_KEY=\"$(cat public.pem | awk '{printf "%s\\n", $0}')\""
```

### 2. إعدادات Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/realestate.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

---

## 📊 ملخص التغييرات المُنجزة

| الملف | التغيير | الحالة |
|-------|---------|--------|
| `schema.prisma` | تغيير provider إلى postgresql | ⏳ يتطلب تعديل |
| `schema.prisma` | تحويل String إلى Json | ⏳ يتطلب تعديل |
| `setup.service.ts` | إزالة JSON.stringify | ✅ تم |
| `seed.ts` | تنظيف console.log | ✅ تم |
| `seed.ts` | إزالة JSON.stringify | ⏳ يتطلب تعديل |
| `jwt.strategy.ts` | دعم HS256 للتطوير | ✅ تم |
| `auth.module.ts` | دعم HS256 للتطوير | ✅ تم |
| `config/index.ts` | إضافة jwt.secret | ✅ تم |
| `setup.middleware.ts` | قراءة من DB بدل env | ✅ تم |
| `docker-compose.yml` | إضافة PostgreSQL | ⏳ يتطلب تعديل |

---

## 🚀 أوامر سريعة

```bash
# إعادة تشغيل الخدمات
docker compose restart

# عرض السجلات
docker compose logs -f api

# تحديث الكود
git pull
docker compose build
docker compose up -d

# نسخة احتياطية من قاعدة البيانات
docker compose exec postgres pg_dump -U postgres realestate_os > backup.sql

# استعادة النسخة الاحتياطية
cat backup.sql | docker compose exec -T postgres psql -U postgres realestate_os
```

---

## ✅ التحقق النهائي

بعد إتمام جميع الخطوات، تأكد من:

1. ✅ PostgreSQL يعمل على المنفذ 5432
2. ✅ Redis يعمل على المنفذ 6379
3. ✅ Backend يعمل على المنفذ 3002
4. ✅ Frontend يعمل على المنفذ 3001
5. ✅ `/health` يُرجع `{"status":"ok"}`
6. ✅ `/api/v1/setup/status` يُرجع `{"isSetupDone":true}`
7. ✅ تسجيل الدخول يعمل مع البيانات من Seed
8. ✅ RTL يعمل بشكل صحيح
9. ✅ جميع الشاشات متاحة على 375px (موبايل)

---

**تاريخ التحديث:** 23 مارس 2026
**الإصدار:** 1.0.0
