import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/constants';
import { emitApiError } from '@/services/apiErrorEmitter';
import type {
  AuthResponse,
  Product,
  ProductFormData,
  ApproveProductRequest,
  CreateShipmentRequest,
  Shipment,
  ProductHistoryItem,
  User,
  TraceResponse,
} from '@/types';

// Cookie helper
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token from cookie
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getCookie('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 401: Redirect to login (clear auth)
    if (error.response?.status === 401) {
      document.cookie = 'auth_token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
      document.cookie = 'auth_user=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    // Emit error event for global handling (toast notifications)
    emitApiError({
      status: error.response?.status || 0,
      url: error.config?.url || '',
      method: error.config?.method,
      message: (error.response?.data as any)?.message || '',
      error,
    });

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<{ success: boolean; message: string; data: AuthResponse }>('/api/auth/login', { username, password });
    return response.data.data;
  },

  register: async (username: string, password: string, role: string): Promise<AuthResponse> => {
    const response = await api.post<{ success: boolean; message: string; data: AuthResponse }>('/api/auth/register', { username, password, role });
    return response.data.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; data: User }>('/api/auth/me');
    return response.data.data;
  },
};

// Products API
export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<{ success: boolean; data: any }>('/api/products');
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.content)) return data.content;
      if (Array.isArray(data.products)) return data.products;
      for (const key in data) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    return [];
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get<{ success: boolean; data: Product }>(`/api/products/${id}`);
    return response.data.data;
  },

  create: async (data: ProductFormData): Promise<Product> => {
    const response = await api.post<{ success: boolean; data: Product }>('/api/products', data);
    return response.data.data;
  },

  // INSPECTOR duyệt sản phẩm
  approve: async (id: string, data: ApproveProductRequest): Promise<Product> => {
    const response = await api.post<{ success: boolean; data: Product }>(`/api/products/${id}/approve`, data);
    return response.data.data;
  },

  getHistory: async (id: string): Promise<ProductHistoryItem[]> => {
    const response = await api.get<{ success: boolean; data: ProductHistoryItem[] }>(`/api/products/${id}/history`);
    return response.data.data || [];
  },

  // FARMER: lấy sản phẩm của tôi
  getMyProducts: async (): Promise<Product[]> => {
    const response = await api.get<{ success: boolean; data: Product[] }>('/api/products/my');
    return response.data.data || [];
  },

  // RETAILER/DISTRIBUTOR: lấy sản phẩm đã duyệt
  getApprovedProducts: async (): Promise<Product[]> => {
    const response = await api.get<{ success: boolean; data: Product[] }>('/api/products/approved');
    return response.data.data || [];
  },

  // RETAILER: lấy sản phẩm đã duyệt + sản phẩm trong shipment của mình
  getRetailerProducts: async (): Promise<Product[]> => {
    const response = await api.get<{ success: boolean; data: Product[] }>('/api/products/retailer');
    return response.data.data || [];
  },

  // DISTRIBUTOR: chỉ lấy sản phẩm trong shipment mình đã nhận
  getDistributorProducts: async (): Promise<Product[]> => {
    const response = await api.get<{ success: boolean; data: Product[] }>('/api/products/distributor');
    return response.data.data || [];
  },

  // INSPECTOR: lọc theo status
  getByStatus: async (status: string): Promise<Product[]> => {
    const response = await api.get<{ success: boolean; data: Product[] }>(`/api/products/status/${status}`);
    return response.data.data || [];
  },
};

// Shipments API
export const shipmentsApi = {
  getAll: async (): Promise<Shipment[]> => {
    const response = await api.get<{ success: boolean; data: any }>('/api/shipments');
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.content)) return data.content;
      if (Array.isArray(data.shipments)) return data.shipments;
      for (const key in data) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    return [];
  },

  getById: async (id: string): Promise<Shipment> => {
    const response = await api.get<{ success: boolean; data: Shipment }>(`/api/shipments/${id}`);
    return response.data.data;
  },

  // Lấy đơn chưa ai nhận - cho DISTRIBUTOR
  getPending: async (): Promise<Shipment[]> => {
    const response = await api.get<{ success: boolean; data: Shipment[] }>('/api/shipments/pending');
    return response.data.data || [];
  },

  // RETAILER tạo shipment
  create: async (data: CreateShipmentRequest): Promise<Shipment> => {
    const response = await api.post<{ success: boolean; data: Shipment }>('/api/shipments', data);
    return response.data.data;
  },

  // DISTRIBUTOR nhận đơn (kèm thông tin vận chuyển)
  accept: async (id: string, transportType?: string, vehiclePlate?: string): Promise<Shipment> => {
    const response = await api.put<{ success: boolean; data: Shipment }>(`/api/shipments/${id}/accept`, {
      transportType,
      vehiclePlate,
    });
    return response.data.data;
  },

  // ADMIN: lấy tất cả đơn hàng
  getAllShipments: async (): Promise<Shipment[]> => {
    const response = await api.get<{ success: boolean; data: any }>('/api/shipments/all');
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.content)) return data.content;
      if (Array.isArray(data.shipments)) return data.shipments;
      for (const key in data) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    return [];
  },

  // Lấy đơn hàng của tôi (theo userId)
  getMyShipments: async (): Promise<Shipment[]> => {
    const response = await api.get<{ success: boolean; data: any }>('/api/shipments/my');
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.content)) return data.content;
      if (Array.isArray(data.shipments)) return data.shipments;
      for (const key in data) {
        if (Array.isArray(data[key])) return data[key];
      }
    }
    return [];
  },
};

// Scan API
export const scanApi = {
  shipping: async (productId: string, signature: string, location?: string): Promise<any> => {
    const response = await api.put<{ success: boolean; message: string; data: any }>('/api/scan/shipping', {
      productId,
      signature,
      location: location || 'Đang vận chuyển',
    });
    return response.data;
  },

  delivered: async (productId: string, signature: string, arrivalLocation?: string): Promise<any> => {
    const response = await api.put<{ success: boolean; message: string; data: any }>('/api/scan/delivered', {
      productId,
      signature,
      arrivalLocation: arrivalLocation || 'Điểm đến',
    });
    return response.data;
  },

  sold: async (productId: string, signature: string, soldLocation?: string): Promise<any> => {
    const response = await api.put<{ success: boolean; message: string; data: any }>('/api/scan/sold', {
      productId,
      signature,
      soldLocation: soldLocation || 'Cửa hàng',
    });
    return response.data;
  },
};

// Trace API
export const traceApi = {
  getTrace: async (productId: string): Promise<TraceResponse> => {
    const response = await api.get<{ success: boolean; data: TraceResponse }>(`/api/trace/${productId}`);
    return response.data.data;
  },
};

export default api;
