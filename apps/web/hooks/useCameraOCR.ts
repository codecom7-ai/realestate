'use client';

// ═══════════════════════════════════════════════════════════════
// useCameraOCR Hook - للتعامل مع الكاميرا و OCR
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';

// Types
export type DocumentType = 
  | 'national_id' 
  | 'passport' 
  | 'property_contract' 
  | 'receipt'
  | 'other';

export interface OCRField {
  key: string;
  label: string;
  labelAr: string;
  value: string;
  confidence: number;
  editable: boolean;
}

export interface OCRResult {
  documentType: DocumentType;
  fields: OCRField[];
  rawText?: string;
  confidence: number;
  processingTime: number;
}

export interface CameraCapabilities {
  hasCamera: boolean;
  hasFlash: boolean;
  hasFrontCamera: boolean;
  hasBackCamera: boolean;
}

interface UseCameraOCROptions {
  autoStart?: boolean;
  preferredCamera?: 'front' | 'back';
  onCapture?: (imageBase64: string) => void;
  onOCRComplete?: (result: OCRResult) => void;
  onError?: (error: string) => void;
}

interface UseCameraOCRReturn {
  // Camera state
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  capabilities: CameraCapabilities | null;
  
  // Camera controls
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureImage: () => string | null;
  switchCamera: () => void;
  toggleFlash: () => void;
  
  // Flash state
  isFlashOn: boolean;
  currentCamera: 'front' | 'back';
  
  // OCR state
  capturedImage: string | null;
  ocrResult: OCRResult | null;
  isProcessingOCR: boolean;
  processOCR: (imageBase64: string, documentType: DocumentType) => Promise<OCRResult | null>;
  clearCapture: () => void;
  clearResult: () => void;
  
  // Video ref
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

// Document type labels
const DOCUMENT_TYPE_LABELS: Record<DocumentType, { en: string; ar: string }> = {
  national_id: { en: 'National ID', ar: 'بطاقة الرقم القومي' },
  passport: { en: 'Passport', ar: 'جواز السفر' },
  property_contract: { en: 'Property Contract', ar: 'عقد الملكية' },
  receipt: { en: 'Receipt', ar: 'إيصال' },
  other: { en: 'Other', ar: 'أخرى' },
};

export function useCameraOCR(options: UseCameraOCROptions = {}): UseCameraOCRReturn {
  const {
    autoStart = false,
    preferredCamera = 'back',
    onCapture,
    onOCRComplete,
    onError,
  } = options;

  // Camera state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<'front' | 'back'>(preferredCamera);
  
  // OCR state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Check camera capabilities
  const checkCapabilities = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      const hasFrontCamera = videoDevices.some((d, i) => 
        d.label.toLowerCase().includes('front') || 
        d.label.toLowerCase().includes('user') ||
        (i === 0 && videoDevices.length > 1)
      );
      const hasBackCamera = videoDevices.some(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      
      // Check flash capability
      let hasFlash = false;
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities?.() as any;
          hasFlash = capabilities?.torch === true;
        }
      }
      
      setCapabilities({
        hasCamera: videoDevices.length > 0,
        hasFrontCamera: hasFrontCamera || videoDevices.length > 1,
        hasBackCamera: hasBackCamera || videoDevices.length > 0,
        hasFlash,
      });
    } catch (err) {
      console.error('Failed to check camera capabilities:', err);
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get user media
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: currentCamera === 'front' ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      trackRef.current = stream.getVideoTracks()[0];

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
      await checkCapabilities();
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      const errorMessage = err.name === 'NotAllowedError'
        ? 'تم رفض الوصول للكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.'
        : err.name === 'NotFoundError'
        ? 'لم يتم العثور على كاميرا على هذا الجهاز.'
        : 'فشل في تشغيل الكاميرا. يرجى المحاولة مرة أخرى.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentCamera, checkCapabilities, onError]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsFlashOn(false);
  }, []);

  // Capture image
  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !isStreaming) {
      setError('الكاميرا غير مفعلة');
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('فشل في إنشاء سياق الرسم');
        return null;
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get base64 image
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageBase64);
      onCapture?.(imageBase64);
      
      return imageBase64;
    } catch (err: any) {
      console.error('Failed to capture image:', err);
      setError('فشل في التقاط الصورة');
      onError?.('فشل في التقاط الصورة');
      return null;
    }
  }, [isStreaming, onCapture, onError]);

  // Switch camera
  const switchCamera = useCallback(() => {
    const newCamera = currentCamera === 'front' ? 'back' : 'front';
    setCurrentCamera(newCamera);
    
    if (isStreaming) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  }, [currentCamera, isStreaming, stopCamera, startCamera]);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!trackRef.current) return;

    try {
      const capabilities = trackRef.current.getCapabilities?.() as any;
      if (capabilities?.torch) {
        const newFlashState = !isFlashOn;
        await trackRef.current.applyConstraints({
          advanced: [{ torch: newFlashState } as any],
        });
        setIsFlashOn(newFlashState);
      }
    } catch (err) {
      console.error('Failed to toggle flash:', err);
    }
  }, [isFlashOn]);

  // Process OCR
  const processOCR = useCallback(async (
    imageBase64: string, 
    documentType: DocumentType
  ): Promise<OCRResult | null> => {
    setIsProcessingOCR(true);
    setError(null);

    try {
      // Extract base64 data (remove data:image/jpeg;base64, prefix)
      const base64Data = imageBase64.split(',')[1];
      
      const response = await apiClient.ocrDocument(base64Data, documentType);
      
      const result: OCRResult = {
        documentType,
        fields: response.data.fields || [],
        rawText: response.data.rawText,
        confidence: response.data.confidence || 0,
        processingTime: response.data.processingTime || 0,
      };
      
      setOcrResult(result);
      onOCRComplete?.(result);
      
      return result;
    } catch (err: any) {
      console.error('OCR failed:', err);
      const errorMessage = err.response?.data?.message || 'فشل في معالجة الصورة';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsProcessingOCR(false);
    }
  }, [onOCRComplete, onError]);

  // Clear capture
  const clearCapture = useCallback(() => {
    setCapturedImage(null);
    setOcrResult(null);
  }, []);

  // Clear result
  const clearResult = useCallback(() => {
    setOcrResult(null);
  }, []);

  // Auto-start camera
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  // Create canvas for capture
  useEffect(() => {
    if (typeof document !== 'undefined' && !canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  return {
    // Camera state
    isStreaming,
    isLoading,
    error,
    capabilities,
    
    // Camera controls
    startCamera,
    stopCamera,
    captureImage,
    switchCamera,
    toggleFlash,
    
    // Flash state
    isFlashOn,
    currentCamera,
    
    // OCR state
    capturedImage,
    ocrResult,
    isProcessingOCR,
    processOCR,
    clearCapture,
    clearResult,
    
    // Video ref
    videoRef,
  };
}

export default useCameraOCR;
