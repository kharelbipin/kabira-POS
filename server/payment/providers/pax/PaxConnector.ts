import {
  PaymentRefundRequest,
  PaymentResult,
  PaymentSaleRequest,
  PaymentVoidRequest,
  TerminalStatus,
} from '../../types.js';

export type PaxIntegrationMode =
  | 'semi_integrated_lan'
  | 'local_agent'
  | 'processor_cloud';

export interface PaxConnector {
  readonly mode: PaxIntegrationMode;
  connect(): Promise<TerminalStatus>;
  status(): Promise<TerminalStatus>;
  sale(request: PaymentSaleRequest): Promise<PaymentResult>;
  refund(request: PaymentRefundRequest): Promise<PaymentResult>;
  void(request: PaymentVoidRequest): Promise<PaymentResult>;
  cancel(transactionId?: string): Promise<void>;
}
