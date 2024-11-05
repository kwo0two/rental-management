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
  contractEndDate: string | null;
  monthlyRentOverrides?: {
    [key: string]: {
      amount: number;
      note?: string;
    };
  };
  payments: Payment[];
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  date: string;
  amount: number;
  createdAt: string;
} 