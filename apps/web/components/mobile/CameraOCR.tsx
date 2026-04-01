'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface OCRResult {
  confidence: number;
  extractedFields: Record<string, string>;
  rawText: string;
}

interface CameraOCRProps {
  onExtracted?: (data: Record<string, string>) => void;
  documentType?: 'national_id' | 'contract' | 'receipt' | 'property_doc';
  autoFillFields?: string[];
}

export default function CameraOCR({ 
  onExtracted, 
  documentType = 'national_id',
  autoFillFields = []
}: CameraOCRProps) {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('فشل في الوصول للكاميرا. تأكد من إذن الكاميرا.');
      toast.error('فشل في الوصول للكاميرا');
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const openCamera = () => {
    setIsOpen(true);
    startCamera();
  };

  const closeCamera = () => {
    stopCamera();
    setIsOpen(false);
    setCapturedImage(null);
    setResult(null);
    setError(null);
  };

  const toggleCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(() => startCamera(), 100);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    setResult(null);
    startCamera();
  };

  const processOCR = async () => {
    if (!capturedImage) return;

    setProcessing(true);
    setError(null);

    try {
      // Convert base64 to blob
      const base64Data = capturedImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');
      formData.append('documentType', documentType);
      
      // Call OCR API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/documents/ocr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('فشل في معالجة الصورة');
      }

      const data = await response.json();
      setResult(data);
      
      if (data.extractedFields && onExtracted) {
        onExtracted(data.extractedFields);
      }
      
      toast.success('تم استخراج البيانات بنجاح');
    } catch (err: any) {
      console.error('OCR error:', err);
      setError(err.message || 'فشل في معالجة الصورة');
      toast.error('فشل في معالجة الصورة');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCapturedImage(dataUrl);
      setIsOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const FieldLabels: Record<string, string> = {
    national_id_number: 'الرقم القومي',
    name_ar: 'الاسم بالعربي',
    name_en: 'الاسم بالإنجليزي',
    address: 'العنوان',
    birth_date: 'تاريخ الميلاد',
    phone: 'رقم الهاتف',
    property_address: 'عنوان العقار',
    property_area: 'مساحة العقار',
    property_price: 'سعر العقار',
    contract_date: 'تاريخ العقد',
    client_name: 'اسم العميل',
    broker_name: 'اسم السمسار',
    commission: 'العمولة',
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={openCamera}
        className="btn btn-primary flex items-center gap-2"
      >
        <Camera className="w-4 h-4" />
        <span>مسح ضوئي</span>
      </button>

      {/* Camera Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
            <h2 className="text-white font-semibold">مسح المستند</h2>
            <button
              onClick={closeCamera}
              className="p-2 text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Camera View / Captured Image */}
          <div className="flex-1 relative">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanning Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 max-w-sm aspect-video border-2 border-white/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                  </div>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="bg-white rounded-lg p-6 text-center max-w-sm">
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-gray-700 mb-4">{error}</p>
                      <button
                        onClick={startCamera}
                        className="btn btn-primary"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
                
                {/* Processing Overlay */}
                {processing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                      <p>جارٍ معالجة الصورة...</p>
                    </div>
                  </div>
                )}
                
                {/* OCR Result */}
                {result && !processing && (
                  <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold">تم استخراج البيانات</h3>
                      <span className="text-xs text-gray-500 mr-auto">
                        دقة: {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.entries(result.extractedFields).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-500 text-sm">
                            {FieldLabels[key] || key}
                          </span>
                          <span className="font-medium text-sm">{value}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          if (onExtracted && result) {
                            onExtracted(result.extractedFields);
                          }
                          closeCamera();
                        }}
                        className="btn btn-primary flex-1"
                      >
                        استخدام البيانات
                      </button>
                      <button
                        onClick={retake}
                        className="btn btn-ghost"
                      >
                        إعادة
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            {!capturedImage ? (
              <div className="flex items-center justify-center gap-8">
                {/* Upload from gallery */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-white hover:bg-white/20 rounded-full"
                >
                  <ImageIcon className="w-6 h-6" />
                </button>
                
                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-full border-4 border-gray-800" />
                </button>
                
                {/* Switch Camera */}
                <button
                  onClick={toggleCamera}
                  className="p-3 text-white hover:bg-white/20 rounded-full"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
              </div>
            ) : (
              !result && !processing && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={retake}
                    className="btn btn-ghost text-white"
                  >
                    <RotateCcw className="w-4 h-4 ml-1" />
                    إعادة
                  </button>
                  <button
                    onClick={processOCR}
                    className="btn btn-primary"
                  >
                    <Upload className="w-4 h-4 ml-1" />
                    معالجة
                  </button>
                </div>
              )
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </>
  );
}
