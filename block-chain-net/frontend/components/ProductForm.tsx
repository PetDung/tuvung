'use client';

import { useState } from 'react';
import type { ProductFormData } from '@/types';

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    productName: initialData?.productName || '',
    category: initialData?.category || '',
    origin: initialData?.origin || '',
    harvestDate: initialData?.harvestDate || '',
    grade: initialData?.grade || '',
    description: initialData?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">
          Tên sản phẩm *
        </label>
        <input
          type="text"
          id="productName"
          name="productName"
          value={formData.productName}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="VD: Thanh long Ruột đỏ"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Loại sản phẩm
          </label>
          <select
            id="category"
            name="category"
            value={formData.category || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Chọn loại</option>
            <option value="RAU">Rau</option>
            <option value="TRAI_CAY">Trái cây</option>
            <option value="THUC_AN">Thực phẩm</option>
            <option value="KHAC">Khác</option>
          </select>
        </div>

        <div>
          <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
            Xếp hạng
          </label>
          <select
            id="grade"
            name="grade"
            value={formData.grade || ''}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Chưa đánh giá</option>
            <option value="A">A - Cao cấp</option>
            <option value="B">B - Tốt</option>
            <option value="C">C - Trung bình</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
          Nơi sản xuất / Xuất xứ *
        </label>
        <input
          type="text"
          id="origin"
          name="origin"
          value={formData.origin || ''}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="VD: Bình Thuận, Việt Nam"
        />
      </div>

      <div>
        <label htmlFor="harvestDate" className="block text-sm font-medium text-gray-700 mb-1">
          Ngày thu hoạch
        </label>
        <input
          type="date"
          id="harvestDate"
          name="harvestDate"
          value={formData.harvestDate || ''}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả sản phẩm
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="Mô tả chi tiết về sản phẩm..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Đang xử lý...' : 'Tạo sản phẩm'}
        </button>
      </div>
    </form>
  );
}
