'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { shipmentsApi } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import {
  Truck,
  Package,
  MapPin,
  Calendar,
  ArrowLeft,
  User,
  CheckCircle,
} from 'lucide-react';
import type { Shipment } from '@/types';

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { hasRole } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    loadShipment();
  }, [resolvedParams.id]);

  const loadShipment = async () => {
    try {
      const data = await shipmentsApi.getById(resolvedParams.id);
      setShipment(data);
    } catch (error) {
      console.error('Error loading shipment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      await shipmentsApi.accept(resolvedParams.id);
      toast.success('Nhận đơn thành công', 'Bạn đã nhận đơn vận chuyển');
      loadShipment();
    } catch (error) {
      console.error('Error accepting shipment:', error);
    }
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

  if (!shipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy đơn hàng</h2>
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
      <Navbar title="Chi tiết vận chuyển" />

      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>

        <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Đơn hàng #{shipment.id.substring(0, 8)}
                    </h1>
                    <p className="text-gray-500">Mã vận chuyển</p>
                  </div>
                </div>
                <StatusBadge status={shipment.status} size="lg" />
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Product Info — clickable to product detail */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Sản phẩm</h3>
                <Link
                  href={`/products/${shipment.productId}`}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-emerald-50 transition-colors group"
                >
                  <Package className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all" />
                  <span className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
                    {shipment.productName}
                  </span>
                </Link>
              </div>

              {/* Route */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Lộ trình</h3>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                    <div>
                      <p className="text-xs text-gray-500">Từ</p>
                      <p className="font-medium text-gray-900">{shipment.fromUserName}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-gray-300 border-dashed mx-4"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                    <div>
                      <p className="text-xs text-gray-500">Đến</p>
                      <p className="font-medium text-gray-900">{shipment.toUserName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Ngày tạo</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(shipment.createdAt)}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Cập nhật lần cuối</h3>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(shipment.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {hasRole('DISTRIBUTOR') && shipment.status === 'PENDING' && !shipment.distributorId && (
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={handleAccept}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Chấp nhận đơn hàng
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
