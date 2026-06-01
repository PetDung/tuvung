'use client';

import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import type { ProductStatus, ShipmentStatus } from '@/types';

interface StatusBadgeProps {
  status: ProductStatus | ShipmentStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase().replace(' ', '_');
  const colorClass = STATUS_COLORS[normalizedStatus as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  const label = STATUS_LABELS[normalizedStatus as keyof typeof STATUS_LABELS] || status;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colorClass} ${sizeClasses[size]}`}>
      {label}
    </span>
  );
}
