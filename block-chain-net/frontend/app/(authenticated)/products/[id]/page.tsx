'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { productsApi } from '@/services/api';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import HistoryTimeline from '@/components/HistoryTimeline';
import { QRCodeSVG } from 'qrcode.react';
import {
  Package,
  MapPin,
  Calendar,
  User,
  ArrowLeft,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  Download,
  Printer,
} from 'lucide-react';
import type { Product, ProductEvent } from '@/types';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { hasRole } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const traceQrRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    loadProductData();
  }, [resolvedParams.id]);

  const loadProductData = async () => {
    try {
      const [productData, historyData] = await Promise.all([
        productsApi.getById(resolvedParams.id),
        productsApi.getHistory(resolvedParams.id),
      ]);
      setProduct(productData);
      // Convert history items to events format for display
      const events = historyData.map((item, index) => ({
        id: `${index}`,
        productId: productData.id,
        eventType: item.action,
        description: item.location || '',
        userId: item.actorId,
        userName: item.actorName,
        timestamp: item.timestamp,
      }));
      setEvents(events);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const data = { location: 'Inspection', notes: '' };
      await productsApi.approve(resolvedParams.id, data);
      toast.success('Duyệt sản phẩm thành công', 'Sản phẩm đã được kiểm định');
      loadProductData();
    } catch (error) {
      console.error('Error approving product:', error);
    }
  };

  const downloadTraceQR = () => {
    const svg = traceQrRef.current?.querySelector('svg');
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

  const printTraceQR = () => {
    const svg = traceQrRef.current?.querySelector('svg');
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderQR = () => {
    // BE kiểm soát QR visibility: nếu qrHiddenReason có giá trị, QR bị ẩn
    if (!product || !product.qrCode) {
      const reason = product?.qrHiddenReason;
      return (
        <div className="bg-gray-100 w-[180px] h-[180px] flex items-center justify-center mb-4 rounded-lg">
          <div className="text-center px-4">
            <p className="text-sm text-gray-500">{reason || 'Chưa có QR'}</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
          <QRCodeSVG 
            value={product.qrCode} 
            size={200} 
            level="M"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
        
        <button
          onClick={() => setShowQR(!showQR)}
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mb-4"
        >
          {showQR ? 'Ẩn QR' : 'Hiện QR lớn'}
        </button>

        <div className="w-full">
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <code className="flex-1 text-xs text-gray-600 truncate">
              {product.qrCode}
            </code>
            <button
              onClick={() => copyToClipboard(product.qrCode || '')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </>
    );
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
          <button
            onClick={() => router.back()}
            className="text-emerald-600 hover:text-emerald-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar title="Chi tiết sản phẩm" />

      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Package className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{product.productName}</h1>
                      <p className="text-gray-500">ID: {product.id}</p>
                    </div>
                  </div>
                  <StatusBadge status={product.status} size="lg" />
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Xuất xứ</p>
                      <p className="font-medium text-gray-900">{product.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Nông dân</p>
                      <p className="font-medium text-gray-900">{product.farmerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Ngày tạo</p>
                      <p className="font-medium text-gray-900">{formatDate(product.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Cập nhật</p>
                      <p className="font-medium text-gray-900">{formatDate(product.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Mô tả</h3>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                    {product.description || 'Không có mô tả'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  {hasRole('INSPECTOR') && product.status === 'REGISTERED' && (
                    <button
                      onClick={handleApprove}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Duyệt sản phẩm
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* History Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Lịch sử sản phẩm</h2>
              <HistoryTimeline events={events} />
            </div>
          </div>

          {/* QR Code Sidebar */}
          <div className="space-y-6">
            {/* QR Code Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mã QR Code</h2>
              <div className="flex flex-col items-center">
                {renderQR()}
              </div>
            </div>

            {/* Trace QR Code - In ra dán lên sản phẩm */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Truy xuất nguồn gốc</h2>
              <p className="text-sm text-gray-500 mb-4">
                Mã QR này dùng để in và dán lên sản phẩm. Người dùng quét sẽ vào trang truy xuất.
              </p>

              <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4 mb-4 flex justify-center">
                <div ref={traceQrRef}>
                  <QRCodeSVG
                    value={`http://localhost:3000/trace/${product.id}`}
                    size={180}
                    level="M"
                    includeMargin
                  />
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="text-xs text-gray-400 font-mono break-all">
                  http://localhost:3000/trace/{product.id}
                </p>
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={downloadTraceQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Tải QR
                </button>
                <button
                  onClick={printTraceQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                >
                  <Printer className="w-4 h-4" />
                  In QR
                </button>
              </div>

              <a
                href={`/trace/${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Xem trang truy xuất
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
