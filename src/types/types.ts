export interface Building {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  buildingId: string;
  name: string;
  startDate: string;
  monthlyRent: number;
  paymentType: 'full' | 'prorated';
  contractEndDate?: string;
  payments: Payment[];
  monthlyRentOverrides?: {
    [key: string]: {
      amount: number;
      note?: string;
    };
  };
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  date: string;
  amount: number;
  createdAt: string;
}

export interface RentModification {
  id: string;
  tenantId: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalTenants: number;
  monthlyTotal: number;
  totalUnpaid: number;
  unpaidList: {
    tenant: string;
    amount: number;
  }[];
}

export interface TenantReport {
  month: string;
  rent: number;
  paymentDate?: string;
  paymentAmount: number;
  balance: number;
  note?: string;
}

// Chart.js 관련 타입
export interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  pointStyle: 'circle';
  pointRadius: number;
  pointHoverRadius: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    title: {
      display: boolean;
      text: string;
      font: {
        size: number;
        weight: 'bold';
      };
      padding: number;
    };
    legend: {
      position: 'top';
      labels: {
        usePointStyle: boolean;
        padding: number;
      };
    };
    tooltip: {
      mode: 'index';
      intersect: boolean;
      callbacks: {
        label: (context: any) => string;
      };
    };
  };
  scales: {
    x: {
      grid: {
        display: boolean;
      };
    };
    y: {
      beginAtZero: boolean;
      ticks: {
        callback: (value: any) => string;
      };
    };
  };
}

export interface ChartConfiguration {
  type: 'line';
  data: ChartData;
  options: ChartOptions;
} 