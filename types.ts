export enum DeviceType {
  PHONE = 'Phone',
  POWER_BANK = 'Power Bank',
  LAPTOP = 'Laptop',
  OTHER = 'Other'
}

export type DeviceStatus = 'charging' | 'ready' | 'collected';

export interface DeviceEntry {
  id: string; // Unique Order Number (CS-####)
  type: DeviceType;
  description: string;
  customerName: string;
  startTime: string; // ISO String
  endTime?: string; // ISO String, optional for active devices
  fee: number;
  status: DeviceStatus;
  qrCodeBase64?: string; // Base64 Data URL
}

export interface FormState {
  type: DeviceType;
  description: string;
  customerName: string;
  fee: string;
}