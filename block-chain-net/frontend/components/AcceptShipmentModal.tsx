'use client';

import { useState } from 'react';
import type { Shipment } from '@/types';

interface AcceptShipmentModalProps {
  shipment: Shipment;
  onSubmit: (data: { transportType?: string; vehiclePlate?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export default function AcceptShipmentModal({ shipment, onSubmit, onCancel, isLoading }: AcceptShipmentModalProps) {
  const [transportType, setTransportType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      transportType: transportType || undefined,
      vehiclePlate: vehiclePlate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Nhận đơn vận chuyển</h2>
          <p className="text-gray-500 mt-1">Xác nhận nhận đơn và cung cấp thông tin vận chuyển</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Shipment Info */}
          <div className="bg-emerald-50 rounded-lg p-4 mb-6">
            <p className="font-medium text-gray-900">{shipment.productName}</p>
            <p className="text-sm text-gray-600">
              Từ: {shipment.fromLocation} → Đến: {shipment.toLocation}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phương tiện vận chuyển <span className="text-red-500">*</span>
              </label>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Chọn phương tiện</option>
                <option value="TRUCK">Xe tải</option>
                <option value="VAN">Xe van</option>
                <option value="MOTORCYCLE">Xe máy</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Biển số xe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                required
                placeholder="Ví d: 59A-12345"
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
              disabled={isLoading || !transportType || !vehiclePlate}
              className="flex-1 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Đang xử lý...' : 'Nhận đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
