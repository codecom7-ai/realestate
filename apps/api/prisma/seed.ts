// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE DEMO SEED
// نظام تشغيل المكتب العقاري المصري
// يغطي كل الجداول وكل الصفحات
// ═══════════════════════════════════════════════════════════════
import {
  PrismaClient, UserRole, PropertyType, PropertyStatus, FinishingType,
  LeadStage, DealStage, POSDeviceStatus, PaymentMethod,
  CommissionStatus, DocumentStatus, ETAReceiptStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ago  = (d: number) => new Date(Date.now() - d * 86_400_000);
const from = (d: number) => new Date(Date.now() + d * 86_400_000);
// bcrypt: explicit genSalt لضمان التوافق مع bcryptjs v3.x
const hash = async (p: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(p, salt);
};

async function main() {
  const existing = await prisma.organization.findFirst();
  if (existing) {
    await prisma.organization.update({ where:{id:existing.id}, data:{isSetupDone:true} });
    console.log('✅ بيانات موجودة');
    return;
  }
  console.log('🌱 إنشاء البيانات التجريبية...');

  // ── 1. ORGANIZATION ──────────────────────────────────────────
  const org = await prisma.organization.create({ data: {
    name:'مكتب النيل للعقارات', nameAr:'مكتب النيل للعقارات',
    slug:'al-nil-real-estate', legalName:'شركة النيل للوساطة العقارية',
    commercialRegNo:'87654321', taxId:'987654321',
    brokerLicenseNo:'578-2025-001', classification:'A',
    phone:'01012345678', email:'info@alnil.com',
    address:'شارع التحرير، الدور الخامس', city:'القاهرة',
    primaryCurrency:'EGP', timezone:'Africa/Cairo', locale:'ar',
    isSetupDone:true,
    preferences:{
      workingHours:{start:'09:00',end:'18:00'},
      workingDays:['sunday','monday','tuesday','wednesday','thursday'],
      defaultCommissionRate:2.5, vatRate:14,
    },
  }});

  // ── 2. BRANCHES ──────────────────────────────────────────────
  const brCairo = await prisma.branch.create({ data:{
    organizationId:org.id, name:'المقر الرئيسي — القاهرة', nameAr:'المقر الرئيسي — القاهرة',
    etaBranchCode:'BR001', address:'شارع التحرير، الدور الخامس',
    city:'القاهرة', phone:'01012345678', isHeadquarters:true, isActive:true,
  }});
  const brAlex = await prisma.branch.create({ data:{
    organizationId:org.id, name:'فرع الإسكندرية', nameAr:'فرع الإسكندرية',
    etaBranchCode:'BR002', address:'شارع فؤاد — سيدي جابر',
    city:'الإسكندرية', phone:'01099887766', isHeadquarters:false, isActive:true,
  }});
  const brGiza = await prisma.branch.create({ data:{
    organizationId:org.id, name:'فرع الجيزة', nameAr:'فرع الجيزة',
    etaBranchCode:'BR003', address:'شارع مصدق — الدقي',
    city:'الجيزة', phone:'01055443322', isHeadquarters:false, isActive:true,
  }});

  // ── 3. USERS ─────────────────────────────────────────────────
  const owner = await prisma.user.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    email:'owner@demo.com', phone:'01012345678',
    passwordHash:await hash('Demo@123456'),
    firstName:'أحمد', lastName:'النيل', firstNameAr:'أحمد', lastNameAr:'النيل',
    role:UserRole.OWNER, permissions:['*'],
    isActive:true, isEmailVerified:true, lastLoginAt:ago(0),
  }});
  const gm = await prisma.user.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    email:'gm@demo.com', phone:'01123456789',
    passwordHash:await hash('Demo@123456'),
    firstName:'محمود', lastName:'حسن', firstNameAr:'محمود', lastNameAr:'حسن',
    role:UserRole.GENERAL_MANAGER,
    permissions:['leads:read','leads:write','clients:read','clients:write','properties:read','properties:write','deals:read','deals:write','payments:read','commissions:read','commissions:approve','users:read','reports:read','audit:read'],
    isActive:true, isEmailVerified:true, lastLoginAt:ago(1),
  }});
  const broker1 = await prisma.user.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    email:'broker1@demo.com', phone:'01234567890',
    passwordHash:await hash('Demo@123456'),
    firstName:'سارة', lastName:'الوكيلة', firstNameAr:'سارة', lastNameAr:'الوكيلة',
    role:UserRole.BROKER,
    permissions:['leads:read','leads:write','clients:read','clients:write','properties:read','deals:read','deals:write','payments:read'],
    brokerLicenseNo:'LIC-001-2025', brokerLicenseExp:from(365), brokerClassification:'A',
    isActive:true, isEmailVerified:true, lastLoginAt:ago(0),
  }});
  const broker2 = await prisma.user.create({ data:{
    organizationId:org.id, branchId:brAlex.id,
    email:'broker2@demo.com', phone:'01345678901',
    passwordHash:await hash('Demo@123456'),
    firstName:'عمر', lastName:'السمسار', firstNameAr:'عمر', lastNameAr:'السمسار',
    role:UserRole.BROKER,
    permissions:['leads:read','leads:write','clients:read','clients:write','properties:read','deals:read','deals:write'],
    brokerLicenseNo:'LIC-002-2025', brokerLicenseExp:from(35), brokerClassification:'B',
    isActive:true, isEmailVerified:true, lastLoginAt:ago(3),
  }});
  const accountant = await prisma.user.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    email:'accountant@demo.com', phone:'01456789012',
    passwordHash:await hash('Demo@123456'),
    firstName:'نادية', lastName:'المحاسبة', firstNameAr:'نادية', lastNameAr:'المحاسبة',
    role:UserRole.ACCOUNTANT,
    permissions:['payments:read','payments:write','commissions:read','commissions:approve','reports:read','eta:read','eta:submit'],
    isActive:true, isEmailVerified:true, lastLoginAt:ago(1),
  }});
  const salesMgr = await prisma.user.create({ data:{
    organizationId:org.id, branchId:brGiza.id,
    email:'salesmgr@demo.com', phone:'01567890123',
    passwordHash:await hash('Demo@123456'),
    firstName:'ياسمين', lastName:'مدير المبيعات', firstNameAr:'ياسمين', lastNameAr:'مدير المبيعات',
    role:UserRole.SALES_MANAGER,
    permissions:['leads:read','leads:write','leads:assign','clients:read','clients:write','properties:read','deals:read','deals:write','reports:read'],
    brokerLicenseNo:'LIC-003-2025', brokerLicenseExp:from(200),
    isActive:true, isEmailVerified:true, lastLoginAt:ago(2),
  }});

  await prisma.branch.update({ where:{id:brCairo.id}, data:{managerId:gm.id} });
  await prisma.branch.update({ where:{id:brAlex.id},  data:{managerId:broker2.id} });
  await prisma.branch.update({ where:{id:brGiza.id},  data:{managerId:salesMgr.id} });

  // ── 4. POS DEVICE ────────────────────────────────────────────
  const posDevice = await prisma.posDevice.create({ data:{
    organizationId:org.id, branchId:brCairo.id, assignedToUserId:accountant.id,
    posSerial:'POS-DEMO-2025-001', posOsVersion:'Android 14',
    posModelFramework:'1.0', deviceName:'جهاز الكاشير الرئيسي',
    deviceModel:'Samsung Galaxy Tab S9', status:POSDeviceStatus.ACTIVE, lastSeenAt:ago(0),
  }});

  // ── 5. DEVELOPERS & PROJECTS ─────────────────────────────────
  const devTalaat = await prisma.developer.create({ data:{
    organizationId:org.id, name:'طلعت مصطفى', nameAr:'مجموعة طلعت مصطفى',
    website:'https://www.talaat-moustafa.com', phone:'16666', contactPerson:'قسم المبيعات',
    commissionTerms:{rate:2.5,paymentTerms:'30 يوم من التوقيع'}, isActive:true,
  }});
  const devOrascom = await prisma.developer.create({ data:{
    organizationId:org.id, name:'أوراسكوم للتطوير', nameAr:'أوراسكوم للتطوير العمراني',
    website:'https://orascomdh.com', phone:'19001', contactPerson:'أحمد صلاح — مدير المبيعات',
    commissionTerms:{rate:3.0,paymentTerms:'45 يوم'}, isActive:true,
  }});
  const devMadinet = await prisma.developer.create({ data:{
    organizationId:org.id, name:'مدينة مصر', nameAr:'مدينة مصر للتطوير العمراني',
    phone:'16110', contactPerson:'قسم المبيعات', isActive:true,
  }});
  const projMadinaty = await prisma.project.create({ data:{
    organizationId:org.id, developerId:devTalaat.id,
    name:'مدينتي', nameAr:'مدينتي — القاهرة الجديدة',
    location:'الكيلو 23، القاهرة الجديدة', city:'القاهرة',
    description:'مدينة متكاملة على مساحة 8000 فدان', deliveryDate:from(365*2), isActive:true,
  }});
  const projOWest = await prisma.project.create({ data:{
    organizationId:org.id, developerId:devOrascom.id,
    name:'O West', nameAr:'أو ويست — 6 أكتوبر',
    location:'6 أكتوبر، الجيزة', city:'الجيزة',
    description:'كمباوند سكني متكامل', deliveryDate:from(365), isActive:true,
  }});
  const projNorth = await prisma.project.create({ data:{
    organizationId:org.id, developerId:devMadinet.id,
    name:'مدينة مصر', nameAr:'مدينة مصر — التجمع الخامس',
    location:'التجمع الخامس، القاهرة الجديدة', city:'القاهرة', isActive:true,
  }});

  // ── 6. PROPERTIES (20 وحدة) ──────────────────────────────────
  type PropInput = {
    title:string; city:string; district:string; type:PropertyType;
    finish?:FinishingType; status:PropertyStatus; area:number;
    beds?:number; baths?:number; parking?:number; price:number; rate:number;
    floor?:number; unit?:string; br:string; proj?:string; dev?:string; offPlan?:boolean;
  };
  const propInputs:PropInput[] = [
    {title:'شقة 3 غرف — التجمع الخامس',city:'القاهرة',district:'التجمع الخامس',type:PropertyType.APARTMENT,finish:FinishingType.ULTRA_LUXURY,status:PropertyStatus.AVAILABLE,area:185,beds:3,baths:2,parking:1,price:3_800_000,rate:2.5,floor:5,unit:'A501',br:brCairo.id,proj:projNorth.id,dev:devMadinet.id},
    {title:'شقة 2 غرف — مدينتي',city:'القاهرة',district:'مدينتي',type:PropertyType.APARTMENT,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:130,beds:2,baths:2,parking:1,price:2_600_000,rate:2.5,floor:3,unit:'B302',br:brCairo.id,proj:projMadinaty.id,dev:devTalaat.id},
    {title:'فيلا توين هاوس — الشيخ زايد',city:'الجيزة',district:'الشيخ زايد',type:PropertyType.VILLA,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:380,beds:5,baths:4,parking:2,price:8_500_000,rate:2.0,br:brGiza.id},
    {title:'مكتب تجاري — مدينة نصر',city:'القاهرة',district:'مدينة نصر',type:PropertyType.OFFICE,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:120,baths:1,price:2_200_000,rate:3.0,floor:8,unit:'801',br:brCairo.id},
    {title:'دوبلكس — المعادي الجديدة',city:'القاهرة',district:'المعادي',type:PropertyType.DUPLEX,finish:FinishingType.SEMI_FINISHED,status:PropertyStatus.AVAILABLE,area:220,beds:4,baths:3,parking:1,price:4_200_000,rate:2.5,br:brCairo.id},
    {title:'شقة على الخارطة — O West',city:'الجيزة',district:'6 أكتوبر',type:PropertyType.APARTMENT,finish:FinishingType.CORE_SHELL,status:PropertyStatus.AVAILABLE,area:110,beds:2,baths:2,price:1_950_000,rate:2.5,br:brGiza.id,proj:projOWest.id,dev:devOrascom.id,offPlan:true},
    {title:'شقة ساحلية — سيدي جابر',city:'الإسكندرية',district:'سيدي جابر',type:PropertyType.APARTMENT,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:145,beds:3,baths:2,price:2_800_000,rate:2.5,floor:3,br:brAlex.id},
    {title:'محل تجاري — مدينتي',city:'القاهرة',district:'مدينتي',type:PropertyType.SHOP,finish:FinishingType.CORE_SHELL,status:PropertyStatus.AVAILABLE,area:65,price:1_800_000,rate:3.0,br:brCairo.id},
    {title:'استوديو — وسط البلد',city:'القاهرة',district:'وسط البلد',type:PropertyType.STUDIO,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:55,baths:1,price:850_000,rate:4.0,floor:2,br:brCairo.id},
    {title:'شقة 4 غرف — زهراء المعادي',city:'القاهرة',district:'زهراء المعادي',type:PropertyType.APARTMENT,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:210,beds:4,baths:3,parking:1,price:3_200_000,rate:2.5,br:brCairo.id},
    {title:'فيلا منفصلة — مدينة الرحاب',city:'القاهرة',district:'الرحاب',type:PropertyType.VILLA,finish:FinishingType.ULTRA_LUXURY,status:PropertyStatus.AVAILABLE,area:450,beds:6,baths:5,parking:3,price:12_000_000,rate:2.0,br:brCairo.id},
    {title:'شقة 3 غرف — سموحة الإسكندرية',city:'الإسكندرية',district:'سموحة',type:PropertyType.APARTMENT,finish:FinishingType.SEMI_FINISHED,status:PropertyStatus.AVAILABLE,area:160,beds:3,baths:2,price:1_900_000,rate:2.5,br:brAlex.id},
    {title:'وحدة تجارية — مول 6 أكتوبر',city:'الجيزة',district:'6 أكتوبر',type:PropertyType.SHOP,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:90,price:2_400_000,rate:3.0,br:brGiza.id},
    {title:'شقة 2 غرف — الدقي',city:'الجيزة',district:'الدقي',type:PropertyType.APARTMENT,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.AVAILABLE,area:100,beds:2,baths:1,price:1_750_000,rate:2.5,floor:4,br:brGiza.id},
    {title:'أرض سكنية — الشروق',city:'القاهرة',district:'مدينة الشروق',type:PropertyType.LAND,status:PropertyStatus.AVAILABLE,area:600,price:5_000_000,rate:2.0,br:brCairo.id},
    // غير متاحة
    {title:'بنتهاوس — القاهرة الجديدة',city:'القاهرة',district:'القاهرة الجديدة',type:PropertyType.PENTHOUSE,finish:FinishingType.ULTRA_LUXURY,status:PropertyStatus.RESERVED_CONFIRMED,area:420,beds:6,baths:5,parking:3,price:15_000_000,rate:2.0,br:brCairo.id},
    {title:'شقة 4 غرف — مصر الجديدة',city:'القاهرة',district:'مصر الجديدة',type:PropertyType.APARTMENT,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.SOLD,area:240,beds:4,baths:3,price:5_500_000,rate:2.0,br:brCairo.id},
    {title:'استوديو إيجار — وسط البلد',city:'القاهرة',district:'وسط البلد',type:PropertyType.STUDIO,finish:FinishingType.FULLY_FINISHED,status:PropertyStatus.RENTED,area:55,baths:1,price:8_000,rate:5.0,br:brCairo.id},
    {title:'مستودع — مدينة العبور',city:'القاهرة',district:'العبور',type:PropertyType.WAREHOUSE,finish:FinishingType.CORE_SHELL,status:PropertyStatus.AVAILABLE,area:500,price:3_500_000,rate:2.5,br:brCairo.id},
    {title:'وحدة كمباوند — O West',city:'الجيزة',district:'6 أكتوبر',type:PropertyType.COMPOUND_UNIT,finish:FinishingType.SEMI_FINISHED,status:PropertyStatus.AVAILABLE,area:175,beds:3,baths:2,parking:1,price:2_800_000,rate:2.5,br:brGiza.id,proj:projOWest.id,dev:devOrascom.id,offPlan:true},
  ];

  const props:any[] = [];
  for (const p of propInputs) {
    const prop = await prisma.property.create({ data:{
      organizationId:org.id, branchId:p.br,
      projectId:p.proj??null, developerId:p.dev??null,
      title:p.title, titleAr:p.title,
      propertyType:p.type, finishingType:p.finish??null,
      status:p.status, city:p.city, district:p.district,
      address:`${p.district}، ${p.city}`,
      floor:p.floor??null, unitNumber:p.unit??null,
      areaM2:p.area, bedrooms:p.beds??null, bathrooms:p.baths??null, parking:p.parking??null,
      askingPrice:p.price, currency:'EGP', commissionRate:p.rate,
      isListed:p.status===PropertyStatus.AVAILABLE, isOffPlan:p.offPlan??false,
    }});
    props.push(prop);
  }

  // صور العقارات
  const imgs = [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
  ];
  for (let i = 0; i < 15; i++) {
    await prisma.propertyImage.create({ data:{
      propertyId:props[i].id, url:imgs[i%imgs.length],
      key:`props/${props[i].id}/main.jpg`, order:0, isPrimary:true,
    }});
    if (i < 8) await prisma.propertyImage.create({ data:{
      propertyId:props[i].id, url:imgs[(i+2)%imgs.length],
      key:`props/${props[i].id}/2.jpg`, order:1, isPrimary:false,
    }});
  }

  await prisma.propertyPriceHistory.createMany({ data:[
    {propertyId:props[0].id, price:3_600_000, changedById:gm.id, reason:'مراجعة دورية', changedAt:ago(30)},
    {propertyId:props[0].id, price:3_800_000, changedById:owner.id, reason:'تحديث السعر', changedAt:ago(10)},
    {propertyId:props[2].id, price:8_200_000, changedById:owner.id, reason:'ارتفاع المنطقة', changedAt:ago(20)},
  ]});

  // ── 7. CLIENTS (12 عميل) ─────────────────────────────────────
  type ClientInput = {fn:string;ln:string;phone:string;email?:string;src:string;vip:boolean;note?:string;comp?:string;tax?:string};
  const cData:ClientInput[] = [
    {fn:'محمد',  ln:'أبو العلا',    phone:'+201001234567',email:'m.abouela@gmail.com', src:'website',   vip:true, note:'عميل VIP — مستثمر متكرر'},
    {fn:'نورا',  ln:'السيد',        phone:'+201112345678',email:'nora.s@hotmail.com',  src:'whatsapp',  vip:false,note:'شقة 3 غرف بالتجمع'},
    {fn:'خالد',  ln:'منصور',        phone:'+201223456789',email:'k.mansour@yahoo.com', src:'referral',  vip:false,note:'وحدات تجارية'},
    {fn:'شركة الأهلي',ln:'للاستثمار',phone:'+201334567890',email:'invest@ahly.com',src:'direct',vip:true,comp:'شركة الأهلي للاستثمار العقاري',tax:'111222333'},
    {fn:'هاني',  ln:'إبراهيم',      phone:'+201445678901',                            src:'facebook',  vip:false},
    {fn:'ليلى',  ln:'حسن',          phone:'+201556789012',email:'layla.h@gmail.com',  src:'instagram', vip:false,note:'إيجار مدينة نصر'},
    {fn:'طارق',  ln:'الزيات',       phone:'+201667890123',                            src:'whatsapp',  vip:false},
    {fn:'منى',   ln:'الشريف',       phone:'+201778901234',email:'mona.s@work.com',    src:'website',   vip:false},
    {fn:'كريم',  ln:'عبد الله',     phone:'+201889012345',email:'k.ab@email.com',     src:'referral',  vip:true, note:'محال من عميل قديم'},
    {fn:'رانيا', ln:'فؤاد',         phone:'+201990123456',email:'rania.f@email.com',  src:'website',   vip:false,note:'فيلا الشيخ زايد'},
    {fn:'ياسر',  ln:'الحلواني',     phone:'+201011234567',                            src:'facebook',  vip:false},
    {fn:'دينا',  ln:'المصري',       phone:'+201122345678',email:'dina.m@email.com',   src:'instagram', vip:false,note:'شقة ساحلية إسكندرية'},
  ];
  const clients:any[] = [];
  for (const c of cData) {
    clients.push(await prisma.client.create({ data:{
      organizationId:org.id,
      firstName:c.fn, lastName:c.ln, firstNameAr:c.fn, lastNameAr:c.ln,
      phone:c.phone, email:c.email??undefined, nationality:'EG',
      clientType:c.comp?'company':'individual',
      companyName:c.comp??undefined, taxId:c.tax??undefined,
      source:c.src, isVip:c.vip, notes:c.note??undefined,
    }}));
  }

  // ── 8. LEADS (12 lead — كل مرحلة) ───────────────────────────
  type LeadInput = {ci:number;ai:string;stage:LeadStage;src:string;budget:number;areas:string[];types:PropertyType[];minB?:number;maxB?:number;score:number;close?:Date;note?:string};
  const lData:LeadInput[] = [
    {ci:0,ai:broker1.id,stage:LeadStage.NEGOTIATING,src:'website',budget:9_000_000,areas:['الشيخ زايد','التجمع الخامس'],types:[PropertyType.VILLA,PropertyType.PENTHOUSE],minB:4,maxB:6,score:92,close:from(30),note:'فيلا أو بنتهاوس فاخر'},
    {ci:1,ai:broker1.id,stage:LeadStage.VIEWING_SCHEDULED,src:'whatsapp',budget:3_800_000,areas:['التجمع الخامس'],types:[PropertyType.APARTMENT],minB:3,maxB:3,score:78,close:from(45),note:'معاينة مجدولة الجمعة'},
    {ci:2,ai:broker2.id,stage:LeadStage.QUALIFIED,src:'referral',budget:2_500_000,areas:['مدينة نصر','المعادي'],types:[PropertyType.OFFICE,PropertyType.SHOP],score:65,close:from(60),note:'وحدات تجارية'},
    {ci:3,ai:salesMgr.id,stage:LeadStage.PROPERTY_PRESENTED,src:'direct',budget:20_000_000,areas:['القاهرة الجديدة'],types:[PropertyType.APARTMENT,PropertyType.VILLA],score:88,close:from(20),note:'شركة — وحدات متعددة'},
    {ci:4,ai:broker1.id,stage:LeadStage.NEW,src:'facebook',budget:1_800_000,areas:['6 أكتوبر','الشيخ زايد'],types:[PropertyType.APARTMENT],minB:2,maxB:3,score:45,close:from(90)},
    {ci:5,ai:broker2.id,stage:LeadStage.CONTACTED,src:'instagram',budget:12_000,areas:['مدينة نصر','مصر الجديدة'],types:[PropertyType.APARTMENT,PropertyType.STUDIO],score:55,note:'إيجار'},
    {ci:6,ai:broker1.id,stage:LeadStage.CLOSED_WON,src:'whatsapp',budget:5_500_000,areas:['التجمع الخامس'],types:[PropertyType.APARTMENT],score:95,note:'اشترى شقة مصر الجديدة'},
    {ci:7,ai:salesMgr.id,stage:LeadStage.VIEWED,src:'website',budget:4_500_000,areas:['التجمع الخامس','القاهرة الجديدة'],types:[PropertyType.APARTMENT,PropertyType.DUPLEX],minB:4,score:72,close:from(40)},
    {ci:8,ai:broker1.id,stage:LeadStage.CONTRACT_SENT,src:'referral',budget:2_200_000,areas:['المعادي'],types:[PropertyType.APARTMENT],minB:2,maxB:3,score:83,close:from(15),note:'محال — جاد جداً'},
    {ci:9,ai:broker2.id,stage:LeadStage.NEGOTIATING,src:'website',budget:8_000_000,areas:['الشيخ زايد'],types:[PropertyType.VILLA],minB:4,score:80,close:from(25),note:'فيلا الشيخ زايد'},
    {ci:10,ai:salesMgr.id,stage:LeadStage.CLOSED_LOST,src:'facebook',budget:1_500_000,areas:['6 أكتوبر'],types:[PropertyType.APARTMENT],score:30,note:'اختار مكتب منافس'},
    {ci:11,ai:broker2.id,stage:LeadStage.VIEWING_SCHEDULED,src:'instagram',budget:2_500_000,areas:['الإسكندرية'],types:[PropertyType.APARTMENT],minB:3,score:68,close:from(50),note:'شقة ساحلية'},
  ];
  const leads:any[] = [];
  for (const l of lData) {
    leads.push(await prisma.lead.create({ data:{
      organizationId:org.id, clientId:clients[l.ci].id, assignedToId:l.ai,
      stage:l.stage, source:l.src, budget:l.budget, budgetCurrency:'EGP',
      preferredAreas:l.areas, propertyTypes:l.types,
      minBedrooms:l.minB??null, maxBedrooms:l.maxB??null,
      notes:l.note??null, aiScore:l.score,
      aiScoreDetails:{tier:l.score>=80?'hot':l.score>=60?'warm':'cold',reasons:['ميزانية مناسبة','تفاعل منتظم']},
      expectedCloseDate:l.close??null,
      lostReason:l.stage===LeadStage.CLOSED_LOST?'اختار مكتب منافس':null,
      createdAt:ago(Math.floor(Math.random()*60+5)),
    }}));
  }

  // ── 9. DEALS (6 صفقات) ───────────────────────────────────────
  const dealClosed = await prisma.deal.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    leadId:leads[6].id, clientId:clients[6].id, propertyId:props[16].id,
    assignedBrokerId:broker1.id,
    stage:DealStage.CLOSED, dealType:'sale', agreedPrice:5_200_000, currency:'EGP',
    notes:'صفقة بيع ناجحة — شقة 4 غرف مصر الجديدة',
    closedAt:ago(30), createdAt:ago(75),
  }});
  const dealActive = await prisma.deal.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    leadId:leads[0].id, clientId:clients[0].id, propertyId:props[15].id,
    assignedBrokerId:broker1.id,
    stage:DealStage.PAYMENT_ACTIVE, dealType:'sale', agreedPrice:14_500_000, currency:'EGP',
    notes:'بنتهاوس VIP — جدول أقساط 4 سنوات', createdAt:ago(40),
  }});
  await prisma.propertyLock.create({ data:{
    organizationId:org.id, propertyId:props[15].id,
    lockedByDealId:dealActive.id, lockType:'confirmed', lockedAt:ago(40),
  }});
  const dealRent = await prisma.deal.create({ data:{
    organizationId:org.id, branchId:brAlex.id,
    clientId:clients[5].id, propertyId:props[17].id,
    assignedBrokerId:broker2.id,
    stage:DealStage.CONTRACT_SIGNED, dealType:'rent', agreedPrice:8_000, currency:'EGP',
    notes:'عقد إيجار سنوي', createdAt:ago(20),
  }});
  const dealNego = await prisma.deal.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    leadId:leads[1].id, clientId:clients[1].id, propertyId:props[0].id,
    assignedBrokerId:broker1.id,
    stage:DealStage.NEGOTIATION, dealType:'sale', agreedPrice:3_700_000, currency:'EGP',
    createdAt:ago(12),
  }});
  const dealReserv = await prisma.deal.create({ data:{
    organizationId:org.id, branchId:brGiza.id,
    leadId:leads[9].id, clientId:clients[9].id, propertyId:props[2].id,
    assignedBrokerId:salesMgr.id,
    stage:DealStage.RESERVATION, dealType:'sale', agreedPrice:8_200_000, currency:'EGP',
    createdAt:ago(5),
  }});
  await prisma.propertyLock.create({ data:{
    organizationId:org.id, propertyId:props[2].id,
    lockedByDealId:dealReserv.id, lockType:'temporary',
    lockedAt:ago(5), expiresAt:from(43),
  }});
  const dealContract = await prisma.deal.create({ data:{
    organizationId:org.id, branchId:brCairo.id,
    leadId:leads[7].id, clientId:clients[7].id, propertyId:props[4].id,
    assignedBrokerId:salesMgr.id,
    stage:DealStage.CONTRACT_PREPARATION, dealType:'sale', agreedPrice:4_100_000, currency:'EGP',
    createdAt:ago(8),
  }});

  // ── 10. RESERVATIONS ─────────────────────────────────────────
  await prisma.reservation.create({ data:{
    dealId:dealActive.id, organizationId:org.id,
    depositAmount:500_000, depositMethod:PaymentMethod.BANK_TRANSFER,
    depositPaidAt:ago(38), expiresAt:from(60), notes:'عربون بنتهاوس القاهرة الجديدة',
  }});
  await prisma.reservation.create({ data:{
    dealId:dealReserv.id, organizationId:org.id,
    depositAmount:200_000, depositMethod:PaymentMethod.CHECK,
    depositPaidAt:ago(5), expiresAt:from(43), notes:'عربون مبدئي فيلا الشيخ زايد',
  }});

  // ── 11. CONTRACTS ────────────────────────────────────────────
  await prisma.contract.create({ data:{
    dealId:dealClosed.id, organizationId:org.id, contractNumber:'CNT-2025-001',
    contractDate:ago(35), signedByClient:true, signedByOffice:true,
    signedAt:ago(34), notes:'عقد بيع رسمي موثق بالشهر العقاري',
  }});
  await prisma.contract.create({ data:{
    dealId:dealRent.id, organizationId:org.id, contractNumber:'CNT-2025-002',
    contractDate:ago(18), signedByClient:true, signedByOffice:true,
    signedAt:ago(17), notes:'عقد إيجار سنوي',
  }});
  await prisma.contract.create({ data:{
    dealId:dealContract.id, organizationId:org.id, contractNumber:'CNT-2025-003',
    contractDate:ago(2), signedByClient:false, signedByOffice:false,
    notes:'انتظار توقيع الطرفين',
  }});

  // ── 12. PAYMENT SCHEDULES + INSTALLMENTS + PAYMENTS ─────────
  const sched1 = await prisma.paymentSchedule.create({ data:{
    dealId:dealActive.id, organizationId:org.id,
    totalAmount:14_500_000, currency:'EGP', notes:'جدول 4 سنوات — 8 دفعات',
  }});
  const instDefs = [
    {n:1,t:'deposit',      am:500_000,  d:ago(38),   s:'paid'},
    {n:2,t:'first_payment',am:2_000_000,d:ago(34),   s:'paid'},
    {n:3,t:'installment',  am:1_500_000,d:ago(4),    s:'paid'},
    {n:4,t:'installment',  am:1_500_000,d:from(90),  s:'pending'},
    {n:5,t:'installment',  am:1_500_000,d:from(180), s:'pending'},
    {n:6,t:'installment',  am:1_500_000,d:from(270), s:'pending'},
    {n:7,t:'installment',  am:2_500_000,d:from(365), s:'pending'},
    {n:8,t:'handover',     am:3_500_000,d:from(548), s:'pending'},
  ];
  const insts:any[] = [];
  for (const i of instDefs) {
    insts.push(await prisma.installment.create({ data:{
      paymentScheduleId:sched1.id, organizationId:org.id,
      installmentNumber:i.n, type:i.t, amount:i.am, currency:'EGP', dueDate:i.d, status:i.s,
    }}));
  }

  const sched2 = await prisma.paymentSchedule.create({ data:{
    dealId:dealClosed.id, organizationId:org.id, totalAmount:5_200_000, currency:'EGP',
  }});
  const instClosed = await prisma.installment.create({ data:{
    paymentScheduleId:sched2.id, organizationId:org.id,
    installmentNumber:1, type:'first_payment', amount:5_200_000,
    currency:'EGP', dueDate:ago(30), status:'paid',
  }});

  const sched3 = await prisma.paymentSchedule.create({ data:{
    dealId:dealRent.id, organizationId:org.id, totalAmount:96_000, currency:'EGP',
    notes:'12 قسط شهري',
  }});
  for (let m=0;m<12;m++) {
    await prisma.installment.create({ data:{
      paymentScheduleId:sched3.id, organizationId:org.id,
      installmentNumber:m+1, type:'installment', amount:8_000, currency:'EGP',
      dueDate:m<2?ago((2-m)*30):from((m-2)*30), status:m<2?'paid':'pending',
    }});
  }

  const pay1 = await prisma.payment.create({ data:{
    organizationId:org.id, installmentId:insts[0].id, dealId:dealActive.id,
    amount:500_000, currency:'EGP', method:PaymentMethod.BANK_TRANSFER,
    status:'confirmed', bankName:'البنك الأهلي المصري', transactionRef:'TXN-2025-001', paidAt:ago(38),
  }});
  const pay2 = await prisma.payment.create({ data:{
    organizationId:org.id, installmentId:insts[1].id, dealId:dealActive.id,
    amount:2_000_000, currency:'EGP', method:PaymentMethod.CHECK,
    status:'confirmed', checkNumber:'CHK-00125', bankName:'بنك مصر', paidAt:ago(34),
  }});
  const pay3 = await prisma.payment.create({ data:{
    organizationId:org.id, installmentId:insts[2].id, dealId:dealActive.id,
    amount:1_500_000, currency:'EGP', method:PaymentMethod.BANK_TRANSFER,
    status:'confirmed', bankName:'بنك QNB', transactionRef:'TXN-2025-003', paidAt:ago(3),
  }});
  await prisma.payment.create({ data:{
    organizationId:org.id, installmentId:instClosed.id, dealId:dealClosed.id,
    amount:5_200_000, currency:'EGP', method:PaymentMethod.BANK_TRANSFER,
    status:'confirmed', bankName:'البنك الأهلي المصري', transactionRef:'TXN-CLOSE-001', paidAt:ago(30),
  }});
  await prisma.payment.create({ data:{
    organizationId:org.id, dealId:dealNego.id,
    amount:100_000, currency:'EGP', method:PaymentMethod.CASH,
    status:'overdue', dueDate:ago(15), notes:'دفعة حجز متأخرة',
  }});

  // ── 13. COMMISSIONS ──────────────────────────────────────────
  await prisma.commission.create({ data:{
    organizationId:org.id, dealId:dealClosed.id, userId:broker1.id,
    commissionType:'broker', baseAmount:130_000, percentage:60,
    amount:78_000, vatAmount:10_920, totalAmount:88_920, currency:'EGP',
    status:CommissionStatus.PAID, isLocked:true, lockedAt:ago(28), lockedById:owner.id,
    settledAt:ago(25), paidAt:ago(25), notes:'عمولة الوسيط — صفقة مصر الجديدة',
  }});
  await prisma.commission.create({ data:{
    organizationId:org.id, dealId:dealClosed.id,
    commissionType:'company', baseAmount:130_000, percentage:40,
    amount:52_000, vatAmount:7_280, totalAmount:59_280, currency:'EGP',
    status:CommissionStatus.SETTLED, isLocked:true, lockedAt:ago(28), lockedById:owner.id,
    settledAt:ago(25), notes:'حصة الشركة',
  }});
  await prisma.commission.create({ data:{
    organizationId:org.id, dealId:dealActive.id, userId:broker1.id,
    commissionType:'broker', baseAmount:362_500, percentage:60,
    amount:217_500, vatAmount:30_450, totalAmount:247_950, currency:'EGP',
    status:CommissionStatus.CALCULATED, isLocked:false, notes:'تنتظر موافقة المدير',
  }});
  await prisma.commission.create({ data:{
    organizationId:org.id, dealId:dealActive.id,
    commissionType:'company', baseAmount:362_500, percentage:40,
    amount:145_000, vatAmount:20_300, totalAmount:165_300, currency:'EGP',
    status:CommissionStatus.CALCULATED, isLocked:false,
  }});
  await prisma.commission.create({ data:{
    organizationId:org.id, dealId:dealRent.id, userId:broker2.id,
    commissionType:'broker', baseAmount:8_000, percentage:60,
    amount:4_800, vatAmount:672, totalAmount:5_472, currency:'EGP',
    status:CommissionStatus.APPROVED, isLocked:true, lockedAt:ago(16), lockedById:gm.id,
    notes:'عمولة إيجار شهر كامل',
  }});
  await prisma.commission.create({ data:{
    organizationId:org.id, dealId:dealNego.id, userId:broker1.id,
    commissionType:'broker', baseAmount:92_500, percentage:60,
    amount:55_500, vatAmount:7_770, totalAmount:63_270, currency:'EGP',
    status:CommissionStatus.DISPUTED, isLocked:false, notes:'نزاع على نسبة العمولة',
  }});

  // ── 14. ETA RECEIPTS ─────────────────────────────────────────
  const etaPayload1 = JSON.stringify({
    header:{dateTimeIssued:ago(38).toISOString(),receiptNumber:'REC-2025-001',uuid:'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd'},
    documentType:{receiptType:'P',typeVersion:'1.2'},
    seller:{rin:'987654321',companyTradeName:'مكتب النيل للعقارات',branchCode:'BR001',deviceSerialNumber:'POS-DEMO-2025-001',activityCode:'6820'},
    buyer:{type:'B',id:'111222333',name:'شركة الأهلي للاستثمار'},
    itemData:[{internalCode:'COM-001',description:'عمولة وساطة عقارية',taxType:'T1',taxRate:14,quantity:1,unitPrice:500_000,netAmount:500_000,taxAmount:70_000,totalAmount:570_000}],
    totalSales:500_000,netAmount:500_000,totalAmount:570_000,
  });
  await prisma.eTAReceipt.create({ data:{
    organizationId:org.id, paymentId:pay1.id, posDeviceId:posDevice.id,
    submissionUUID:'DEMO-SUB-UUID-2025-001',
    documentUUID:'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
    longId:'DEMO-LONG-ID-2025-001', internalId:'REC-2025-001',
    status:ETAReceiptStatus.VALID, receiptType:'professional', documentVersion:'1.2',
    receiptPayload:etaPayload1,
    qrCodeData:'https://preprod.invoicing.eta.gov.eg/receipts/search/a1b2c3d4/share/2025-01-01T10:00Z#Total:570000.000,IssuerRIN:987654321',
    submittedAt:ago(38), processedAt:ago(38),
  }});
  const etaPayload2 = JSON.stringify({
    header:{dateTimeIssued:ago(3).toISOString(),receiptNumber:'REC-2025-002',uuid:'b2c3d4e5f6789012345678901234567890123456789012345678901234abcdef'},
    documentType:{receiptType:'P',typeVersion:'1.2'},
    seller:{rin:'987654321',companyTradeName:'مكتب النيل للعقارات'},
    buyer:{type:'P'},
    itemData:[{description:'عمولة وساطة',quantity:1,unitPrice:1_500_000,taxRate:14,netAmount:1_500_000,taxAmount:210_000,totalAmount:1_710_000}],
    totalSales:1_500_000,totalAmount:1_710_000,
  });
  await prisma.eTAReceipt.create({ data:{
    organizationId:org.id, paymentId:pay3.id, posDeviceId:posDevice.id,
    internalId:'REC-2025-002', status:ETAReceiptStatus.PENDING,
    receiptType:'professional', documentVersion:'1.2',
    receiptPayload:etaPayload2,
    previousUUID:'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
  }});

  // ── 15. VIEWINGS ─────────────────────────────────────────────
  await prisma.viewing.create({ data:{
    organizationId:org.id, leadId:leads[1].id, propertyId:props[0].id,
    scheduledAt:from(2), status:'scheduled', notes:'مع السيدة نورا — الجمعة 3 م',
  }});
  await prisma.viewing.create({ data:{
    organizationId:org.id, leadId:leads[0].id, propertyId:props[15].id,
    scheduledAt:ago(35), conductedAt:ago(35),
    duration:60, rating:5, feedback:'معجب جداً — قدّم عرضاً فورياً', status:'completed',
  }});
  await prisma.viewing.create({ data:{
    organizationId:org.id, leadId:leads[7].id, propertyId:props[4].id,
    scheduledAt:from(5), status:'scheduled', notes:'دوبلكس المعادي',
  }});
  await prisma.viewing.create({ data:{
    organizationId:org.id, leadId:leads[11].id, propertyId:props[6].id,
    scheduledAt:from(7), status:'scheduled', notes:'شقة سيدي جابر',
  }});
  await prisma.viewing.create({ data:{
    organizationId:org.id, leadId:leads[9].id, propertyId:props[2].id,
    scheduledAt:ago(6), conductedAt:ago(6),
    duration:90, rating:4, feedback:'معجبة لكن تريد التفكير', status:'completed',
  }});
  await prisma.viewing.create({ data:{
    organizationId:org.id, leadId:leads[4].id, propertyId:props[5].id,
    scheduledAt:ago(15), status:'cancelled', notes:'اعتذر في آخر لحظة',
  }});

  // ── 16. CONVERSATIONS + MESSAGES ─────────────────────────────
  const conv1 = await prisma.conversation.create({ data:{
    organizationId:org.id, clientId:clients[0].id, leadId:leads[0].id,
    assignedToId:broker1.id, channel:'whatsapp', externalId:clients[0].phone,
    status:'active', lastMessageAt:ago(0), unreadCount:2,
  }});
  for (const m of [
    {dir:'inbound', c:'السلام عليكم، أنا مهتم بالبنتهاوس في التجمع',d:5},
    {dir:'outbound',c:'وعليكم السلام يا مهندس محمد! أهلاً بيك. البنتهاوس بحالة ممتازة وإطلالة رائعة، ممكن نرتب معاينة؟',d:4,uid:broker1.id},
    {dir:'inbound', c:'آيوه عايز أشوفه، أنا متاح أي وقت الأسبوع الجاي',d:3},
    {dir:'outbound',c:'تمام، هنحجزلك يوم الأحد الساعة 11 الصبح. هيكون معاك فريقنا المتخصص',d:2,uid:broker1.id},
    {dir:'inbound', c:'ممتاز، بس محتاج أعرف السعر النهائي مع التقسيط',d:0},
    {dir:'inbound', c:'وكمان هل في أي خصم للدفع النقدي؟',d:0},
  ]) {
    await prisma.message.create({ data:{
      organizationId:org.id, conversationId:conv1.id,
      direction:m.dir, content:m.c, contentType:'text',
      status:m.dir==='outbound'?'delivered':'read',
      createdBy:(m as any).uid??null, sentAt:ago(m.d),
    }});
  }

  const conv2 = await prisma.conversation.create({ data:{
    organizationId:org.id, clientId:clients[1].id, leadId:leads[1].id,
    assignedToId:broker1.id, channel:'whatsapp', externalId:clients[1].phone,
    status:'active', lastMessageAt:ago(1), unreadCount:0,
  }});
  for (const m of [
    {dir:'inbound', c:'مساء الخير، عايزة أحجز معاينة الشقة في التجمع',d:3},
    {dir:'outbound',c:'مساء النور يا مدام نورا! بكرة الجمعة الساعة 3 مناسب؟',d:2,uid:broker1.id},
    {dir:'inbound', c:'آيوه مناسب جداً، شكراً',d:1},
  ]) {
    await prisma.message.create({ data:{
      organizationId:org.id, conversationId:conv2.id,
      direction:m.dir, content:m.c, contentType:'text',
      status:'read', createdBy:(m as any).uid??null, sentAt:ago(m.d),
    }});
  }

  const conv3 = await prisma.conversation.create({ data:{
    organizationId:org.id, clientId:clients[5].id,
    assignedToId:broker2.id, channel:'whatsapp', externalId:clients[5].phone,
    status:'active', lastMessageAt:ago(0), unreadCount:1,
  }});
  await prisma.message.create({ data:{
    organizationId:org.id, conversationId:conv3.id,
    direction:'inbound', content:'عايزة شقة للإيجار في مدينة نصر، ميزانية 10 آلاف شهرياً',
    contentType:'text', status:'delivered', sentAt:ago(0),
  }});

  const conv4 = await prisma.conversation.create({ data:{
    organizationId:org.id, clientId:clients[2].id, leadId:leads[2].id,
    assignedToId:broker2.id, channel:'whatsapp', externalId:clients[2].phone,
    status:'resolved', lastMessageAt:ago(7), unreadCount:0,
  }});
  await prisma.message.create({ data:{
    organizationId:org.id, conversationId:conv4.id,
    direction:'inbound', content:'وافقت على المكتب في مدينة نصر، ابعتلي تفاصيل العقد',
    contentType:'text', status:'read', sentAt:ago(8),
  }});
  await prisma.message.create({ data:{
    organizationId:org.id, conversationId:conv4.id,
    direction:'outbound', content:'تمام يا مهندس خالد، هبعتلك العقد على الإيميل دلوقتي',
    contentType:'text', status:'delivered', createdBy:broker2.id, sentAt:ago(7),
  }});

  // ── 17. DOCUMENTS ────────────────────────────────────────────
  await prisma.document.createMany({ data:[
    {organizationId:org.id,entityType:'deal',   entityId:dealClosed.id, documentType:'sale_contract',    title:'عقد بيع — شقة مصر الجديدة',           fileUrl:'https://storage.example.com/docs/cnt-001.pdf',  fileKey:'docs/cnt-001.pdf',  mimeType:'application/pdf',sizeBytes:245_000,status:DocumentStatus.VERIFIED, uploadedById:broker1.id,verifiedById:gm.id,verifiedAt:ago(28)},
    {organizationId:org.id,entityType:'client', entityId:clients[0].id,documentType:'national_id',       title:'بطاقة رقم قومي — محمد أبو العلا',     fileUrl:'https://storage.example.com/docs/id-c0.jpg',    fileKey:'docs/id-c0.jpg',    mimeType:'image/jpeg',     sizeBytes:180_000,status:DocumentStatus.VERIFIED, uploadedById:broker1.id,verifiedById:gm.id,verifiedAt:ago(40)},
    {organizationId:org.id,entityType:'deal',   entityId:dealRent.id,  documentType:'rent_contract',     title:'عقد إيجار — استوديو وسط البلد',        fileUrl:'https://storage.example.com/docs/cnt-002.pdf',  fileKey:'docs/cnt-002.pdf',  mimeType:'application/pdf',sizeBytes:180_000,status:DocumentStatus.VERIFIED, uploadedById:broker2.id,verifiedById:accountant.id,verifiedAt:ago(16)},
    {organizationId:org.id,entityType:'client', entityId:clients[3].id,documentType:'commercial_register',title:'سجل تجاري — شركة الأهلي للاستثمار', fileUrl:'https://storage.example.com/docs/comm-c3.pdf',  fileKey:'docs/comm-c3.pdf',  mimeType:'application/pdf',sizeBytes:350_000,status:DocumentStatus.PENDING_REVIEW, uploadedById:salesMgr.id},
    {organizationId:org.id,entityType:'property',entityId:props[15].id,documentType:'property_title',    title:'عقد ملكية — بنتهاوس القاهرة الجديدة', fileUrl:'https://storage.example.com/docs/title-p15.pdf',fileKey:'docs/title-p15.pdf',mimeType:'application/pdf',sizeBytes:420_000,status:DocumentStatus.VERIFIED, uploadedById:gm.id,verifiedById:owner.id,verifiedAt:ago(45)},
  ]});

  // ── 18. COMPLIANCE ───────────────────────────────────────────
  await prisma.complianceRecord.createMany({ data:[
    {organizationId:org.id,entityType:'user',        entityId:broker1.id, recordType:'broker_license',  referenceNumber:'LIC-001-2025',issuedAt:ago(180),expiresAt:from(185),status:'valid',        notes:'ترخيص سارة — صالح'},
    {organizationId:org.id,entityType:'user',        entityId:broker2.id, recordType:'broker_license',  referenceNumber:'LIC-002-2025',issuedAt:ago(330),expiresAt:from(35), status:'expiring_soon',notes:'⚠️ ينتهي خلال 35 يوم'},
    {organizationId:org.id,entityType:'organization',entityId:org.id,     recordType:'office_license',  referenceNumber:'578-2025-001',issuedAt:ago(90), expiresAt:from(275),status:'valid',        notes:'ترخيص المكتب سارٍ'},
    {organizationId:org.id,entityType:'user',        entityId:salesMgr.id,recordType:'broker_license',  referenceNumber:'LIC-003-2025',issuedAt:ago(165),expiresAt:from(200),status:'valid',        notes:'ترخيص ياسمين'},
    {organizationId:org.id,entityType:'user',        entityId:gm.id,      recordType:'manager_certificate',referenceNumber:'CERT-GM-001',issuedAt:ago(400),expiresAt:from(365),status:'valid',     notes:'شهادة المدير العام'},
  ]});

  // ── 19. ACTIVITIES ───────────────────────────────────────────
  const actData = [
    {uid:broker1.id, et:'lead',      ei:leads[0].id,       type:'call',     title:'مكالمة مع محمد أبو العلا',       body:'ناقشنا البنتهاوس — موافق على السعر مبدئياً',          d:5},
    {uid:broker1.id, et:'lead',      ei:leads[1].id,       type:'whatsapp', title:'رسالة واتساب لنورا السيد',        body:'تم إرسال تفاصيل الشقة مع الصور',                      d:3},
    {uid:broker2.id, et:'deal',      ei:dealActive.id,     type:'meeting',  title:'اجتماع توقيع الحجز',              body:'اجتماع لمراجعة بنود الحجز ودفع العربون',               d:38},
    {uid:broker1.id, et:'deal',      ei:dealClosed.id,     type:'note',     title:'صفقة مغلقة بنجاح ✅',            body:'توقيع عقد البيع وتحصيل 5,200,000 جنيه',               d:30},
    {uid:gm.id,      et:'deal',      ei:dealNego.id,       type:'email',    title:'عرض سعر نهائي',                   body:'إرسال عرض 3,700,000 مع الشروط',                       d:2},
    {uid:salesMgr.id,et:'lead',      ei:leads[3].id,       type:'call',     title:'مكالمة شركة الأهلي للاستثمار',   body:'يريدون وحدات متعددة للاستثمار — جادون جداً',         d:8},
    {uid:broker2.id, et:'lead',      ei:leads[9].id,       type:'meeting',  title:'اجتماع مع رانيا فؤاد',           body:'أحبت الفيلا، طلبت يوم للتفكير',                       d:6},
    {uid:accountant.id,et:'payment', ei:pay3.id,           type:'note',     title:'تحصيل القسط الثالث',              body:'1,500,000 جنيه بتحويل بنكي — TXN-2025-003',          d:3},
    {uid:owner.id,   et:'commission',ei:leadInputs=>leads[0].id, type:'note',title:'موافقة على العمولة',            body:'صرف عمولة سارة 88,920 جنيه',                          d:25},
    {uid:broker1.id, et:'lead',      ei:leads[8].id,       type:'whatsapp', title:'واتساب مع كريم — محال',           body:'العميل جاد، يريد إتمام الصفقة هذا الأسبوع',          d:2},
  ] as any[];

  for (const a of actData) {
    await prisma.activity.create({ data:{
      organizationId:org.id, userId:a.uid,
      entityType:a.et, entityId:typeof a.ei==='function'?a.ei():a.ei,
      activityType:a.type, title:a.title, body:a.body,
      occurredAt:ago(a.d),
    }});
  }

  // ── 20. NOTIFICATIONS ────────────────────────────────────────
  await prisma.notification.createMany({ data:[
    {organizationId:org.id,userId:owner.id,      type:'commission_approved',   title:'عمولة معتمدة',              body:'موافقة على عمولة صفقة مصر الجديدة — 88,920 جنيه',              data:{dealId:dealClosed.id,amount:88_920},isRead:true, readAt:ago(1)},
    {organizationId:org.id,userId:broker1.id,    type:'viewing_reminder',      title:'⏰ تذكير معاينة',           body:'معاينة غداً مع السيدة نورا — شقة التجمع الخامس الساعة 3 م',   data:{leadId:leads[1].id},               isRead:false},
    {organizationId:org.id,userId:gm.id,         type:'license_expiry_warning',title:'⚠️ انتهاء ترخيص قريباً',   body:'ترخيص الوسيط عمر السمسار ينتهي خلال 35 يوم',                   data:{userId:broker2.id},                isRead:false},
    {organizationId:org.id,userId:accountant.id, type:'payment_received',      title:'💰 دفعة مستلمة',           body:'1,500,000 جنيه — بنتهاوس القاهرة الجديدة — القسط الثالث',      data:{paymentId:pay3.id,amount:1_500_000},isRead:false},
    {organizationId:org.id,userId:broker1.id,    type:'new_lead',              title:'🆕 عميل محتمل جديد',       body:'هاني إبراهيم من Facebook — ميزانية 1.8 مليون',                  data:{leadId:leads[4].id},               isRead:false},
    {organizationId:org.id,userId:salesMgr.id,   type:'deal_stage_changed',    title:'📋 تحديث الصفقة',          body:'صفقة منى الشريف انتقلت لمرحلة إعداد العقد',                     data:{dealId:dealContract.id},           isRead:true, readAt:ago(1)},
    {organizationId:org.id,userId:broker2.id,    type:'overdue_payment',       title:'🔴 دفعة متأخرة',           body:'دفعة حجز صفقة نورا متأخرة 15 يوم — 100,000 جنيه',               data:{dealId:dealNego.id},               isRead:false},
    {organizationId:org.id,userId:owner.id,      type:'new_viewing_request',   title:'📅 طلب معاينة',            body:'دينا المصري طلبت معاينة شقة سيدي جابر — الخميس 4 م',            data:{leadId:leads[11].id},              isRead:true, readAt:ago(0)},
  ]});

  // ── 21. AUTOMATION RULES ─────────────────────────────────────
  await prisma.automationRule.createMany({ data:[
    {organizationId:org.id,name:'تذكير متابعة العميل المحتمل', trigger:'lead.inactive',      conditions:{inactiveDays:2},  actions:[{type:'notify_broker',message:'لم يتم التواصل منذ يومين'},{type:'create_activity',title:'تذكير متابعة'}],isActive:true, runCount:47, lastRunAt:ago(1)},
    {organizationId:org.id,name:'ترحيب بعميل جديد',            trigger:'lead.created',       conditions:{},               actions:[{type:'send_whatsapp',template:'welcome_message'},{type:'notify_broker',message:'عميل محتمل جديد'}],isActive:true,runCount:128,lastRunAt:ago(0)},
    {organizationId:org.id,name:'تنبيه انتهاء الترخيص',        trigger:'compliance.expiring', conditions:{daysBefore:30},  actions:[{type:'notify_user',message:'ترخيصك ينتهي قريباً'},{type:'notify_owner'}],isActive:true,runCount:12, lastRunAt:ago(2)},
    {organizationId:org.id,name:'تذكير القسط المستحق',          trigger:'installment.due',     conditions:{daysBefore:3},   actions:[{type:'send_whatsapp',template:'payment_reminder'},{type:'notify_accountant'}],isActive:true,runCount:89, lastRunAt:ago(0)},
    {organizationId:org.id,name:'حساب العمولة تلقائياً',        trigger:'deal.closed',        conditions:{},               actions:[{type:'calculate_commission'},{type:'notify_manager',message:'صفقة جديدة — راجع العمولة'}],isActive:true,runCount:6,  lastRunAt:ago(30)},
    {organizationId:org.id,name:'متابعة عدم الحضور',            trigger:'viewing.no_show',    conditions:{},               actions:[{type:'send_whatsapp',template:'no_show_followup'},{type:'create_activity',title:'متابعة غياب'}],isActive:false,runCount:3,lastRunAt:ago(15)},
  ]});

  // ── 22. SETTINGS ─────────────────────────────────────────────
  await prisma.setting.createMany({ data:[
    {organizationId:org.id,category:'eta',      key:'clientId',        value:'d0394a9f-0607-40de-a978-2d3eb8375b04',isSecret:true, verificationStatus:'success',lastVerifiedAt:ago(3),lastVerifiedBy:owner.id},
    {organizationId:org.id,category:'eta',      key:'clientSecret',    value:'6d62315e-d65a-4e41-9112-4195ea834edf',isSecret:true, verificationStatus:'success',lastVerifiedAt:ago(3),lastVerifiedBy:owner.id},
    {organizationId:org.id,category:'eta',      key:'environment',     value:'preprod',                             isSecret:false,verificationStatus:'success',lastVerifiedAt:ago(3),lastVerifiedBy:owner.id},
    {organizationId:org.id,category:'ai',       key:'anthropicKey',    value:'sk-ant-demo-placeholder',             isSecret:true, verificationStatus:'success',lastVerifiedAt:ago(1),lastVerifiedBy:owner.id},
    {organizationId:org.id,category:'ai',       key:'googleKey',       value:'AIza-demo-placeholder',               isSecret:true, verificationStatus:'untested'},
    {organizationId:org.id,category:'whatsapp', key:'phoneId',         value:'123456789012345',                     isSecret:false,verificationStatus:'success',lastVerifiedAt:ago(5),lastVerifiedBy:owner.id},
    {organizationId:org.id,category:'whatsapp', key:'token',           value:'EAADemo-token-placeholder',           isSecret:true, verificationStatus:'success',lastVerifiedAt:ago(5),lastVerifiedBy:owner.id},
    {organizationId:org.id,category:'storage',  key:'r2AccountId',     value:'demo-account-id',                     isSecret:false,verificationStatus:'untested'},
    {organizationId:org.id,category:'payments', key:'paymobApiKey',    value:'demo-paymob-key',                     isSecret:true, verificationStatus:'untested'},
    {organizationId:org.id,category:'firebase', key:'projectId',       value:'realestate-os-demo',                  isSecret:false,verificationStatus:'untested'},
  ]});

  // ── 23. AUDIT LOGS ───────────────────────────────────────────
  const auditData = [
    {uid:owner.id,      action:'USER_LOGIN',              et:'user',       ei:owner.id,      nv:{ip:'197.35.1.100'}, d:0},
    {uid:broker1.id,    action:'LEAD_CREATED',            et:'lead',       ei:leads[0].id,   nv:{stage:'NEW',source:'website'}, d:45},
    {uid:broker1.id,    action:'LEAD_STAGE_CHANGED',      et:'lead',       ei:leads[0].id,   ov:{stage:'CONTACTED'},nv:{stage:'NEGOTIATING'}, d:10},
    {uid:broker1.id,    action:'DEAL_CREATED',            et:'deal',       ei:dealActive.id, nv:{type:'sale',price:14_500_000}, d:40},
    {uid:accountant.id, action:'PAYMENT_RECORDED',        et:'payment',    ei:pay3.id,       nv:{amount:1_500_000,method:'BANK_TRANSFER'}, d:3},
    {uid:owner.id,      action:'COMMISSION_APPROVED',     et:'commission', ei:dealClosed.id, nv:{status:'APPROVED',isLocked:true}, d:25},
    {uid:gm.id,         action:'PROPERTY_PRICE_UPDATED',  et:'property',   ei:props[0].id,   ov:{price:3_600_000},nv:{price:3_800_000}, d:10},
    {uid:broker2.id,    action:'CONTRACT_CREATED',        et:'contract',   ei:dealRent.id,   nv:{number:'CNT-2025-002'}, d:18},
    {uid:salesMgr.id,   action:'DEAL_STAGE_CHANGED',      et:'deal',       ei:dealReserv.id, ov:{stage:'NEGOTIATION'},nv:{stage:'RESERVATION'}, d:5},
    {uid:owner.id,      action:'USER_CREATED',            et:'user',       ei:broker2.id,    nv:{email:'broker2@demo.com',role:'BROKER'}, d:180},
    {uid:accountant.id, action:'ETA_RECEIPT_SUBMITTED',   et:'eta_receipt',ei:pay1.id,       nv:{status:'PENDING',internalId:'REC-2025-001'}, d:38},
    {uid:gm.id,         action:'DOCUMENT_VERIFIED',       et:'document',   ei:clients[0].id, nv:{status:'VERIFIED'}, d:28},
    {uid:owner.id,      action:'AUTOMATION_RULE_CREATED', et:'automation', ei:org.id,        nv:{name:'ترحيب بعميل جديد'}, d:90},
    {uid:owner.id,      action:'SETTINGS_UPDATED',        et:'settings',   ei:org.id,        nv:{category:'eta',key:'environment'}, d:3},
  ];
  for (const a of auditData) {
    await prisma.auditLog.create({ data:{
      organizationId:org.id, userId:a.uid,
      action:a.action, entityType:a.et, entityId:a.ei,
      oldValue:(a as any).ov??null, newValue:a.nv,
      ipAddress:`197.35.${Math.floor(Math.random()*200)}.${Math.floor(Math.random()*200)}`,
      userAgent:'Mozilla/5.0 Chrome/120',
      occurredAt:ago(a.d),
    }});
  }

  // ── 24. AI USAGE LOGS ────────────────────────────────────────
  await prisma.aiUsageLog.createMany({ data:[
    {organizationId:org.id,userId:broker1.id,  feature:'lead_scoring',      provider:'anthropic',model:'claude-sonnet-4-6',tier:1,inputTokens:512, outputTokens:128, costUsd:0.0035,latencyMs:820, success:true},
    {organizationId:org.id,userId:broker1.id,  feature:'whatsapp_reply',    provider:'anthropic',model:'claude-sonnet-4-6',tier:1,inputTokens:1024,outputTokens:512, costUsd:0.0108,latencyMs:1200,success:true},
    {organizationId:org.id,userId:gm.id,       feature:'deal_analysis',     provider:'anthropic',model:'claude-opus-4-6',  tier:2,inputTokens:2048,outputTokens:1024,costUsd:0.0845,latencyMs:3200,success:true},
    {organizationId:org.id,userId:broker2.id,  feature:'lead_scoring',      provider:'anthropic',model:'claude-sonnet-4-6',tier:1,inputTokens:480, outputTokens:120, costUsd:0.0032,latencyMs:750, success:true},
    {organizationId:org.id,userId:accountant.id,feature:'document_ocr',     provider:'google',   model:'gemini-3.1-pro-preview',tier:3,inputTokens:2048,outputTokens:512,costUsd:0.005,latencyMs:2100,success:true},
    {organizationId:org.id,userId:broker1.id,  feature:'copilot',           provider:'anthropic',model:'claude-sonnet-4-6',tier:1,inputTokens:756, outputTokens:320, costUsd:0.0068,latencyMs:1450,success:true},
    {organizationId:org.id,userId:salesMgr.id, feature:'daily_digest',      provider:'anthropic',model:'claude-opus-4-6',  tier:2,inputTokens:3072,outputTokens:2048,costUsd:0.1996,latencyMs:5800,success:true},
    {organizationId:org.id,userId:broker2.id,  feature:'call_summary',      provider:'anthropic',model:'claude-sonnet-4-6',tier:1,inputTokens:1536,outputTokens:768, costUsd:0.0162,latencyMs:1800,success:true},
    {organizationId:org.id,userId:owner.id,    feature:'financial_analysis',provider:'anthropic',model:'claude-opus-4-6',  tier:2,inputTokens:4096,outputTokens:2048,costUsd:0.2149,latencyMs:6200,success:true},
    {organizationId:org.id,userId:broker1.id,  feature:'property_description',provider:'anthropic',model:'claude-sonnet-4-6',tier:1,inputTokens:600,outputTokens:400,costUsd:0.0078,latencyMs:950,success:false,errorMessage:'Rate limit exceeded'},
  ]});

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log('\n✅ تمت جميع البيانات التجريبية!\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔑  بيانات الدخول (كلمة المرور الموحدة: Demo@123456):');
  console.log('    👑  المالك:        owner@demo.com');
  console.log('    🏢  المدير العام:  gm@demo.com');
  console.log('    🏅  الوسيط 1:      broker1@demo.com');
  console.log('    🏅  الوسيط 2:      broker2@demo.com');
  console.log('    💼  المحاسب:       accountant@demo.com');
  console.log('    📊  مدير المبيعات: salesmgr@demo.com');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊  الإحصائيات الشاملة:');
  console.log('    🏢 3 فروع   |  👤 6 مستخدمين  |  🏠 20 وحدة  |  👥 12 عميل');
  console.log('    📋 12 lead (كل مرحلة)  |  🤝 6 صفقات  |  💰 5 مدفوعات');
  console.log('    📅 6 معاينات  |  💬 4 محادثات  |  💼 6 عمولات');
  console.log('    🧾 2 إيصال ETA  |  📄 5 وثائق  |  ⚖️ 5 سجلات امتثال');
  console.log('    ⚡ 6 قواعد أتمتة  |  ⚙️ 10 إعدادات  |  🤖 10 سجلات AI');
  console.log('    🔔 8 إشعارات  |  📝 10 أنشطة  |  🔍 14 سجل تدقيق');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('❌ خطأ في Seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
