import JSZip from 'jszip';
import { PosConfiguration, RegisterProfile, StoreProfile } from '../types/industryConfig';

export interface PosDeploymentOptions {
  installHardwareBridge: boolean;
  launchOnStartup: boolean;
  enableCustomerDisplay: boolean;
  enableOfflineMode: boolean;
  enableAutoUpdate: boolean;
  environment: 'production' | 'test';
  expiresInDays: number;
  adminApiUrl: string;
}

export interface PosDeploymentRecord {
  id: string;
  storeId: string;
  registerId: string;
  storeName: string;
  registerName: string;
  configurationVersion: number;
  activationCode: string;
  createdAt: string;
  expiresAt: string;
  status: 'ready' | 'activated' | 'revoked';
  fileName: string;
  options: PosDeploymentOptions;
}

const STORAGE_KEY = 'kabira_pos_deployment_packages_v1';

const slugify = (value: string) =>
  value.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'store';

const randomToken = (bytes = 18) => {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
};

const createActivationCode = () => {
  const token = randomToken(6).toUpperCase();
  return token.slice(0, 4) + '-' + token.slice(4, 8) + '-' + token.slice(8, 12);
};

class PosDeploymentService {
  private load(): PosDeploymentRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(records: PosDeploymentRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
  }

  list(): PosDeploymentRecord[] {
    return this.load();
  }

  revoke(id: string): PosDeploymentRecord | null {
    const records = this.load();
    const index = records.findIndex(row => row.id === id);
    if (index < 0) return null;
    records[index] = { ...records[index], status: 'revoked' };
    this.save(records);
    return records[index];
  }

  async buildPackage(
    store: StoreProfile,
    register: RegisterProfile,
    config: PosConfiguration,
    options: PosDeploymentOptions
  ): Promise<PosDeploymentRecord> {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + Math.max(1, options.expiresInDays) * 86400000);
    const id = 'deploy-' + Date.now() + '-' + randomToken(4);
    const oneTimeToken = randomToken(24);
    const code = createActivationCode();
    const fileName = 'KaBiRaPOS-' + slugify(store.name) + '-' + slugify(register.name) + '-v' + config.version + '-Setup.zip';

    const record: PosDeploymentRecord = {
      id, storeId: store.id, registerId: register.id, storeName: store.name, registerName: register.name,
      configurationVersion: config.version, activationCode: code, createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(), status: 'ready', fileName, options,
    };

    const manifest = {
      schemaVersion: 1, packageId: id, product: 'KaBiRa POS', storeId: store.id, registerId: register.id,
      storeName: store.name, registerName: register.name, storeType: store.businessType,
      configurationVersion: config.version, environment: options.environment, adminApiUrl: options.adminApiUrl,
      installHardwareBridge: options.installHardwareBridge, launchOnStartup: options.launchOnStartup,
      customerDisplayEnabled: options.enableCustomerDisplay, offlineModeEnabled: options.enableOfflineMode,
      autoUpdateEnabled: options.enableAutoUpdate, createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString(),
    };

    const activation = {
      packageId: id, storeId: store.id, registerId: register.id, activationCode: code,
      oneTimeDeploymentToken: oneTimeToken, expiresAt: expiresAt.toISOString(),
      note: 'Invalidate this one-time token after successful Admin API device enrollment.',
    };

    const installScript = [
      'param([string]$InstallRoot = "$env:ProgramData\\KaBiRaPOS")',
      '$ErrorActionPreference = "Stop"',
      '',
      'Write-Host "KaBiRa POS Store Deployment" -ForegroundColor Cyan',
      'Write-Host "Store: " + store.name.replace(/\"/g, '') + ""',
      'Write-Host "Register: " + register.name.replace(/\"/g, '') + ""',
      'New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null',
      'New-Item -ItemType Directory -Force -Path "$InstallRoot\\deployment" | Out-Null',
      'Copy-Item "$PSScriptRoot\\deployment-manifest.json" "$InstallRoot\\deployment\\deployment-manifest.json" -Force',
      'Copy-Item "$PSScriptRoot\\activation.json" "$InstallRoot\\deployment\\activation.json" -Force',
      'Copy-Item "$PSScriptRoot\\pos-configuration.json" "$InstallRoot\\deployment\\pos-configuration.json" -Force',
      'Write-Host "Activation Code: " + code + "" -ForegroundColor Yellow',
      'Write-Host "Deployment bootstrap installed to $InstallRoot" -ForegroundColor Green',
    ].join('\r\n');

    const readme = [
      'KaBiRa POS Deployment Package', '',
      'Store: ' + store.name,
      'Register: ' + register.name,
      'Store ID: ' + store.id,
      'Register ID: ' + register.id,
      'Configuration Version: ' + config.version,
      'Environment: ' + options.environment,
      'Expires: ' + expiresAt.toLocaleString(), '',
      'ACTIVATION CODE', code, '',
      'INSTALL',
      '1. Extract this ZIP on the target Windows POS computer.',
      '2. Open PowerShell as Administrator.',
      '3. Run: powershell -ExecutionPolicy Bypass -File .\\Install-KaBiRaPOS.ps1',
      '4. Launch KaBiRa POS and enter the activation code.',
      '5. The Admin API should exchange the one-time token for a device credential and invalidate it.', '',
      'NOTE',
      'This is a deployment bootstrap package. A production release pipeline can add signed KaBiRa POS and Hardware Bridge binaries and wrap the package as MSI/EXE.',
    ].join('\r\n');

    const zip = new JSZip();
    zip.file('deployment-manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('activation.json', JSON.stringify(activation, null, 2));
    zip.file('pos-configuration.json', JSON.stringify(config, null, 2));
    zip.file('Install-KaBiRaPOS.ps1', installScript);
    zip.file('README.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const records = this.load();
    records.unshift(record);
    this.save(records);
    return record;
  }
}

export const posDeploymentService = new PosDeploymentService();