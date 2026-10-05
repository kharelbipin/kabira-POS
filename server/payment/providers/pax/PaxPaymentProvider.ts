import { PaymentProvider } from '../../PaymentProvider.js';
import {
  PaymentProviderConfig,
  PaymentRefundRequest,
  PaymentResult,
  PaymentSaleRequest,
  PaymentVoidRequest,
  TerminalStatus,
} from '../../types.js';
import { PaxConnector } from './PaxConnector.js';
import { PaxProductionConnector } from './PaxProductionConnector.js';
import { PaxSimulatorConnector } from './PaxSimulatorConnector.js';

export class PaxPaymentProvider implements PaymentProvider {
  private readonly connector: PaxConnector;

  constructor(public readonly config: PaymentProviderConfig) {
    this.connector =
      config.environment === 'sandbox'
        ? new PaxSimulatorConnector(config)
        : new PaxProductionConnector(config);
  }

  connect(): Promise<TerminalStatus> {
    return this.connector.connect();
  }

  status(): Promise<TerminalStatus> {
    return this.connector.status();
  }

  sale(request: PaymentSaleRequest): Promise<PaymentResult> {
    return this.connector.sale(request);
  }

  refund(request: PaymentRefundRequest): Promise<PaymentResult> {
    return this.connector.refund(request);
  }

  void(request: PaymentVoidRequest): Promise<PaymentResult> {
    return this.connector.void(request);
  }

  cancel(transactionId?: string): Promise<void> {
    return this.connector.cancel(transactionId);
  }
}
