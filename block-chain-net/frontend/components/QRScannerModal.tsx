'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Camera, X, CheckCircle, AlertCircle, RefreshCw, Scan } from 'lucide-react';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner),
  { ssr: false }
);

interface ScanResult {
  rawValue: string;
  signature: string;
}

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: ScanResult) => Promise<void>;
  title?: string;
  description?: string;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Quét mã QR',
  description = 'Đưa mã QR vào khung hình để quét tự động',
}: QRScannerModalProps) {
  const [scanState, setScanState] = useState<'idle' | 'loading' | 'scanning' | 'success' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  const handleQRDetected = useCallback((detectedCodes: any[]) => {
    if (!detectedCodes || detectedCodes.length === 0) return;
    const code = detectedCodes[0];
    navigator.vibrate?.(200);
    setScanState('success');
    
    // Parse QR: productId|signature
    const rawValue = code.rawValue.trim();
    const parts = rawValue.split('|');
    const signature = parts.length >= 2 ? parts[1] : rawValue;
    
    onScan({ rawValue, signature });
  }, [onScan]);

  const handleScannerError = useCallback((error: any) => {
    console.error('Scanner error:', error);
    setScanState('error');
    if (error.kind === 'permission-denied') {
      setCameraError('Quyền truy cập camera bị từ chối. Vui lòng cho phép truy cập camera.');
    } else if (error.kind === 'no-camera') {
      setCameraError('Không tìm thấy camera');
    } else {
      setCameraError(error.message || 'Không thể khởi tạo scanner');
    }
  }, []);

  const handleReset = () => {
    setScanState('loading');
    setCameraError(null);
    setScannerKey(k => k + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-sm text-emerald-100">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-6">
          <div className="relative mx-auto max-w-xs rounded-2xl overflow-hidden bg-black shadow-xl">
            <div className="aspect-square relative">
              <Scanner
                key={scannerKey}
                onScan={handleQRDetected}
                onError={handleScannerError}
                constraints={{ facingMode: 'environment' }}
                formats={['qr_code']}
                styles={{
                  container: { width: '100%', height: '100%', position: 'absolute', inset: '0' },
                  video: { objectFit: 'cover' },
                }}
              />

              {/* Loading */}  
              {scanState === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70 z-10">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 border-[3px] border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-base font-medium">Đang khởi tạo camera...</p>
                </div>
              )}

              {/* Error */}
              {scanState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70 p-8 z-10">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <Camera className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-lg font-medium text-center mb-2">Không thể truy cập camera</p>
                  <p className="text-sm text-gray-400 text-center mb-6">
                    {cameraError || 'Đã có lỗi xảy ra'}
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Thử lại
                  </button>
                </div>
              )}

              {/* Scan overlay */}
              {scanState !== 'error' && scanState !== 'success' && (
                <>
                  <div className="absolute inset-0 z-[5] pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-[calc(50%-125px)] bg-gradient-to-b from-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-[calc(50%-125px)] bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute top-0 bottom-0 left-0 w-[calc(50%-125px)] bg-gradient-to-r from-black/30 to-transparent" />
                    <div className="absolute top-0 bottom-0 right-0 w-[calc(50%-125px)] bg-gradient-to-l from-black/30 to-transparent" />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="relative w-[200px] h-[200px]">
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-lg" />
                      <div className="absolute left-1 right-1 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-line shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-sm font-medium">Đang quét...</span>
                    </div>
                  </div>
                </>
              )}

              {/* Success */}
              {scanState === 'success' && (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/95 to-teal-600/95 flex items-center justify-center z-20">
                  <div className="text-center text-white p-8 animate-fadeIn">
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <p className="text-xl font-bold mb-1">Đã quét thành công!</p>
                    <p className="text-sm text-emerald-100">Đang xử lý dữ liệu...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-400 text-center mt-3">
            Đưa mã QR vào giữa khung hình, cách camera 10-30cm
          </p>

          {/* Manual fallback */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Scan className="w-4 h-4" />
              Huỷ quét
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line {
          0%, 100% { top: 10%; }
          50% { top: 88%; }
        }
        .animate-scan-line {
          animation: scan-line 2.2s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
