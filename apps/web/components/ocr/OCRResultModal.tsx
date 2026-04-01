'use client';

// ═══════════════════════════════════════════════════════════════
// OCRResultModal - Modal لعرض نتائج OCR
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';
import {
  X,
  Check,
  RefreshCw,
  Edit2,
  Save,
  AlertCircle,
  FileText,
  Clock,
  Percent,
} from 'lucide-react';
import type { OCRField, OCRResult, DocumentType } from '@/hooks/useCameraOCR';

interface OCRResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: OCRResult | null;
  capturedImage: string | null;
  documentType: DocumentType;
  onConfirm: (fields: OCRField[]) => void;
  onRetake: () => void;
  onEditField?: (field: OCRField) => void;
}

// Document type labels in Arabic
const DOCUMENT_TYPE_LABELS_AR: Record<DocumentType, string> = {
  national_id: 'بطاقة الرقم القومي',
  passport: 'جواز السفر',
  property_contract: 'عقد الملكية',
  receipt: 'إيصال',
  other: 'مستند آخر',
};

// Confidence color helper
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-600 bg-green-100';
  if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.8) return 'عالية';
  if (confidence >= 0.6) return 'متوسطة';
  return 'منخفضة';
};

export default function OCRResultModal({
  isOpen,
  onClose,
  result,
  capturedImage,
  documentType,
  onConfirm,
  onRetake,
  onEditField,
}: OCRResultModalProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedFields, setEditedFields] = useState<OCRField[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  // Initialize edited fields when result changes
  useMemo(() => {
    if (result?.fields) {
      setEditedFields(result.fields.map(f => ({ ...f })));
    }
  }, [result?.fields]);

  // Handle field edit
  const handleFieldEdit = useCallback((fieldKey: string, newValue: string) => {
    setEditedFields(prev => 
      prev.map(f => 
        f.key === fieldKey 
          ? { ...f, value: newValue }
          : f
      )
    );
  }, []);

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      await onConfirm(editedFields);
    } finally {
      setIsConfirming(false);
    }
  }, [editedFields, onConfirm]);

  // Handle retake
  const handleRetake = useCallback(() => {
    setEditingField(null);
    setEditedFields([]);
    onRetake();
  }, [onRetake]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                نتائج التعرف الضوئي
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {DOCUMENT_TYPE_LABELS_AR[documentType]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image Preview */}
          {capturedImage && (
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <img
                src={capturedImage}
                alt="Captured document"
                className="w-full max-h-48 object-contain rounded-lg bg-gray-50 dark:bg-gray-800"
              />
            </div>
          )}

          {/* Processing Info */}
          {result && (
            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{result.processingTime}ms</span>
              </div>
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-gray-500" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(result.confidence)}`}>
                  دقة {Math.round(result.confidence * 100)}% - {getConfidenceLabel(result.confidence)}
                </span>
              </div>
            </div>
          )}

          {/* Fields */}
          {editedFields.length > 0 ? (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                الحقول المستخرجة (يمكنك تعديلها قبل التأكيد)
              </h3>
              
              <div className="space-y-3">
                {editedFields.map((field, index) => (
                  <div 
                    key={field.key}
                    className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {field.labelAr}
                          </label>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(field.confidence)}`}>
                            {Math.round(field.confidence * 100)}%
                          </span>
                        </div>
                        
                        {editingField === field.key && field.editable ? (
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => handleFieldEdit(field.key, e.target.value)}
                            onBlur={() => setEditingField(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingField(null);
                            }}
                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg 
                              bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                              focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onClick={() => field.editable && setEditingField(field.key)}
                            className={`px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                              ${field.editable ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600' : ''}`}
                          >
                            <p className="text-gray-900 dark:text-white">
                              {field.value || <span className="text-gray-400">غير محدد</span>}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {field.editable && editingField !== field.key && (
                        <button
                          onClick={() => setEditingField(field.key)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : result ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                لم يتم استخراج أي حقول من المستند
              </p>
            </div>
          ) : (
            <div className="p-6 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">
                جاري معالجة الصورة...
              </p>
            </div>
          )}

          {/* Warning for low confidence */}
          {result && result.confidence < 0.6 && (
            <div className="mx-6 mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    دقة التعرف منخفضة
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    يرجى مراجعة البيانات المستخرجة بعناية وإجراء التعديلات اللازمة قبل التأكيد.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleRetake}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
              text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <span>إعادة التصوير</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              إلغاء
            </button>
            
            <button
              onClick={handleConfirm}
              disabled={isConfirming || editedFields.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConfirming ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جاري التأكيد...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>تأكيد وملء النموذج</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
