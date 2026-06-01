'use client';

import { useState } from 'react';
import type { Product, ApproveProductRequest } from '@/types';

interface ApproveModalProps {
  product: Product;
  onSubmit: (data: ApproveProductRequest) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ApproveModal({ product, onSubmit, onCancel, isLoading }: ApproveModalProps) {
  const [location, setLocation] = useState('');
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ location, grade: grade || undefined, notes: notes || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Duyệt sản phẩm</h2>
          <p className="text-gray-500 mt-1">Xác nhận kiểm định sản phẩm</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="font-medium text-gray-900">{product.productName}</p>
            <p className="text-sm text-gray-500">Nông dân: {product.farmerName}</p>
            <p className="text-sm text-gray-500">Nguồn gốc: {product.origin}</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa điểm kiểm tra <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="Ví dụ: Kho kiểm tra TP.HCM"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xếp hạng chất lượng
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Chọn xếp hạng</option>
                <option value="A">A - Chất lượng cao</option>
                <option value="B">B - Chất lượng tốt</option>
                <option value="C">C - Chất lượng trung bình</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Nhận xét về sản phẩm..."
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
              disabled={isLoading || !location}
              className="flex-1 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Đang xử lý...' : 'Duyệt sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
