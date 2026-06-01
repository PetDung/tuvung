'use client';

import Link from 'next/link';
import { Package, MapPin, Calendar, User, ShoppingCart } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onApprove?: () => void;
  onRequestShip?: () => void;
}

export default function ProductCard({
  product,
  onApprove,
  onRequestShip,
}: ProductCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-hover-light">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{product.productName || product.id}</h3>
              <p className="text-sm text-gray-500">
                {product.category || 'Chưa phân loại'}
              </p>
            </div>
          </div>
          <StatusBadge status={product.status} size="sm" />
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span>Nông dân: {product.farmerName || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{product.origin || 'Chưa có địa điểm'}</span>
          </div>
          {product.harvestDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Thu hoạch: {formatDate(product.harvestDate)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {product.description}
          </p>
        )}

        {/* Actions */}
        {(onApprove || onRequestShip) && (
          <div className="flex gap-2 pt-4 border-t border-gray-100">
            {onApprove && product.status === 'REGISTERED' && (
              <button
                onClick={onApprove}
                className="flex-1 px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 btn-press transition-colors"
              >
                Duyệt sản phẩm
              </button>
            )}
            {onRequestShip && product.status === 'INSPECTED' && !product.hasActiveShipment && (
              <button
                onClick={onRequestShip}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 btn-press transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Yêu cầu vận chuyển
              </button>
            )}
            {onRequestShip && product.status === 'INSPECTED' && product.hasActiveShipment && (
              <div className="flex-1 px-3 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg text-center">
                Đã có đơn vận chuyển
              </div>
            )}
          </div>
        )}

        {/* View Details Link */}
        <Link
          href={`/products/${product.id}`}
          className="block mt-4 text-center text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          Xem chi tiết &rarr;
        </Link>
      </div>
    </div>
  );
}
