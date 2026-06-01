'use client';

import { useState } from 'react';
import type { Product } from '@/types';

interface ShipmentModalProps {
  product: Product;
  onSubmit: (data: { productId: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ShipmentModal({ product, onSubmit, onCancel, isLoading }: ShipmentModalProps) {
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      productId: product.id,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Yêu cầu vận chuyển</h2>
          <p className="text-gray-500 mt-1">Tạo yêu cầu giao hàng cho sản phẩm</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Product Info */}
          <div className="bg-emerald-50 rounded-lg p-4 mb-6">
            <p className="font-medium text-gray-900">{product.productName}</p>
            <p className="text-sm text-gray-600">Nông dân: {product.farmerName}</p>
          </div>

          {/* Route Info - Auto filled */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
              <span className="text-sm text-gray-600">
                Từ: {product.origin || 'Nguồn gốc sản phẩm'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-sm text-gray-600">
                Đến: Địa chỉ cửa hàng của bạn (tự động)
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Yêu cầu đặc biệt..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
