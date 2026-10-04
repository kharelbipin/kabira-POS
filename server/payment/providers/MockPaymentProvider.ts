import { randomUUID } from 'crypto';
import { PaymentProvider } from '../PaymentProvider.js';
import {
  PaymentProviderConfig,
  PaymentRefundRequest,
  PaymentResult,
  PaymentSaleRequest,
  PaymentVoidRequest,
  TerminalStatus,
} from '../types.js';

export class MockPaymentProvider implements PaymentProvider {
  constructor(public readonly config: PaymentProviderConfig) {}

  async connect(): Promise<TerminalStatus> {
    return this.status();
  }

  async status(): Promise<TerminalStatus> {
    return {
      connected: this.config.isEnabled,
      provider: 'mock',
      terminalId: this.config.terminalId || 'KABIRA-MOCK-01',
      terminalModel: this.config.terminalModel || 'KaBiRa Test Terminal',
      message: this.config.isEnabled ? 'Mock terminal ready' : 'Mock terminal disabled',
      checkedAt: new Date().toISOString(),
    };
  }

  async sale(request: PaymentSaleRequest): Promise<PaymentResult> {
    const outcome = request.testOutcome || 'approved';
    await new Promise(resolve => setTimeout(resolve, 250));

    if (outcome === 'timeout') {
      return {
        success: false,
        status: 'timeout',
        provider: 'mock',
        amount: request.amount,
        responseCode: 'TIMEOUT',
        errorMessage: 'Mock terminal timed out',
        timestamp: new Date().toISOString(),
      };
    }

    if (outcome === 'cancelled') {
      return {
        success: false,
        status: 'cancelled',
        provider: 'mock',
        amount: request.amount,
        responseCode: 'CANCELLED',
        errorMessage: 'Customer cancelled at terminal',
        timestamp: new Date().toISOString(),
      };
    }

    if (outcome === 'declined') {
      return {
        success: false,
        status: 'declined',
        provider: 'mock',
        amount: request.amount,
        responseCode: '51',
        errorMessage: 'Insufficient funds',
        timestamp: new Date().toISOString(),
      };
    }

    if (outcome === 'error') {
      return {
        success: false,
        status: 'error',
        provider: 'mock',
        amount: request.amount,
        responseCode: 'MOCK_ERROR',
        errorMessage: 'Simulated terminal error',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      status: 'approved',
      provider: 'mock',
      processor: this.config.processor || 'KaBiRa Sandbox',
      providerTransactionId: `MOCK-${randomUUID()}`,
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
      provider: 'mock',
      processor: this.config.processor || 'KaBiRa Sandbox',
      providerTransactionId: `REF-${randomUUID()}`,
      amount: request.amount,
      responseCode: '00',
      timestamp: new Date().toISOString(),
    };
  }

  async void(_request: PaymentVoidRequest): Promise<PaymentResult> {
    return {
      success: true,
      status: 'voided',
      provider: 'mock',
      processor: this.config.processor || 'KaBiRa Sandbox',
      providerTransactionId: `VOID-${randomUUID()}`,
      amount: 0,
      responseCode: '00',
      timestamp: new Date().toISOString(),
    };
  }

  async cancel(_transactionId?: string): Promise<void> {
    return;
  }
}
