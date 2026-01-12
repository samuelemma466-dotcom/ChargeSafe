export enum DeviceType {
  PHONE = 'Phone',
  POWER_BANK = 'Power Bank',
  LAPTOP = 'Laptop',
  OTHER = 'Other'
}

export type DeviceStatus = 'charging' | 'ready' | 'collected';

export interface DeviceEntry {
  id: string; // Unique Order Number (CS-####)
  qrId?: string; // Physical Card ID (e.g. CARD-01)
  type: DeviceType;
  description: string;
  customerName: string;
  startTime: string; // ISO String
  endTime?: string; // ISO String, optional for active devices
  fee: number;
  status: DeviceStatus;
  qrCodeBase64?: string; // Legacy: Generated Base64 Data URL for printing
}

export interface FormState {
  type: DeviceType;
  description: string;
  customerName: string;
  fee: string;
  qrId?: string;
}

export interface ShopLocation {
  city: string;
  street: string;
  landmark: string;
}

export interface ShopProfile {
  uid?: string;
  shopName: string;
  email?: string;
  phone?: string;
  location?: ShopLocation;
}