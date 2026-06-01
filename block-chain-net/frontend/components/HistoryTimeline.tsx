'use client';

import { CheckCircle, Clock, Package, Truck, Store, User, Shield } from 'lucide-react';
import type { ProductEvent } from '@/types';

interface HistoryTimelineProps {
  events: ProductEvent[];
}

const eventIcons: Record<string, React.ReactNode> = {
  REGISTERED: <Package className="w-5 h-5" />,
  INSPECTED: <Shield className="w-5 h-5" />,
  SHIPPED: <Truck className="w-5 h-5" />,
  DELIVERED: <CheckCircle className="w-5 h-5" />,
  SOLD: <Store className="w-5 h-5" />,
  IN_TRANSIT: <Truck className="w-5 h-5" />,
  default: <Clock className="w-5 h-5" />,
};

const eventColors: Record<string, string> = {
  REGISTERED: 'bg-gray-500',
  INSPECTED: 'bg-blue-500',
  SHIPPED: 'bg-yellow-500',
  DELIVERED: 'bg-green-500',
  SOLD: 'bg-purple-500',
  IN_TRANSIT: 'bg-yellow-500',
  default: 'bg-gray-400',
};

export default function HistoryTimeline({ events }: HistoryTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Chưa có lịch sử</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

      {/* Events */}
      <div className="space-y-6">
        {events.map((event, index) => {
          const icon = eventIcons[event.eventType] || eventIcons.default;
          const color = eventColors[event.eventType] || eventColors.default;
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon */}
              <div
                className={`relative z-10 w-12 h-12 ${color} rounded-full flex items-center justify-center text-white shadow-lg flex-shrink-0`}
              >
                {icon}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-6 ${isLast ? '' : 'border-b border-gray-100'}`}>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {event.eventType === 'REGISTERED' && 'Đăng ký sản phẩm'}
                      {event.eventType === 'INSPECTED' && 'Kiểm tra sản phẩm'}
                      {event.eventType === 'SHIPPED' && 'Bắt đầu vận chuyển'}
                      {event.eventType === 'IN_TRANSIT' && 'Đang vận chuyển'}
                      {event.eventType === 'DELIVERED' && 'Đã giao hàng'}
                      {event.eventType === 'SOLD' && 'Đã bán'}
                      {!['REGISTERED', 'INSPECTED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'SOLD'].includes(event.eventType) && event.eventType}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>{event.userName}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
