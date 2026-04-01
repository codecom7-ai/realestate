'use client';

// ═══════════════════════════════════════════════════════════════
// CameraOCR - مكون لتصوير المستندات واستخراج البيانات
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Sun,
  SunDim,
  SwitchCamera,
  Check,
  X,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import useCameraOCR, { DocumentType, OCRField } from '@/hooks/useCameraOCR';
import OCRResultModal from './OCRResultModal';

// Document type options
const DOCUMENT_TYPES: { value: DocumentType; labelAr: string; icon: string }[] = [
  { value: 'national_id', labelAr: 'بطاقة الرقم القومي', icon: '🪪' },
  { value: 'passport', labelAr: 'جواز السفر', icon: '🛂' },
  { value: 'property_contract', labelAr: 'عقد الملكية', icon: '📄' },
  { value: 'receipt', labelAr: 'إيصال', icon: '🧾' },
  { value: 'other', labelAr: 'مستند آخر', icon: '📑' },
];

interface CameraOCRProps {
  onFieldsExtracted?: (fields: OCRField[], documentType: DocumentType) => void;
  onClose?: () => void;
  defaultDocumentType?: DocumentType;
}

export default function CameraOCR({
  onFieldsExtracted,
  onClose,
  defaultDocumentType = 'national_id',
}: CameraOCRProps) {
  // State
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>(defaultDocumentType);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDocTypeSelector, setShowDocTypeSelector] = useState(true);

  // Camera OCR hook
  const {
    isStreaming,
    isLoading,
    error,
    capabilities,
    startCamera,
    stopCamera,
    captureImage,
    switchCamera,
    toggleFlash,
    isFlashOn,
    currentCamera,
    capturedImage,
    ocrResult,
    isProcessingOCR,
    processOCR,
    clearCapture,
  } = useCameraOCR({
    autoStart: false,
  });

  // Handle capture
  const handleCapture = useCallback(() => {
    const imageData = captureImage();
    if (imageData) {
      setShowDocTypeSelector(false);
    }
  }, [captureImage]);

  // Handle process OCR
  const handleProcessOCR = useCallback(async () => {
    if (!capturedImage) return;
    const result = await processOCR(capturedImage, selectedDocType);
    if (result) {
      setShowResultModal(true);
    }
  }, [capturedImage, selectedDocType, processOCR]);

  // Handle confirm from modal
  const handleConfirm = useCallback(async (fields: OCRField[]) => {
    setShowResultModal(false);
    onFieldsExtracted?.(fields, selectedDocType);
    clearCapture();
    stopCamera();
    setShowDocTypeSelector(true);
  }, [selectedDocType, onFieldsExtracted, clearCapture, stopCamera]);

  // Handle retake
  const handleRetake = useCallback(() => {
    setShowResultModal(false);
    clearCapture();
    setShowDocTypeSelector(true);
  }, [clearCapture]);

  // Handle back to camera
  const handleBackToCamera = useCallback(() => {
    clearCapture();
    setShowDocTypeSelector(true);
  }, [clearCapture]);

  // Handle start camera
  const handleStartCamera = useCallback(async () => {
    setShowDocTypeSelector(false);
    await startCamera();
  }, [startCamera]);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    clearCapture();
    onClose?.();
  }, [stopCamera, clearCapture, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <h1 className="text-white font-semibold text-lg">
            تصوير المستندات
          </h1>
          
          {isStreaming && capabilities?.hasFlash && (
            <button
              onClick={toggleFlash}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {isFlashOn ? (
                <Sun className="w-6 h-6 text-yellow-400" />
              ) : (
                <SunDim className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {!isStreaming && (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Camera View / Image Preview */}
      <div className="flex-1 relative">
        {/* Video Preview */}
        {isStreaming && !capturedImage && (
          <video
            ref={(el) => {
              // This is needed because we need the video element reference
              if (el) {
                (window as any).__cameraVideoElement = el;
              }
            }}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ transform: currentCamera === 'front' ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Captured Image Preview */}
        {capturedImage && !showResultModal && (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Captured document"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-center text-sm">
                اضغط على "استخراج البيانات" للمتابعة أو "إعادة" للتصوير مرة أخرى
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
              <p className="text-white">جاري تشغيل الكاميرا...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isStreaming && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-white text-lg font-semibold mb-2">حدث خطأ</h2>
              <p className="text-gray-300 text-sm mb-6">{error}</p>
              <button
                onClick={handleStartCamera}
                className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        {/* Initial State - Document Type Selector */}
        {showDocTypeSelector && !isStreaming && !capturedImage && !error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-white text-xl font-semibold mb-2">
                  اختر نوع المستند
                </h2>
                <p className="text-gray-400 text-sm">
                  حدد نوع المستند لاستخراج البيانات بشكل صحيح
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {DOCUMENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedDocType(type.value)}
                    className={`p-4 rounded-xl text-right transition-all ${
                      selectedDocType === type.value
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{type.icon}</span>
                    <span className="text-sm font-medium">{type.labelAr}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleStartCamera}
                className="w-full py-4 bg-white text-black rounded-xl font-semibold 
                  flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>تشغيل الكاميرا</span>
              </button>
            </div>
          </div>
        )}

        {/* Processing OCR Overlay */}
        {isProcessingOCR && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">جاري معالجة الصورة</h3>
              <p className="text-gray-400 text-sm">يتم استخراج البيانات باستخدام الذكاء الاصطناعي...</p>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      {isStreaming && !capturedImage && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="flex items-center justify-center gap-8">
            {/* Switch Camera */}
            {capabilities?.hasFrontCamera && capabilities?.hasBackCamera && (
              <button
                onClick={switchCamera}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <SwitchCamera className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              className="w-20 h-20 rounded-full bg-white border-4 border-white/50 
                flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <Camera className="w-8 h-8 text-black" />
            </button>

            {/* Placeholder for symmetry */}
            <div className="w-12 h-12" />
          </div>

          {/* Document Type Badge */}
          <div className="text-center mt-4">
            <span className="px-3 py-1.5 bg-white/10 rounded-full text-white text-sm">
              {DOCUMENT_TYPES.find(t => t.value === selectedDocType)?.icon}{' '}
              {DOCUMENT_TYPES.find(t => t.value === selectedDocType)?.labelAr}
            </span>
          </div>
        </div>
      )}

      {/* Captured Image Controls */}
      {capturedImage && !showResultModal && !isProcessingOCR && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-6">
          <div className="flex items-center justify-center gap-4">
            {/* Retake */}
            <button
              onClick={handleBackToCamera}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span>إعادة</span>
            </button>

            {/* Process OCR */}
            <button
              onClick={handleProcessOCR}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>استخراج البيانات</span>
            </button>
          </div>
        </div>
      )}

      {/* OCR Result Modal */}
      <OCRResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={ocrResult}
        capturedImage={capturedImage}
        documentType={selectedDocType}
        onConfirm={handleConfirm}
        onRetake={handleRetake}
      />

      {/* Hidden video element for camera hook */}
      <video
        ref={(el) => {
          if (el && isStreaming) {
            // The hook manages the video element
          }
        }}
        className="hidden"
        autoPlay
        playsInline
        muted
      />
    </div>
  );
}
