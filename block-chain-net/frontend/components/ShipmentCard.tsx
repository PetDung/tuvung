'use client';

import Link from 'next/link';
import { Truck, Package, MapPin, User, Play, CheckCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Shipment } from '@/types';

interface ShipmentCardProps {
  shipment: Shipment;
  onAccept?: () => void;
  onStartShipping?: () => void;
  onDelivered?: () => void;
}

export default function ShipmentCard({ 
  shipment, 
  onAccept, 
  onStartShipping,
  onDelivered,
}: ShipmentCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-hover-light">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              shipment.status === 'PENDING' ? 'bg-amber-100' :
              shipment.status === 'ACCEPTED' ? 'bg-blue-100' :
              shipment.status === 'IN_TRANSIT' ? 'bg-purple-100' :
              'bg-green-100'
            }`}>
              <Truck className={`w-6 h-6 ${
                shipment.status === 'PENDING' ? 'text-amber-600' :
                shipment.status === 'ACCEPTED' ? 'text-blue-600' :
                shipment.status === 'IN_TRANSIT' ? 'text-purple-600' :
                'text-green-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                #{shipment.id.substring(0, 8)}
              </h3>
              <p className="text-sm text-gray-500">
                {formatDate(shipment.createdAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={shipment.status} size="sm" />
        </div>

        {/* Product Info — clickable to product detail */}
        <Link
          href={`/products/${shipment.productId}`}
          className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors group"
        >
          <Package className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-gray-800 group-hover:text-emerald-700 transition-colors">
            {shipment.productName || 'Sản phẩm'}
          </span>
        </Link>

        {/* Route */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 mt-1 bg-emerald-500 rounded-full"></div>
            <div>
              <p className="text-sm text-gray-500">Từ</p>
              <p className="text-sm font-medium text-gray-800">{shipment.fromUserName}</p>
              <p className="text-xs text-gray-500">{shipment.fromLocation}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 mt-1 bg-blue-500 rounded-full"></div>
            <div>
              <p className="text-sm text-gray-500">Đến</p>
              <p className="text-sm font-medium text-gray-800">{shipment.toUserName}</p>
              <p className="text-xs text-gray-500">{shipment.toLocation}</p>
            </div>
          </div>
        </div>

        {/* Distributor Info */}
        {shipment.distributorName && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-purple-50 rounded-lg">
            <User className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700">
              Người giao: {shipment.distributorName}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {onAccept && shipment.status === 'PENDING' && (
            <button
              onClick={onAccept}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 btn-press transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Nhận đơn giao
            </button>
          )}
          
          {onStartShipping && shipment.status === 'ACCEPTED' && (
            <button
              onClick={onStartShipping}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 btn-press transition-colors"
            >
              <Play className="w-4 h-4" />
              Bắt đầu vận chuyển
            </button>
          )}
          
          {onDelivered && shipment.status === 'IN_TRANSIT' && (
            <button
              onClick={onDelivered}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 btn-press transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Xác nhận đã giao
            </button>
          )}
        </div>

        {/* View Details Link */}
        <Link
          href={`/shipments/${shipment.id}`}
          className="block mt-4 text-center text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          Xem chi tiết &rarr;
        </Link>
      </div>
    </div>
  );
}
