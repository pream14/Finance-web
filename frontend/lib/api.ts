// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.90.129.233:8000/api';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Get auth token from localStorage or cookies
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') || null;
}

// Set auth token
export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

// Remove auth token
export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers && typeof options.headers === 'object' && !(options.headers instanceof Headers)
      ? (options.headers as Record<string, string>)
      : {}),
    ...(token ? { Authorization: `Token ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));

    // Check for common error fields
    const errorMessage = error.error || error.detail;

    if (errorMessage) {
      throw new Error(errorMessage);
    }

    // If no standard error message, check for field-specific errors ( DRF validation errors)
    // Example: { "old_password": ["Wrong password."] }
    const fieldErrors = Object.entries(error).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(', ')}`;
      }
      return `${key}: ${value}`;
    });

    if (fieldErrors.length > 0) {
      throw new Error(fieldErrors.join('\n'));
    }

    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content (e.g., DELETE responses)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json();
}

// Customers API
export const customersApi = {
  getAll: (params?: { status?: string; loan_type?: string; all?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.loan_type) queryParams.append('loan_type', params.loan_type);
    if (params?.all) queryParams.append('all', 'true');
    const query = queryParams.toString();
    return apiRequest<any[]>(`/customers/${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => apiRequest<any>(`/customers/${id}/`),

  create: (data: any) => apiRequest<any>('/customers/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: number, data: any) => apiRequest<any>(`/customers/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id: number) => apiRequest<void>(`/customers/${id}/`, {
    method: 'DELETE',
  }),
};

// Loans API
export const loansApi = {
  getAll: (params?: { customer_id?: number; loan_type?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());
    if (params?.loan_type) queryParams.append('loan_type', params.loan_type);
    if (params?.status) queryParams.append('status', params.status);
    const query = queryParams.toString();
    return apiRequest<any[]>(`/transactions/loans/${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => apiRequest<any>(`/transactions/loans/${id}/`),

  create: (data: any) => apiRequest<any>('/transactions/loans/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: number, data: any) => apiRequest<any>(`/transactions/loans/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: number) => apiRequest<void>(`/transactions/loans/${id}/`, {
    method: 'DELETE',
  }),
};

// Transactions/Collections API
export const transactionsApi = {
  getAll: (params?: {
    customer_id?: number;
    loan_id?: number;
    start_date?: string;
    end_date?: string;
    include_all?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.customer_id) queryParams.append('customer_id', params.customer_id.toString());
    if (params?.loan_id) queryParams.append('loan_id', params.loan_id.toString());
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.include_all) queryParams.append('include_all', params.include_all);
    const query = queryParams.toString();
    return apiRequest<any[]>(`/transactions/transactions/${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => apiRequest<any>(`/transactions/transactions/${id}/`),

  create: (data: {
    loan: number;
    amount: number;
    asal_amount?: number;
    interest_amount?: number;
    payment_method: string;
    description?: string;
  }) => apiRequest<any>('/transactions/transactions/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: number, data: {
    amount?: number;
    asal_amount?: number;
    interest_amount?: number;
    payment_method?: string;
    description?: string;
  }) => apiRequest<any>(`/transactions/transactions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: number) => apiRequest<any>(`/transactions/transactions/${id}/`, {
    method: 'DELETE',
  }),
};

// Expenses API
export const expensesApi = {
  getAll: (params?: { start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    const query = queryParams.toString();
    return apiRequest<any[]>(`/expenses/${query ? `?${query}` : ''}`);
  },
  create: (data: { description: string; amount: number }) =>
    apiRequest<any>('/expenses/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest<void>(`/expenses/${id}/`, { method: 'DELETE' }),
};

// Auth API (Django: api-auth/token/ uses username + password)
export const authApi = {
  login: async (username: string, password: string) => {
    const base = API_BASE_URL.replace('/api', '');
    const response = await fetch(`${base}/api-auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      const message = typeof error.detail === 'string' ? error.detail : error.error || 'Invalid username or password';
      throw new Error(message);
    }

    const data = await response.json();
    if (data.token) setAuthToken(data.token);
    return data;
  },

  getCurrentUser: async () => {
    const token = getAuthToken();
    if (!token) return null;
    const response = await fetch(`${API_BASE_URL}/users/me/`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!response.ok) return null;
    return response.json();
  },

  register: (data: any) => apiRequest<any>('/users/register/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAll: () => apiRequest<any[]>('/users/'),
  update: (id: number, data: any) => apiRequest<any>(`/users/${id}/`, {
    method: 'PATCH', // Helper method for partial updates
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<void>(`/users/${id}/`, {
    method: 'DELETE',
  }),

  changePassword: (data: any) => apiRequest<any>('/users/change-password/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  logout: () => {
    removeAuthToken();
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: () => apiRequest<{
    monthly_interest_due: Array<{
      loan_id: number;
      customer_id: number;
      customer_name: string;
      customer_phone: string;
      principal_amount: string;
      remaining_amount: string;
      interest_rate: string;
      interest_due: string;
      is_collected: boolean;
    }>;
    overdue_alerts: Array<{
      loan_id: number;
      customer_id: number;
      customer_name: string;
      loan_type: string;
      days_overdue: number;
      days_remaining?: number;
      expected_amount: string;
      remaining_amount: string;
    }>;
    low_balance_warnings: Array<{
      loan_id: number;
      customer_id: number;
      customer_name: string;
      loan_type: string;
      principal_amount: string;
      remaining_amount: string;
      percentage_remaining: number;
    }>;
    total_outstanding: string;
    recent_activity: Array<{
      id: number;
      loan_id: number;
      customer_id: number;
      customer_name: string;
      amount: string;
      asal_amount: string;
      interest_amount: string;
      payment_method: string;
      collected_by: string;
      created_at: string;
      loan_type: string;
    }>;
    quick_stats: {
      total_active_customers: number;
      total_active_loans: number;
      avg_collection_per_day: string;
    };
    new_loans_this_month: Array<{
      loan_id: number;
      customer_id: number;
      customer_name: string;
      loan_type: string;
      principal_amount: string;
      created_at: string;
    }>;
  }>('/transactions/dashboard-stats/'),

  paymentAnalytics: {
    get: (days?: number) => apiRequest<any>(`/transactions/payment-analytics/${days ? `?days=${days}` : ''}`),
  },
};

export const api = {
  customers: customersApi,
  loans: loansApi,
  transactions: transactionsApi,
  expenses: expensesApi,
  dashboard: {
    get: () => apiRequest<any>('/transactions/dashboard-stats/'),
  },
  paymentAnalytics: {
    get: (days?: number) => apiRequest<any>(`/transactions/payment-analytics/${days ? `?days=${days}` : ''}`),
  },
};

// Reports API
export const reportsApi = {
  getData: (params: {
    start_date: string;
    end_date: string;
    report_type: string;
    area?: string;
    loan_type?: string;
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);
    queryParams.append('report_type', params.report_type);
    if (params.area) queryParams.append('area', params.area);
    if (params.loan_type) queryParams.append('loan_type', params.loan_type);
    return apiRequest<any>(`/transactions/reports/?${queryParams.toString()}`);
  },

  download: async (params: {
    start_date: string;
    end_date: string;
    report_type: string;
    file_format: 'csv' | 'pdf';
    area?: string;
    loan_type?: string;
  }) => {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);
    queryParams.append('report_type', params.report_type);
    queryParams.append('file_format', params.file_format);
    if (params.area) queryParams.append('area', params.area);
    if (params.loan_type) queryParams.append('loan_type', params.loan_type);

    const response = await fetch(
      `${API_BASE_URL}/transactions/reports/download/?${queryParams.toString()}`,
      {
        headers: {
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
      }
    );

    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${params.report_type}_${params.start_date}_to_${params.end_date}.${params.file_format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
