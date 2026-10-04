import { PaymentProvider } from '../PaymentProvider.js';
import {
  PaymentProviderConfig,
  PaymentRefundRequest,
  PaymentResult,
  PaymentSaleRequest,
  PaymentVoidRequest,
  TerminalStatus,
} from '../types.js';

export class UnsupportedPaymentProvider implements PaymentProvider {
  constructor(public readonly config: PaymentProviderConfig) {}

  private notConfigured(): never {
    throw new Error(
      `${this.config.provider} adapter is not configured yet. Add the certified processor/terminal integration before enabling production transactions.`
    );
  }

  async connect(): Promise<TerminalStatus> {
    return this.status();
  }

  async status(): Promise<TerminalStatus> {
    return {
      connected: false,
      provider: this.config.provider,
      terminalId: this.config.terminalId,
      terminalModel: this.config.terminalModel,
      message: `${this.config.provider} adapter is installed as a placeholder but has no certified connector yet.`,
      checkedAt: new Date().toISOString(),
    };
  }

  async sale(_request: PaymentSaleRequest): Promise<PaymentResult> { return this.notConfigured(); }
  async refund(_request: PaymentRefundRequest): Promise<PaymentResult> { return this.notConfigured(); }
  async void(_request: PaymentVoidRequest): Promise<PaymentResult> { return this.notConfigured(); }
  async cancel(_transactionId?: string): Promise<void> { return; }
}
