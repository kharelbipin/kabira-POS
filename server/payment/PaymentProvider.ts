import {
  PaymentProviderConfig,
  PaymentRefundRequest,
  PaymentResult,
  PaymentSaleRequest,
  PaymentVoidRequest,
  TerminalStatus,
} from './types.js';

export interface PaymentProvider {
  readonly config: PaymentProviderConfig;
  connect(): Promise<TerminalStatus>;
  status(): Promise<TerminalStatus>;
  sale(request: PaymentSaleRequest): Promise<PaymentResult>;
  refund(request: PaymentRefundRequest): Promise<PaymentResult>;
  void(request: PaymentVoidRequest): Promise<PaymentResult>;
  cancel(transactionId?: string): Promise<void>;
}
