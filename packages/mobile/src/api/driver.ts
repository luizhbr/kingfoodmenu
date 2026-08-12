import { apiClient } from './client';
import type { ApiResponse } from './types';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface DriverOrderItem {
  name: string;
  quantity: number;
  options?: { name: string }[];
}

export interface DriverOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: string;
  createdAt: string;
  scheduledAt?: string | null;
  comment?: string | null;
  deliveryLine1?: string | null;
  deliveryLine2?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  deliveryPostalCode?: string | null;
  deliveryFormattedAddress?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  customer?: { name: string; phone?: string | null } | null;
  items?: DriverOrderItem[];
  _count?: { items: number };
  assignedToId?: string | null;
}

export interface DriverOrdersResponse {
  assigned: DriverOrder[];
  available: DriverOrder[];
}

export interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
}

export const driverApi = {
  getOrders() {
    return apiClient<ApiResponse<DriverOrdersResponse>>('/api/driver/orders');
  },
  getOrder(id: string) {
    return apiClient<ApiResponse<DriverOrder>>(`/api/driver/orders/${id}`);
  },
  getHistory() {
    return apiClient<ApiResponse<DriverOrder[]>>('/api/driver/orders/history');
  },
  getProfile() {
    return apiClient<ApiResponse<DriverProfile>>('/api/driver/profile');
  },
  accept(id: string) {
    return apiClient<ApiResponse<DriverOrder>>(`/api/driver/orders/${id}/accept`, { method: 'POST' });
  },
  pickup(id: string) {
    return apiClient<ApiResponse<DriverOrder>>(`/api/driver/orders/${id}/pickup`, { method: 'POST' });
  },
  outForDelivery(id: string) {
    return apiClient<ApiResponse<DriverOrder>>(`/api/driver/orders/${id}/out-for-delivery`, { method: 'POST' });
  },
  delivered(id: string) {
    return apiClient<ApiResponse<DriverOrder>>(`/api/driver/orders/${id}/delivered`, { method: 'POST' });
  },
};
