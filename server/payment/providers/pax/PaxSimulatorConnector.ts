import { randomUUID } from 'crypto';
import { PaxConnector, PaxIntegrationMode } from './PaxConnector.js';
import {
  PaymentProviderConfig,
  PaymentRefundRequest,
  PaymentResult,
  PaymentSaleRequest,
  PaymentVoidRequest,
  TerminalStatus,
} from '../../types.js';

export class PaxSimulatorConnector implements PaxConnector {
  readonly mode: PaxIntegrationMode;

  constructor(private readonly config: PaymentProviderConfig) {
    this.mode = (config.integrationMode as PaxIntegrationMode) || 'semi_integrated_lan';
  }

  async connect(): Promise<TerminalStatus> {
    return this.status();
  }

  async status(): Promise<TerminalStatus> {
    return {
      connected: this.config.isEnabled,
      provider: 'pax',
      terminalId: this.config.terminalId || 'PAX-SIM-01',
      terminalModel: this.config.terminalModel || 'PAX Simulator',
      message: this.config.isEnabled
        ? `PAX sandbox simulator ready (${this.mode})`
        : 'PAX sandbox simulator disabled',
      checkedAt: new Date().toISOString(),
    };
  }

  async sale(request: PaymentSaleRequest): Promise<PaymentResult> {
    const outcome = request.testOutcome || 'approved';
    await new Promise(resolve => setTimeout(resolve, 300));

    if (outcome !== 'approved') {
      return {
        success: false,
        status: outcome === 'error' ? 'error' : outcome,
        provider: 'pax',
        processor: this.config.processor || 'PAX Sandbox',
        amount: request.amount,
        responseCode:
          outcome === 'declined' ? '51' :
          outcome === 'timeout' ? 'TIMEOUT' :
          outcome === 'cancelled' ? 'CANCELLED' : 'SIM_ERROR',
        errorMessage:
          outcome === 'declined' ? 'PAX simulator: declined' :
          outcome === 'timeout' ? 'PAX simulator: timeout' :
          outcome === 'cancelled' ? 'PAX simulator: customer cancelled' :
          'PAX simulator: terminal error',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      status: 'approved',
      provider: 'pax',
      processor: this.config.processor || 'PAX Sandbox',
      providerTransactionId: `PAX-SIM-${randomUUID()}`,
      amount: request.amount,
      cardBrand: 'Visa',
      last4: '4242',
      entryMode: 'contactless',
      authCode: Math.floor(100000 + Math.random() * 900000).toString(),
      responseCode: '00',
      timestamp: new Date().toISOString(),
    };
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentResult> {
    return {
      success: true,
      status: 'refunded',
      provider: 'pax',
      processor: this.config.processor || 'PAX Sandbox',
      providerTransactionId: `PAX-SIM-REF-${randomUUID()}`,
      amount: request.amount,
      responseCode: '00',
      timestamp: new Date().toISOString(),
    };
  }

  async void(_request: PaymentVoidRequest): Promise<PaymentResult> {
    return {
      success: true,
      status: 'voided',
      provider: 'pax',
      processor: this.config.processor || 'PAX Sandbox',
      providerTransactionId: `PAX-SIM-VOID-${randomUUID()}`,
      amount: 0,
      responseCode: '00',
      timestamp: new Date().toISOString(),
    };
  }

  async cancel(_transactionId?: string): Promise<void> {
    return;
  }
}
