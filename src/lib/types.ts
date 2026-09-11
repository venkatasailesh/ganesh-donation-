export type ResidentType = 'Owner' | 'Rent';
export type PaymentMode = 'Cash' | 'UPI';

export interface Donor {
  id: string;
  receiptId: string;
  name: string;
  phone: string;
  amount: number;
  flatNumber: string;
  residentType: ResidentType;
  paymentMode: PaymentMode;
  createdAt: string;
}

export interface DonationFormData {
  name: string;
  phone: string;
  amount: number;
  flatNumber: string;
  residentType: ResidentType;
  paymentMode: PaymentMode;
}

export interface DonationResponse {
  success: boolean;
  message: string;
  receiptId?: string;
  receiptUrl?: string;
  whatsappUrl?: string;
  donor?: Donor;
  whatsappSent?: boolean;
  whatsappStatusMessage?: string;
}

export type WhatsAppProvider = "local" | "disabled";

export interface WhatsAppGatewaySettings {
  provider: WhatsAppProvider;
  enabled: boolean;
  instanceId: string;
  token: string;
  phonePrefix: string;
}
