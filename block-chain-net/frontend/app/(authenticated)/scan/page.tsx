'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { productsApi, scanApi } from '@/services/api';
import Navbar from '@/components/Navbar';
import QRScannerModal from '@/components/QRScannerModal';
import {
  Camera,
  Package,
  MapPin,
  User,
  Calendar,
  CheckCircle,
  Store,
  Send,
  AlertCircle,
  Loader2,
  ScanLine,
  ArrowLeft,
  Download,
  Printer,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Product } from '@/types';

type ScanStep = 'scan' | 'confirm' | 'processing' | 'success' | 'error';

export default function ScanPage() {
  const { user, hasRole } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<ScanStep>('scan');
  const [showScanner, setShowScanner] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [signature, setSignature] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultMsg, setResultMsg] = useState('');
  const [lastAction, setLastAction] = useState<'sold' | 'shipping' | 'delivered' | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const determineAction = (product: Product): 'sold' | 'shipping' | 'delivered' | null => {
    if (hasRole('RETAILER') && product.status === 'DELIVERED') return 'sold';
    if (hasRole('DISTRIBUTOR') && product.status === 'INSPECTED') return 'shipping';
    if (hasRole('DISTRIBUTOR') && product.status === 'IN_TRANSIT') return 'delivered';
    return null;
  };

  const getActionLabel = (action: 'sold' | 'shipping' | 'delivered'): string => {
    switch (action) {
      case 'sold': return 'Xác nhận đã bán';
      case 'shipping': return 'Bắt đầu giao hàng';
      case 'delivered': return 'Xác nhận đã giao hàng';
    }
  };

  const getActionIcon = (action: 'sold' | 'shipping' | 'delivered') => {
    switch (action) {
      case 'sold': return <Store className="w-5 h-5" />;
      case 'shipping': return <Send className="w-5 h-5" />;
      case 'delivered': return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getActionColor = (action: 'sold' | 'shipping' | 'delivered'): string => {
    switch (action) {
      case 'sold': return 'amber';
      case 'shipping': return 'blue';
      case 'delivered': return 'green';
    }
  };

  const handleScan = async (result: { rawValue: string; signature: string }) => {
    setShowScanner(false);
    
    const parts = result.rawValue.split('|');
    const productId = parts[0];
    const qrSignature = result.signature;
    
    if (!productId) {
      setErrorMsg('Mã QR không hợp lệ');
      setStep('error');
      return;
    }
    
    setSignature(qrSignature);
    setStep('confirm');
    
    try {
      const p = await productsApi.getById(productId);
      setProduct(p);
    } catch (error) {
      const msg = (error as any)?.response?.data?.message || 'Không thể tải thông tin sản phẩm';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  const executeScan = async (action: 'sold' | 'shipping' | 'delivered') => {
    if (!product) return;
    setLastAction(action);
    setStep('processing');
    
    try {
      let successMsg = '';
      switch (action) {
        case 'sold':
          await scanApi.sold(product.id, signature);
          successMsg = 'Sản phẩm đã được xác nhận bán thành công!';
          break;
        case 'shipping':
          await scanApi.shipping(product.id, signature);
          successMsg = 'Đã xác nhận bắt đầu vận chuyển!';
          break;
        case 'delivered':
          await scanApi.delivered(product.id, signature);
          successMsg = 'Đã xác nhận giao hàng thành công!';
          break;
      }
      setResultMsg(successMsg);
      setStep('success');
      toast.success('Quét QR thành công!', successMsg);
    } catch (error) {
      const msg = (error as any)?.response?.data?.message || 'Có lỗi xảy ra khi xử lý';
      setErrorMsg(msg);
      setStep('error');
      toast.error('Thất bại', msg);
    }
  };

  const resetScan = () => {
    setStep('scan');
    setProduct(null);
    setSignature('');
    setErrorMsg('');
    setResultMsg('');
    setLastAction(null);
  };

  const action = product ? determineAction(product) : null;

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `truy-xuat-${product?.id.substring(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    img.src = url;
  };

  const printQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Mã QR truy xuất - ${product?.productName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 30px;
              border: 2px dashed #ccc;
              border-radius: 16px;
            }
            .label {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            .url {
              font-size: 12px;
              color: #999;
              word-break: break-all;
              margin-top: 8px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${svgData}
            <div class="label">Quét mã để truy xuất nguồn gốc sản phẩm</div>
            <div class="url">http://localhost:3000/trace/${product?.id}</div>
          </div>
          <button class="no-print" onclick="window.print()" style="margin-top:30px;padding:12px 32px;background:#059669;color:white;border:none;border-radius:12px;font-size:16px;cursor:pointer">In QR</button>
        </body>
      </html>
    `);
    win.document.close();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <Navbar title="Quét mã QR" />

      <div className="p-6 max-w-2xl mx-auto">
        {/* Step: Scan */}
        {step === 'scan' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Quét mã QR</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Đưa mã QR của sản phẩm vào khung hình để tự động quét. 
              Hệ thống sẽ tự động xác định thao tác dựa trên vai trò của bạn.
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 active:scale-[0.98]"
            >
              <ScanLine className="w-6 h-6" />
              <span className="text-lg">Mở camera</span>
            </button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && product && (
          <div className="space-y-6 animate-fadeIn">
            {/* Product Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{product.productName}</h2>
                    <p className="text-sm text-gray-500">ID: {product.id.substring(0, 12)}...</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Xuất xứ</p>
                      <p className="text-sm font-medium text-gray-900">{product.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Nông dân</p>
                      <p className="text-sm font-medium text-gray-900">{product.farmerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Ngày tạo</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(product.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Package className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Trạng thái</p>
                      <p className="text-sm font-medium text-gray-900">{product.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            {action === 'sold' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Xác nhận đã bán
                </h3>
                <p className="text-sm text-amber-700 mb-4">
                  Xác nhận sản phẩm này đã được bán cho khách hàng?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => executeScan('sold')}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Xác nhận đã bán
                  </button>
                  <button
                    onClick={resetScan}
                    className="px-5 py-3 bg-white text-gray-600 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            {action === 'shipping' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Bắt đầu giao hàng
                </h3>
                <p className="text-sm text-blue-700 mb-4">
                  Xác nhận bắt đầu vận chuyển sản phẩm này?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => executeScan('shipping')}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Xác nhận giao hàng
                  </button>
                  <button
                    onClick={resetScan}
                    className="px-5 py-3 bg-white text-gray-600 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            {action === 'delivered' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Xác nhận đã giao hàng
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  Xác nhận đã giao sản phẩm này đến điểm bán?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => executeScan('delivered')}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Xác nhận đã giao
                  </button>
                  <button
                    onClick={resetScan}
                    className="px-5 py-3 bg-white text-gray-600 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            {!action && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-1">Không có thao tác phù hợp</h3>
                    <p className="text-sm text-yellow-700">
                      Sản phẩm này không ở trạng thái yêu cầu thao tác từ bạn.
                      {hasRole('RETAILER') && ' Chỉ có thể bán sản phẩm đã được giao (DELIVERED).'}
                      {hasRole('DISTRIBUTOR') && ' Chỉ có thể vận chuyển sản phẩm đã duyệt (INSPECTED) hoặc đang vận chuyển (IN_TRANSIT).'}
                    </p>
                    <button
                      onClick={resetScan}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Quét lại
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Đang xử lý...</h2>
            <p className="text-gray-500">Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Thành công!</h2>
              <p className="text-gray-500">{resultMsg || 'Thao tác đã được xử lý thành công'}</p>
            </div>

            {/* QR Code for delivered products */}
            {lastAction === 'delivered' && product && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 max-w-sm mx-auto">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">Mã QR truy xuất sản phẩm</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Dán mã này lên sản phẩm để người dùng quét truy xuất nguồn gốc
                  </p>
                </div>

                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4 mb-4">
                  <div ref={qrRef} className="flex justify-center">
                    <QRCodeSVG
                      value={`http://localhost:3000/trace/${product.id}`}
                      size={200}
                      level="M"
                      includeMargin
                      className="rounded-lg"
                    />
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 font-mono break-all">
                    http://localhost:3000/trace/{product.id}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={downloadQR}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Tải QR
                  </button>
                  <button
                    onClick={printQR}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    In QR
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={resetScan}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <ScanLine className="w-5 h-5" />
                Quét tiếp
              </button>
              {product && (
                <a
                  href={`/products/${product.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-5 h-5" />
                  Xem sản phẩm
                </a>
              )}
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Thất bại</h2>
            <p className="text-gray-500 mb-2">{errorMsg || 'Có lỗi xảy ra khi xử lý'}</p>
            <p className="text-sm text-gray-400 mb-8">Vui lòng thử lại hoặc kiểm tra mã QR</p>
            <button
              onClick={resetScan}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Camera className="w-5 h-5" />
              Quét lại
            </button>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
        title="Quét mã QR sản phẩm"
        description="Đưa mã QR vào khung hình để quét tự động"
      />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
