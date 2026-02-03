
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
  tagNumber?: string; // Physical Token ID (New)
  type: DeviceType;
  description: string;
  customerName: string;
  customerPhone?: string; 
  deviceImage?: string; 
  startTime: string; // ISO String
  endTime?: string; // ISO String, optional for active devices
  fee: number;
  billingType?: 'fixed' | 'hourly'; // New: Auto-bill
  hourlyRate?: number; // New: Auto-bill
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
  tagNumber?: string;
  billingType: 'fixed' | 'hourly';
  hourlyRate: string;
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

export interface StickerConfig {
  themeColor: string;
  showLogo: boolean;
  shopNameOverride: string;
  footerText: string;
  showCaution: boolean;
  layout: 'simple' | 'badge' | 'industrial';
}

// --- NEW POS TYPES ---

export interface PosTransaction {
  id: string;
  type: 'withdrawal' | 'deposit';
  amount: number;
  fee: number;
  total: number; // amount + fee (for withdrawal) or amount (deposit)
  customerName: string;
  customerPhone?: string;
  timestamp: string;
  method: 'cash' | 'transfer';
}

export interface CustomerProfile {
  phone: string;
  name: string;
  isBadActor: boolean;
  badActorReason?: string;
  lastVisit: string;
  visitCount: number;
}
