import { PaxConnector, PaxIntegrationMode } from './PaxConnector.js';
import {
  PaymentProviderConfig,
  PaymentRefundRequest,
  PaymentResult,
  PaymentSaleRequest,
  PaymentVoidRequest,
  TerminalStatus,
} from '../../types.js';

export class PaxProductionConnector implements PaxConnector {
  readonly mode: PaxIntegrationMode;

  constructor(private readonly config: PaymentProviderConfig) {
    this.mode = (config.integrationMode as PaxIntegrationMode) || 'semi_integrated_lan';
  }

  private ensureConfigured() {
    if (!this.config.processor) {
      throw new Error('PAX production setup requires a processor/acquirer.');
    }
    if (!this.config.terminalId) {
      throw new Error('PAX production setup requires a terminal ID.');
    }

    if (this.mode === 'semi_integrated_lan') {
      if (!this.config.ipAddress || !this.config.port) {
        throw new Error('PAX LAN integration requires terminal IP address and port.');
      }
    }

    if (
      (this.mode === 'local_agent' || this.mode === 'processor_cloud') &&
      !this.config.credentialProfileId
    ) {
      throw new Error(
        'PAX production connector requires a secure credential profile. API credentials are not stored in the POS payment configuration.'
      );
    }
  }

  async connect(): Promise<TerminalStatus> {
    return this.status();
  }

  async status(): Promise<TerminalStatus> {
    try {
      this.ensureConfigured();
      return {
        connected: false,
        provider: 'pax',
        terminalId: this.config.terminalId,
        terminalModel: this.config.terminalModel,
        message:
          `PAX ${this.mode} configuration is valid. A certified processor connector must be installed before production transactions can run.`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        connected: false,
        provider: 'pax',
        terminalId: this.config.terminalId,
        terminalModel: this.config.terminalModel,
        message: error?.message || 'PAX configuration is incomplete.',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private unavailable(): never {
    this.ensureConfigured();
    throw new Error(
      'PAX production transactions are intentionally blocked until the store processor and certified PAX integration package are selected.'
    );
  }

  async sale(_request: PaymentSaleRequest): Promise<PaymentResult> { return this.unavailable(); }
  async refund(_request: PaymentRefundRequest): Promise<PaymentResult> { return this.unavailable(); }
  async void(_request: PaymentVoidRequest): Promise<PaymentResult> { return this.unavailable(); }
  async cancel(_transactionId?: string): Promise<void> { return; }
}
