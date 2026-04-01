'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

// Validation Schema
const newDealSchema = z.object({
  clientId: z.string().min(1, 'العميل مطلوب'),
  propertyId: z.string().min(1, 'العقار مطلوب'),
  dealType: z.enum(['sale', 'rent', 'management'], {
    required_error: 'نوع الصفقة مطلوب',
  }),
  assignedBrokerId: z.string().optional(),
  agreedPrice: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي صفر').optional(),
  currency: z.string().default('EGP'),
  notes: z.string().optional(),
});

type NewDealForm = z.infer<typeof newDealSchema>;

// Types
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  phone: string;
  isVip: boolean;
}

interface Property {
  id: string;
  title: string;
  titleAr: string | null;
  city: string;
  district: string | null;
  askingPrice: number;
  currency: string;
  status: string;
  propertyType: string;
}

interface Broker {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
}

export default function NewDealPage() {
  const t = useTranslations('deals');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  
  // Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewDealForm>({
    resolver: zodResolver(newDealSchema),
    defaultValues: {
      currency: 'EGP',
    },
  });
  
  const selectedPropertyId = watch('propertyId');
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, propertiesRes, brokersRes] = await Promise.all([
          api.get('/clients?limit=100'),
          api.get('/properties?status=AVAILABLE&limit=100'),
          api.get('/users?limit=50'),
        ]);
        
        setClients(clientsRes.data.data || []);
        setProperties(propertiesRes.data.data || []);
        setBrokers(brokersRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Set default price from property
  useEffect(() => {
    if (selectedProperty) {
      setValue('agreedPrice', selectedProperty.askingPrice);
      setValue('currency', selectedProperty.currency);
    }
  }, [selectedProperty, setValue]);
  
  // Filter clients by search
  const filteredClients = clients.filter(c => {
    if (!clientSearch) return true;
    const name = `${c.firstNameAr || c.firstName} ${c.lastNameAr || c.lastName}`;
    return name.includes(clientSearch) || c.phone.includes(clientSearch);
  });
  
  // Filter properties by search
  const filteredProperties = properties.filter(p => {
    if (!propertySearch) return true;
    const title = p.titleAr || p.title;
    return title.includes(propertySearch) || p.city.includes(propertySearch);
  });
  
  // Submit form
  const onSubmit = async (data: NewDealForm) => {
    try {
      setSubmitting(true);
      const response = await api.post('/deals', data);
      const dealId = response.data.data.id;
      router.push(`/dashboard/deals/${dealId}`);
    } catch (error: any) {
      console.error('Failed to create deal:', error);
      alert(error.response?.data?.error?.messageAr || 'حدث خطأ في إنشاء الصفقة');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <PermissionGate permissions={[PERMISSIONS.DEALS_WRITE]}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/deals')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              →
            </button>
            <h1 className="text-xl font-bold text-gray-900">{t('newDeal')}</h1>
          </div>
        </div>
        
        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
            {/* Client Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">{t('fields.client')} *</h2>
              
              <div className="mb-3">
                <input
                  type="text"
                  placeholder={t('placeholders.selectClient')}
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <label
                      key={client.id}
                      className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${
                        watch('clientId') === client.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        value={client.id}
                        {...register('clientId')}
                        className="text-primary-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {client.firstNameAr || client.firstName} {client.lastNameAr || client.lastName}
                          {client.isVip && <span className="text-amber-500 mr-1">⭐</span>}
                        </p>
                        <p className="text-sm text-gray-500" dir="ltr">{client.phone}</p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="p-4 text-center text-gray-400">لا يوجد عملاء</p>
                )}
              </div>
              
              {errors.clientId && (
                <p className="text-red-500 text-sm mt-2">{t('validation.clientRequired')}</p>
              )}
            </div>
            
            {/* Property Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">{t('fields.property')} *</h2>
              
              <div className="mb-3">
                <input
                  type="text"
                  placeholder={t('placeholders.selectProperty')}
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredProperties.length > 0 ? (
                  filteredProperties.map((property) => (
                    <label
                      key={property.id}
                      className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${
                        watch('propertyId') === property.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        value={property.id}
                        {...register('propertyId')}
                        className="text-primary-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {property.titleAr || property.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          📍 {property.city}{property.district ? `، ${property.district}` : ''}
                        </p>
                        <p className="text-sm font-medium text-green-700">
                          {property.askingPrice.toLocaleString('ar-EG')} {property.currency}
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="p-4 text-center text-gray-400">لا توجد عقارات متاحة</p>
                )}
              </div>
              
              {errors.propertyId && (
                <p className="text-red-500 text-sm mt-2">{t('validation.propertyRequired')}</p>
              )}
            </div>
            
            {/* Deal Type */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">{t('fields.dealType')} *</h2>
              
              <div className="grid grid-cols-3 gap-3">
                {(['sale', 'rent', 'management'] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      watch('dealType') === type 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={type}
                      {...register('dealType')}
                      className="sr-only"
                    />
                    <span className="text-2xl mb-2">
                      {type === 'sale' ? '🏠' : type === 'rent' ? '🔑' : '📋'}
                    </span>
                    <span className="font-medium text-gray-900">{t(`types.${type}`)}</span>
                  </label>
                ))}
              </div>
              
              {errors.dealType && (
                <p className="text-red-500 text-sm mt-2">{t('validation.dealTypeRequired')}</p>
              )}
            </div>
            
            {/* Assigned Broker */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">{t('fields.assignedBroker')}</h2>
              
              <select
                {...register('assignedBrokerId')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('unassigned')}</option>
                {brokers.map((broker) => (
                  <option key={broker.id} value={broker.id}>
                    {broker.firstNameAr || broker.firstName} {broker.lastNameAr || broker.lastName}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Agreed Price */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">{t('fields.agreedPrice')}</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">{t('fields.agreedPrice')}</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('agreedPrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">{t('fields.currency')}</label>
                  <select
                    {...register('currency')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="EGP">جنيه مصري (EGP)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="EUR">يورو (EUR)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                  </select>
                </div>
              </div>
              
              {selectedProperty && (
                <p className="text-sm text-gray-500 mt-2">
                  السعر المطلوب للعقار: {selectedProperty.askingPrice.toLocaleString('ar-EG')} {selectedProperty.currency}
                </p>
              )}
            </div>
            
            {/* Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">{t('fields.notes')}</h2>
              
              <textarea
                {...register('notes')}
                rows={4}
                placeholder={t('placeholders.notes')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/deals')}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? tCommon('loading') : t('newDeal')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PermissionGate>
  );
}
