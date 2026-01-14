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
  customerPhone?: string; 
  deviceImage?: string; 
  startTime: string; // ISO String
  endTime?: string; // ISO String, optional for active devices
  fee: number;
  status: DeviceStatus;
  qrCodeBase64?: string; 
}

export interface FormState {
  type: DeviceType;
  description: string;
  customerName: string;
  customerPhone: string;
  fee: string;
  qrId?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ShopLocation {
  city: string;
  street: string;
  landmark: string;
}

export interface ShopProfile {
  uid?: string;
  ownerId?: string; // Added
  shopName: string;
  email?: string;
  phone?: string;
  
  // New Fields
  address?: string; 
  city?: string; 
  coordinates?: Coordinates;
  slots?: number;
  
  // Legacy support
  location?: ShopLocation; 
}