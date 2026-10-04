import fs from 'fs';
import path from 'path';
import os from 'os';
import { PaymentProviderConfig, PaymentTransaction } from './types.js';

interface PaymentStoreFile {
  configs: PaymentProviderConfig[];
  transactions: PaymentTransaction[];
}

const DEFAULT_STORE: PaymentStoreFile = {
  configs: [],
  transactions: [],
};

export class PaymentRepository {
  private readonly filePath: string;
  private state: PaymentStoreFile = { ...DEFAULT_STORE };

  constructor() {
    const root =
      process.env.LOCALAPPDATA ||
      path.join(os.homedir(), 'AppData', 'Local');
    const dir = path.join(root, 'KaBiRa POS', 'data');
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, 'payment_store.json');
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.state = { configs: [], transactions: [] };
        this.save();
        return;
      }
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      this.state = {
        configs: Array.isArray(raw?.configs) ? raw.configs : [],
        transactions: Array.isArray(raw?.transactions) ? raw.transactions : [],
      };
    } catch (error) {
      console.error('[Payments] Failed to load payment_store.json:', error);
      this.state = { configs: [], transactions: [] };
    }
  }

  private save() {
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tempPath, this.filePath);
  }

  getConfig(storeId: string, registerId: string): PaymentProviderConfig | undefined {
    return this.state.configs.find(
      c => c.storeId === storeId && c.registerId === registerId
    );
  }

  upsertConfig(config: PaymentProviderConfig): PaymentProviderConfig {
    const index = this.state.configs.findIndex(
      c => c.storeId === config.storeId && c.registerId === config.registerId
    );
    if (index >= 0) this.state.configs[index] = config;
    else this.state.configs.push(config);
    this.save();
    return config;
  }

  addTransaction(tx: PaymentTransaction): PaymentTransaction {
    this.state.transactions.unshift(tx);
    if (this.state.transactions.length > 5000) {
      this.state.transactions.length = 5000;
    }
    this.save();
    return tx;
  }

  listTransactions(storeId?: string, registerId?: string): PaymentTransaction[] {
    return this.state.transactions.filter(tx =>
      (!storeId || tx.storeId === storeId) &&
      (!registerId || tx.registerId === registerId)
    );
  }

  findTransaction(providerTransactionId: string): PaymentTransaction | undefined {
    return this.state.transactions.find(
      tx => tx.providerTransactionId === providerTransactionId
    );
  }
}

export const paymentRepository = new PaymentRepository();
