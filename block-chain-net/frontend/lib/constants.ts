export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const ROLES = {
  FARMER: 'FARMER',
  INSPECTOR: 'INSPECTOR',
  DISTRIBUTOR: 'DISTRIBUTOR',
  RETAILER: 'RETAILER',
  ADMIN: 'ADMIN',
} as const;

export const STATUS_COLORS = {
  // Product statuses
  REGISTERED: 'bg-amber-100 text-amber-800',
  INSPECTED: 'bg-green-100 text-green-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  INTRANSIT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  SOLD: 'bg-purple-100 text-purple-800',
  // Shipment statuses
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
} as const;

export const STATUS_LABELS = {
  // Product statuses
  REGISTERED: 'Chờ duyệt',
  INSPECTED: 'Đã duyệt',
  IN_TRANSIT: 'Đang vận chuyển',
  INTRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  SOLD: 'Đã bán',
  // Shipment statuses
  PENDING: 'Chờ nhận',
  ACCEPTED: 'Đã nhận đơn',
} as const;

export const ROLE_LABELS = {
  FARMER: 'Nông dân',
  INSPECTOR: 'Kiểm định viên',
  DISTRIBUTOR: 'Người vận chuyển',
  RETAILER: 'Nhà bán lẻ',
  ADMIN: 'Quản trị viên',
} as const;

export const PROTECTED_PATHS = [
  '/dashboard',
  '/products',
  '/shipments',
  '/scan',
];

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['FARMER', 'INSPECTOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN'],
  '/products': ['FARMER', 'INSPECTOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN'],
  '/shipments': ['DISTRIBUTOR', 'RETAILER', 'ADMIN'],
  '/scan': ['DISTRIBUTOR', 'RETAILER'],
};
