'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { QrCode, Camera, X, AlertCircle, CheckCircle, RefreshCw, Keyboard, ScanLine, Truck, MapPin } from 'lucide-react';
import type { Shipment } from '@/types';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner),
  { ssr: false }
);

interface ScanVerificationModalProps {
  shipment: Shipment;
  action: 'shipping' | 'delivered';
  onVerified: (productId: string, signature: string) => void;
  onCancel: () => void;
}

function parseQRCode(qrContent: string): { productId: string; signature: string } | null {
  const parts = qrContent.split('|');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { productId: parts[0], signature: parts[1] };
  }
  return { productId: qrContent, signature: '' };
}

export default function ScanVerificationModal({
  shipment,
  action,
  onVerified,
  onCancel,
}: ScanVerificationModalProps) {
  const [step, setStep] = useState<'info' | 'scan'>('info');
  const [scanState, setScanState] = useState<'idle' | 'loading' | 'scanning' | 'success' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  const isShipping = action === 'shipping';

  const handleScan = useCallback((detectedCodes: any[]) => {
    if (!detectedCodes || detectedCodes.length === 0) return;
    const code = detectedCodes[0];
    console.log('QR detected:', code.rawValue);

    const parsed = parseQRCode(code.rawValue);
    if (!parsed) {
      setScanState('error');
      setCameraError('Invalid QR code format');
      return;
    }

    setScanState('success');
    setScanResult({ success: true, message: 'Đã quét mã QR!' });

    setTimeout(() => {
      onVerified(parsed.productId, parsed.signature);
    }, 1000);
  }, [onVerified]);

  const handleError = useCallback((error: any) => {
    console.error('Scanner error:', error);
    setScanState('error');
    if (error.kind === 'permission-denied') {
      setCameraError('Quyền truy cập camera bị từ chối.');
    } else if (error.kind === 'no-camera') {
      setCameraError('Không tìm thấy camera');
    } else {
      setCameraError(error.message || 'Không thể khởi tạo scanner');
    }
  }, []);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      const parsed = parseQRCode(manualInput.trim());
      if (!parsed) {
        alert('Invalid QR code format');
        return;
      }
      setScanState('success');
      setScanResult({ success: true, message: 'Đã xác nhận thủ công!' });
      setTimeout(() => { onVerified(parsed.productId, parsed.signature); }, 1000);
    }
  };

  const handleClose = () => {
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
        {/* ── Header ── */}
        <div className={`relative overflow-hidden ${isShipping ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
          <div className="absolute inset-0 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 80%)' }} />
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-white/20 rounded-xl`}>
                  {isShipping ? <Truck className="w-5 h-5 text-white" /> : <CheckCircle className="w-5 h-5 text-white" />}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {isShipping ? 'Bắt đầu giao hàng' : 'Xác nhận đã giao'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-6">
          {step === 'info' ? (
            <>
              {/* Shipment Info Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 mb-5 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                    <Truck className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Đơn hàng</p>
                    <p className="text-xs text-gray-500 font-mono">#{shipment.id.substring(0, 8)}</p>
                  </div>
                </div>
                <div className="space-y-2 pl-[52px]">
                  <p className="text-sm font-medium text-gray-800">{shipment.productName || 'Không có tên'}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{shipment.fromLocation || shipment.fromUserName} → {shipment.toLocation || shipment.toUserName}</span>
                  </div>
                </div>
              </div>

              {/* QR Instruction */}
              <div className={`rounded-xl p-4 mb-6 border ${isShipping ? 'bg-amber-50/80 border-amber-200/50' : 'bg-emerald-50/80 border-emerald-200/50'}`}>
                <div className="flex items-start gap-3">
                  <Camera className={`w-5 h-5 mt-0.5 shrink-0 ${isShipping ? 'text-amber-500' : 'text-emerald-500'}`} />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Xác minh bằng QR Code</p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      Quét mã QR trên sản phẩm để xác nhận{' '}
                      <strong>{isShipping ? 'bắt đầu vận chuyển' : 'đã giao hàng thành công'}</strong>.
                      Mỗi mã QR chỉ dùng được một lần.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
                >
                  Hủy
                </button>
                <button
                  onClick={() => setStep('scan')}
                  className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl transition-all active:scale-[0.98] shadow-sm hover:shadow-md flex items-center justify-center gap-2 ${
                    isShipping
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Quét QR
                </button>
              </div>
            </>
          ) : (
            /* Scan Step */
            <>
              {/* Scanner Container */}
              <div className="relative mx-auto max-w-xs rounded-xl overflow-hidden bg-gray-900 shadow-lg mb-4">
                {/* The Scanner component - always mounted in scan step */}
                <div className="aspect-square relative">
                  <Scanner
                    key={scannerKey}
                    onScan={handleScan}
                    onError={handleError}
                    constraints={{ facingMode: 'environment' }}
                    paused={scanState === 'success'}
                    formats={['qr_code']}
                    styles={{
                      container: { width: '100%', height: '100%', position: 'absolute', inset: '0' },
                      video: { objectFit: 'cover' },
                    }}
                  />
                </div>

                {/* Loading overlay */}
                {scanState === 'loading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70">
                    <div className="w-12 h-12 border-[3px] border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
                    <p className="text-sm">Đang khởi tạo camera...</p>
                  </div>
                )}

                {/* Error overlay */}
                {scanState === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 bg-black/70">
                    <Camera className="w-10 h-10 text-red-400 mb-3" />
                    <p className="text-sm text-center text-red-300 mb-4">{cameraError || 'Camera không khả dụng'}</p>
              <button
                onClick={() => {
                  setScanState('loading');
                  setCameraError(null);
                  setScannerKey(k => k + 1);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử lại
              </button>
            </div>
                )}

                {/* Scanning overlay - visible when camera is active */}
                {scanState !== 'error' && scanState !== 'success' && (
                  <>
                    <div className="absolute inset-0 z-[5] pointer-events-none">
                      <div className="absolute top-0 left-0 right-0 h-[calc(50%-125px)] bg-gradient-to-b from-gray-900/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 h-[calc(50%-125px)] bg-gradient-to-t from-gray-900/70 to-transparent" />
                      <div className="absolute top-0 bottom-0 left-0 w-[calc(50%-125px)] bg-gradient-to-r from-gray-900/50 to-transparent" />
                      <div className="absolute top-0 bottom-0 right-0 w-[calc(50%-125px)] bg-gradient-to-l from-gray-900/50 to-transparent" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="relative w-[250px] h-[250px]">
                        <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-lg" />
                        <div className="absolute left-1 right-1 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-line-modal shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-medium">Đang quét...</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Success overlay */}
                {scanResult && (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/95 to-teal-600/95 flex items-center justify-center z-20 animate-fadeIn">
                    <div className="text-center text-white">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-semibold">{scanResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Product hint */}
              <div className="text-center mb-3">
                <p className="text-xs text-gray-500">
                  Sản phẩm: <span className="font-mono text-gray-700 font-medium">{shipment.productId.substring(0, 8)}...</span>
                </p>
              </div>

              {/* Manual input */}
              {!showManualInput ? (
                <button
                  onClick={() => setShowManualInput(true)}
                  className="w-full py-2 text-sm text-blue-600 font-medium hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all flex items-center justify-center gap-1.5 mb-2"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Nhập mã thủ công
                </button>
              ) : (
                <div className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nhập nội dung QR:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="productId|signature"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none bg-white"
                    />
                    <button
                      onClick={handleManualSubmit}
                      disabled={!manualInput.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              )}

              {/* Back button */}
              <button
                onClick={() => { setStep('info'); }}
                className="w-full py-2 text-sm text-gray-500 font-medium hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
              >
                ← Quay lại
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line-modal {
          0%, 100% { top: 12%; }
          50% { top: 85%; }
        }
        .animate-scan-line-modal {
          animation: scan-line-modal 2s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
