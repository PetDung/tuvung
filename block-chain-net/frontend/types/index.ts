// User types
export type UserRole = 'FARMER' | 'INSPECTOR' | 'DISTRIBUTOR' | 'RETAILER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  username: string;
  role: string;
  fullName: string;
}

// Product types
export type ProductStatus = 'REGISTERED' | 'INSPECTED' | 'IN_TRANSIT' | 'DELIVERED' | 'SOLD';

export interface Product {
  id: string;
  farmerId: string;
  farmerName: string;
  productName: string;
  category?: string;
  origin?: string;
  harvestDate?: string;
  grade?: string;
  description?: string;
  qrCode?: string;
  currentSignature?: string;
  blockchainTxId?: string;
  status: ProductStatus;
  hasActiveShipment?: boolean;
  qrHiddenReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  productName: string;
  category?: string;
  origin?: string;
  harvestDate?: string;
  grade?: string;
  description?: string;
}

export interface ApproveProductRequest {
  location: string;
  grade?: string;
  notes?: string;
}

export interface CreateShipmentRequest {
  productId: string;
  notes?: string;
}

// Shipment types
export type ShipmentStatus = 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED';

export interface Shipment {
  id: string;
  productId: string;
  productName?: string;
  productType?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  distributorId?: string;
  distributorName?: string;
  fromLocation?: string;
  toLocation?: string;
  status: ShipmentStatus;
  transportType?: string;
  vehiclePlate?: string;
  departureTime?: string;
  arrivalTime?: string;
  notes?: string;
  qrCode?: string;
  currentSignature?: string;
  blockchainTxId?: string;
  createdAt: string;
  updatedAt: string;
}

// Event/History types
export interface ProductHistoryItem {
  action: string;
  actorId: string;
  actorName: string;
  location?: string;
  timestamp: string;
  bcTxId?: string;
}

export interface ProductEvent {
  id: string;
  productId: string;
  eventType: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
}

// Trace response (public, no auth required)
export interface TraceResponse {
  productId: string;
  farmerId: string;
  farmerName: string;
  productName: string;
  category?: string;
  origin: string;
  harvestDate?: string;
  grade?: string;
  description?: string;
  status: ProductStatus;
  currentQrCode?: string;
  currentSignature?: string;
  createdAt: string;
  updatedAt: string;
  events: TraceEvent[];
}

export interface TraceEvent {
  action: string;
  actorId?: string;
  actorName?: string;
  location?: string;
  timestamp: string;
  bcTxId?: string;
  signature?: string;
}

