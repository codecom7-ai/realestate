'use client';

// ═══════════════════════════════════════════════════════════════
// ImageUploader - مكون رفع الصور
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  StarIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

// أنواع الملفات المسموحة
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 20;

export interface ImageItem {
  id: string;
  url: string;
  key: string;
  order: number;
  isPrimary: boolean;
  createdAt?: string;
  // لحالة الرفع
  file?: File;
  uploading?: boolean;
  error?: string;
  localUrl?: string;
}

interface ImageUploaderProps {
  entityId: string;
  entityType: 'property' | 'client' | 'deal' | 'contract';
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export default function ImageUploader({
  entityId,
  entityType,
  images,
  onImagesChange,
  maxImages = MAX_IMAGES,
  disabled = false,
}: ImageUploaderProps) {
  const t = useTranslations('uploads');
  const tCommon = useTranslations('common');

  const [isDragging, setIsDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ═══════════════════════════════════════════════════════════════
  // التحقق من الملف
  // ═══════════════════════════════════════════════════════════════

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('errors.invalidType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('errors.fileTooBig', { size: 10 });
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════════
  // رفع ملف
  // ═══════════════════════════════════════════════════════════════

  const uploadFile = async (file: File): Promise<ImageItem | null> => {
    const validationError = validateFile(file);
    if (validationError) {
      return null;
    }

    try {
      // 1. الحصول على presigned URL
      const presignedResponse = await api.post('/uploads/presigned-url', {
        mimeType: file.type,
        entityType,
        entityId,
        originalFileName: file.name,
        fileSize: file.size,
      });

      const { uploadUrl, key } = presignedResponse.data;

      // 2. رفع الملف مباشرة إلى R2
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      // 3. تأكيد الرفع
      const confirmResponse = await api.post('/uploads/confirm', {
        key,
        entityType,
        entityId,
      });

      return confirmResponse.data;
    } catch (error: any) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // معالجة الملفات المختارة
  // ═══════════════════════════════════════════════════════════════

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // التحقق من الحد الأقصى
    const currentCount = images.length;
    const availableSlots = maxImages - currentCount;
    if (availableSlots <= 0) {
      return;
    }

    const filesToUpload = fileArray.slice(0, availableSlots);
    
    // إنشاء معاينات محلية وبدء الرفع
    const newImages: ImageItem[] = filesToUpload.map((file) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      key: '',
      order: images.length,
      isPrimary: images.length === 0,
      file,
      uploading: true,
      localUrl: URL.createObjectURL(file),
    }));

    // إضافة الصور مع حالة الرفع
    let currentImages = [...images, ...newImages];
    onImagesChange(currentImages);

    // رفع كل ملف
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const tempId = newImages[i].id;

      const result = await uploadFile(file);

      if (result) {
        // تحديث الصورة بالنتيجة الفعلية
        currentImages = currentImages.map((img: ImageItem) =>
          img.id === tempId
            ? { ...result, uploading: false }
            : img
        );
      } else {
        // تحديد الخطأ
        currentImages = currentImages.map((img: ImageItem) =>
          img.id === tempId
            ? { ...img, uploading: false, error: t('uploadError') }
            : img
        );
      }
      onImagesChange(currentImages);
    }
  }, [images, maxImages, entityId, entityType, onImagesChange, t]);

  // ═══════════════════════════════════════════════════════════════
  // Drag & Drop
  // ═══════════════════════════════════════════════════════════════

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // حذف صورة
  // ═══════════════════════════════════════════════════════════════

  const handleDelete = async (image: ImageItem) => {
    if (image.file && !image.key) {
      // صورة محلية لم تُرفع بعد
      if (image.localUrl) URL.revokeObjectURL(image.localUrl);
      onImagesChange(images.filter((img) => img.id !== image.id));
      return;
    }

    try {
      await api.delete(`/uploads/${image.id}?entityType=${entityType}`);
      onImagesChange(images.filter((img) => img.id !== image.id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // تعيين صورة رئيسية
  // ═══════════════════════════════════════════════════════════════

  const handleSetPrimary = (image: ImageItem) => {
    onImagesChange(
      images.map((img) => ({
        ...img,
        isPrimary: img.id === image.id,
      }))
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // إعادة ترتيب
  // ═══════════════════════════════════════════════════════════════

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    
    // تحديث الترتيب
    onImagesChange(
      newImages.map((img, index) => ({
        ...img,
        order: index,
      }))
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // حفظ الترتيب
  // ═══════════════════════════════════════════════════════════════

  const saveOrder = async () => {
    try {
      await api.post('/uploads/reorder', {
        entityId,
        imageIds: images.map((img) => img.id),
        primaryImageId: images.find((img) => img.isPrimary)?.id,
      });
    } catch (error) {
      console.error('Save order error:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <PermissionGate permissions={[PERMISSIONS.PROPERTIES_WRITE]}>
      <div className="space-y-4">
        {/* منطقة الرفع */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            disabled={disabled}
          />

          <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          
          <p className="text-gray-600 mb-2">{t('dragDropHint')}</p>
          
          <div className="text-sm text-gray-400 space-y-1">
            <p>{t('maxImages', { count: maxImages })}</p>
            <p>{t('maxSize', { size: 10 })}</p>
            <p>{t('allowedTypes')}</p>
          </div>

          {images.length >= maxImages && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
              <p className="text-gray-500">{t('errors.maxImagesReached')}</p>
            </div>
          )}
        </div>

        {/* معرض الصور */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images
              .sort((a, b) => a.order - b.order)
              .map((image, index) => (
                <div
                  key={image.id}
                  className={`relative group aspect-square rounded-lg overflow-hidden bg-gray-100 ${
                    image.uploading ? 'animate-pulse' : ''
                  }`}
                >
                  {/* الصورة */}
                  <img
                    src={image.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />

                  {/* حالة الرفع */}
                  {image.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <ArrowUpTrayIcon className="w-8 h-8 text-white animate-bounce" />
                    </div>
                  )}

                  {/* خطأ */}
                  {image.error && (
                    <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                      <p className="text-white text-xs text-center p-2">{image.error}</p>
                    </div>
                  )}

                  {/* شارة الرئيسية */}
                  {image.isPrimary && !image.uploading && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <StarIcon className="w-3 h-3" />
                      <span>{t('primary')}</span>
                    </div>
                  )}

                  {/* أزرار الإجراءات */}
                  {!image.uploading && !disabled && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all">
                      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* زر الحذف */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(image);
                          }}
                          className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title={tCommon('delete')}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* أزرار الترتيب */}
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* تعيين رئيسية */}
                        {!image.isPrimary && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimary(image);
                            }}
                            className="p-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs"
                            title={t('setPrimary')}
                          >
                            <StarIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* أزرار التحريك */}
                        <div className="flex gap-1 mr-auto">
                          {index > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReorder(index, index - 1);
                              }}
                              className="p-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <ArrowsUpDownIcon className="w-4 h-4 rotate-180" />
                            </button>
                          )}
                          {index < images.length - 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReorder(index, index + 1);
                              }}
                              className="p-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <ArrowsUpDownIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
