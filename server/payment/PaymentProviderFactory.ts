import { PaymentProvider } from './PaymentProvider.js';
import { MockPaymentProvider } from './providers/MockPaymentProvider.js';
import { UnsupportedPaymentProvider } from './providers/UnsupportedPaymentProvider.js';
import { PaxPaymentProvider } from './providers/pax/PaxPaymentProvider.js';
import { PaymentProviderConfig } from './types.js';

export class PaymentProviderFactory {
  static create(config: PaymentProviderConfig): PaymentProvider {
    switch (config.provider) {
      case 'mock':
        return new MockPaymentProvider(config);
      case 'pax':
        return new PaxPaymentProvider(config);
      case 'clover':
      case 'square':
      case 'stripe_terminal':
      case 'verifone':
      case 'ingenico':
      case 'generic':
      default:
        return new UnsupportedPaymentProvider(config);
    }
  }
}
