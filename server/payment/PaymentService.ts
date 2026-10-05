import { randomUUID } from 'crypto';
import { PaymentProviderFactory } from './PaymentProviderFactory.js';
import { paymentRepository } from './PaymentRepository.js';
import {
  PaymentProviderConfig,
  PaymentRefundRequest,
  PaymentSaleRequest,
  PaymentTransaction,
  PaymentVoidRequest,
} from './types.js';

function now() {
  return new Date().toISOString();
}

export class PaymentService {
  getConfig(storeId: string, registerId: string): PaymentProviderConfig {
    return paymentRepository.getConfig(storeId, registerId) || this.createDefaultMockConfig(storeId, registerId);
  }

  saveConfig(input: Partial<PaymentProviderConfig> & { storeId: string; registerId: string }): PaymentProviderConfig {
    const existing = paymentRepository.getConfig(input.storeId, input.registerId);
    const stamp = now();
    const config: PaymentProviderConfig = {
      id: existing?.id || `paycfg-${randomUUID()}`,
      storeId: input.storeId,
      registerId: input.registerId,
      provider: input.provider || existing?.provider || 'mock',
      processor: input.processor ?? existing?.processor,
      connectorId: input.connectorId ?? existing?.connectorId,
      merchantAccountLabel: input.merchantAccountLabel ?? existing?.merchantAccountLabel,
      terminalModel: input.terminalModel ?? existing?.terminalModel,
      terminalId: input.terminalId ?? existing?.terminalId,
      deviceId: input.deviceId ?? existing?.deviceId,
      integrationMode: input.integrationMode ?? existing?.integrationMode,
      credentialProfileId: input.credentialProfileId ?? existing?.credentialProfileId,
      connectionType: input.connectionType || existing?.connectionType || 'cloud',
      ipAddress: input.ipAddress ?? existing?.ipAddress,
      port: input.port ?? existing?.port,
      environment: input.environment || existing?.environment || 'sandbox',
      isEnabled: input.isEnabled ?? existing?.isEnabled ?? true,
      autoConnect: input.autoConnect ?? existing?.autoConnect ?? true,
      allowRefund: input.allowRefund ?? existing?.allowRefund ?? true,
      allowVoid: input.allowVoid ?? existing?.allowVoid ?? true,
      allowManualEntry: input.allowManualEntry ?? existing?.allowManualEntry ?? false,
      createdAt: existing?.createdAt || stamp,
      updatedAt: stamp,
    };
    return paymentRepository.upsertConfig(config);
  }

  private createDefaultMockConfig(storeId: string, registerId: string): PaymentProviderConfig {
    return this.saveConfig({
      storeId,
      registerId,
      provider: 'mock',
      processor: 'KaBiRa Sandbox',
      terminalModel: 'KaBiRa Test Terminal',
      terminalId: `${registerId}-MOCK`,
      connectionType: 'cloud',
      environment: 'sandbox',
      isEnabled: true,
      autoConnect: true,
      allowRefund: true,
      allowVoid: true,
      allowManualEntry: false,
    });
  }

  getConnectorCatalog(provider?: string) {
    const all = [
      { id: 'kabira_pax_sandbox', provider: 'pax', processor: 'PAX Sandbox', label: 'KaBiRa PAX Sandbox', installed: true, sandbox: true, modes: ['semi_integrated_lan', 'local_agent', 'processor_cloud'] },
      { id: 'pax_tsys', provider: 'pax', processor: 'TSYS / Global Payments', label: 'PAX + TSYS / Global Payments', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'processor_cloud'] },
      { id: 'pax_fiserv', provider: 'pax', processor: 'Fiserv', label: 'PAX + Fiserv', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'processor_cloud'] },
      { id: 'pax_worldpay', provider: 'pax', processor: 'Worldpay', label: 'PAX + Worldpay', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'processor_cloud'] },
      { id: 'pax_heartland', provider: 'pax', processor: 'Heartland', label: 'PAX + Heartland', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'local_agent'] },
      { id: 'pax_elavon', provider: 'pax', processor: 'Elavon', label: 'PAX + Elavon', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'processor_cloud'] },
      { id: 'pax_custom', provider: 'pax', processor: 'Custom / Other', label: 'PAX + Custom Certified Connector', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'local_agent', 'processor_cloud'] },
      { id: 'clover_direct', provider: 'clover', processor: 'Clover', label: 'Clover Direct', installed: false, sandbox: false, modes: ['processor_cloud'] },
      { id: 'square_terminal', provider: 'square', processor: 'Square', label: 'Square Terminal', installed: false, sandbox: false, modes: ['processor_cloud'] },
      { id: 'stripe_terminal', provider: 'stripe_terminal', processor: 'Stripe', label: 'Stripe Terminal', installed: false, sandbox: false, modes: ['processor_cloud'] },
      { id: 'verifone_custom', provider: 'verifone', processor: 'Custom / Other', label: 'Verifone Certified Connector', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'local_agent', 'processor_cloud'] },
      { id: 'ingenico_custom', provider: 'ingenico', processor: 'Custom / Other', label: 'Ingenico Certified Connector', installed: false, sandbox: false, modes: ['semi_integrated_lan', 'local_agent', 'processor_cloud'] },
    ];

    return provider ? all.filter(item => item.provider === provider) : all;
  }

  async status(storeId: string, registerId: string) {
    const config = this.getConfig(storeId, registerId);
    return PaymentProviderFactory.create(config).status();
  }

  async connect(storeId: string, registerId: string) {
    const config = this.getConfig(storeId, registerId);
    return PaymentProviderFactory.create(config).connect();
  }

  async sale(request: PaymentSaleRequest): Promise<PaymentTransaction> {
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }
    const config = this.getConfig(request.storeId, request.registerId);
    if (!config.isEnabled) throw new Error('Payment terminal is disabled for this register.');

    const provider = PaymentProviderFactory.create(config);
    const result = await provider.sale(request);
    const stamp = now();
    return paymentRepository.addTransaction({
      ...result,
      id: `paytx-${randomUUID()}`,
      storeId: request.storeId,
      registerId: request.registerId,
      orderId: request.orderId,
      transactionType: 'sale',
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentTransaction> {
    const config = this.getConfig(request.storeId, request.registerId);
    if (!config.allowRefund) throw new Error('Refunds are disabled for this register.');
    const result = await PaymentProviderFactory.create(config).refund(request);
    const stamp = now();
    return paymentRepository.addTransaction({
      ...result,
      id: `paytx-${randomUUID()}`,
      storeId: request.storeId,
      registerId: request.registerId,
      orderId: request.orderId,
      transactionType: 'refund',
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  async void(request: PaymentVoidRequest): Promise<PaymentTransaction> {
    const config = this.getConfig(request.storeId, request.registerId);
    if (!config.allowVoid) throw new Error('Voids are disabled for this register.');
    const result = await PaymentProviderFactory.create(config).void(request);
    const stamp = now();
    return paymentRepository.addTransaction({
      ...result,
      id: `paytx-${randomUUID()}`,
      storeId: request.storeId,
      registerId: request.registerId,
      orderId: request.orderId,
      transactionType: 'void',
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  async cancel(storeId: string, registerId: string, transactionId?: string) {
    const config = this.getConfig(storeId, registerId);
    await PaymentProviderFactory.create(config).cancel(transactionId);
  }

  listTransactions(storeId?: string, registerId?: string) {
    return paymentRepository.listTransactions(storeId, registerId);
  }
}

export const paymentService = new PaymentService();
