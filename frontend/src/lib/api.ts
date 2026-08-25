const BASE_URL = 'http://localhost:5000/api';

export interface User {
  id: string;
  name: string;
  email: string;
  gender: string;
  usn?: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Global state parser for decodes
export function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.errors?.[0]?.message || data.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

export const api = {
  // Auth Service
  async login(credentials: any): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  async register(data: any): Promise<any> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Hostel & Room Service
  async getHostels(): Promise<any[]> {
    return request('/hostels');
  },

  async createHostel(data: any): Promise<any> {
    return request('/hostels', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getRooms(hostelId?: string): Promise<any[]> {
    const path = hostelId ? `/rooms?hostelId=${hostelId}` : '/rooms';
    return request(path);
  },

  async createRoom(data: any): Promise<any> {
    return request('/rooms', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteRoom(roomId: string): Promise<void> {
    return request(`/rooms/${roomId}`, { method: 'DELETE' });
  },

  // Allocation Service
  async getRequests(): Promise<any[]> {
    return request('/allocations/requests');
  },

  async submitRequest(data: any): Promise<any> {
    return request('/allocations/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async forwardRequest(reqId: string): Promise<any> {
    return request(`/allocations/requests/${reqId}/forward`, { method: 'POST' });
  },

  async approveRequest(reqId: string): Promise<any> {
    return request(`/allocations/requests/${reqId}/approve`, { method: 'POST' });
  },

  async rejectRequest(reqId: string): Promise<any> {
    return request(`/allocations/requests/${reqId}/reject`, { method: 'POST' });
  },

  // Billing Service
  async getMyDues(): Promise<any[]> {
    return request('/billing/payments/my-dues');
  },

  async getAllInvoices(): Promise<any[]> {
    return request('/billing/payments/invoices');
  },

  async payInvoice(invoiceId: string, transactionId: string): Promise<any> {
    return request(`/billing/payments/${invoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ transactionId })
    });
  },

  async verifyInvoice(invoiceId: string): Promise<any> {
    return request(`/billing/payments/${invoiceId}/verify`, { method: 'POST' });
  },

  async createInvoice(data: any): Promise<any> {
    return request('/billing/payments/invoice', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Messaging Service
  async getNotifications(): Promise<any[]> {
    return request('/messages/notifications');
  },

  async createNotification(data: any): Promise<any> {
    return request('/messages/notifications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getChat(userId: string): Promise<any[]> {
    return request(`/messages/chat/${userId}`);
  },

  async sendMessage(recipientId: string, body: string, subject?: string): Promise<any> {
    return request('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ recipientId, body, subject })
    });
  },

  // Kitchen Service
  async getMenu(hostelId: string): Promise<any> {
    return request(`/kitchen/menu?hostelId=${hostelId}`);
  },

  async updateMenu(data: any): Promise<any> {
    return request('/kitchen/menu', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getInventory(hostelId: string): Promise<any[]> {
    return request(`/kitchen/inventory?hostelId=${hostelId}`);
  },

  async createInventoryItem(data: any): Promise<any> {
    return request('/kitchen/inventory/items', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async addInventoryTransaction(data: any): Promise<any> {
    return request('/kitchen/inventory/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
