export type PaymentProviderKind =
  | 'mock'
  | 'pax'
  | 'clover'
  | 'square'
  | 'stripe_terminal'
  | 'verifone'
  | 'ingenico'
  | 'generic';

export type PaymentConnectionType = 'lan' | 'usb' | 'serial' | 'cloud';
export type PaymentEnvironment = 'sandbox' | 'production';
export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'timeout'
  | 'error'
  | 'voided'
  | 'refunded';

export interface PaymentProviderConfig {
  id: string;
  storeId: string;
  registerId: string;
  provider: PaymentProviderKind;
  processor?: string;
  terminalModel?: string;
  terminalId?: string;
  deviceId?: string;
  integrationMode?: 'semi_integrated_lan' | 'local_agent' | 'processor_cloud';
  credentialProfileId?: string;
  connectionType: PaymentConnectionType;
  ipAddress?: string;
  port?: number;
  environment: PaymentEnvironment;
  isEnabled: boolean;
  autoConnect: boolean;
  allowRefund: boolean;
  allowVoid: boolean;
  allowManualEntry: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSaleRequest {
  storeId: string;
  registerId: string;
  orderId: string;
  amount: number;
  cashierId?: string;
  cashierName?: string;
  metadata?: Record<string, unknown>;
  testOutcome?: 'approved' | 'declined' | 'cancelled' | 'timeout' | 'error';
}

export interface PaymentRefundRequest {
  storeId: string;
  registerId: string;
  providerTransactionId: string;
  amount: number;
  orderId?: string;
  cashierId?: string;
  cashierName?: string;
}

export interface PaymentVoidRequest {
  storeId: string;
  registerId: string;
  providerTransactionId: string;
  orderId?: string;
  cashierId?: string;
  cashierName?: string;
}

export interface PaymentResult {
  success: boolean;
  status: PaymentStatus;
  provider: PaymentProviderKind;
  processor?: string;
  providerTransactionId?: string;
  amount: number;
  cardBrand?: string;
  last4?: string;
  entryMode?: string;
  authCode?: string;
  responseCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface PaymentTransaction extends PaymentResult {
  id: string;
  storeId: string;
  registerId: string;
  orderId?: string;
  transactionType: 'sale' | 'refund' | 'void';
  createdAt: string;
  updatedAt: string;
}

export interface TerminalStatus {
  connected: boolean;
  provider: PaymentProviderKind;
  terminalId?: string;
  terminalModel?: string;
  message: string;
  checkedAt: string;
}
