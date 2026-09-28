// Canonical Authoritative Bridge Client for Kabira POS
// Connects directly to the local Windows Hardware Bridge: http://127.0.0.1:5055
// Strict Canonical API Contract:
//   GET  /api/bridge/health
//   GET  /api/bridge/version
//   POST /api/hardware/scan
//   GET  /api/hardware/devices
//   GET  /api/hardware/summary
//   GET  /api/printers
//   POST /api/printers/{deviceId}/test-print
//   POST /api/printers/{deviceId}/print
//   POST /api/drawer/open
//   GET  /api/displays
//   POST /api/displays/{displayId}/test

import {
  BridgeHealth,
  DiscoveredHardwareDevice,
  HardwareSummary,
  WindowsDisplayInfo,
} from './bridgeTypes';
import { BridgeConnectionError, BridgeTimeoutError, BridgeDeviceError } from './bridgeErrors';

export class BridgeClient {
  private static instance: BridgeClient;
  private bridgeBaseUrl: string = 'http://127.0.0.1:5055';
  private requestTimeoutMs: number = 3500;
  private bridgeToken: string = 'kabira-pos-bridge-token-v24';

  private constructor() {
    try {
      const customUrl = localStorage.getItem('pos_bridge_endpoint_v1');
      if (customUrl) {
        this.bridgeBaseUrl = customUrl;
      }
      const savedToken = localStorage.getItem('pos_bridge_token_v1');
      if (savedToken) {
        this.bridgeToken = savedToken;
      }
    } catch {}
  }

  public static getInstance(): BridgeClient {
    if (!BridgeClient.instance) {
      BridgeClient.instance = new BridgeClient();
    }
    return BridgeClient.instance;
  }

  public setEndpoint(url: string) {
    this.bridgeBaseUrl = url.replace(/\/+$/, '');
    try {
      localStorage.setItem('pos_bridge_endpoint_v1', this.bridgeBaseUrl);
    } catch {}
  }

  public getEndpoint(): string {
    return this.bridgeBaseUrl;
  }

  public setToken(token: string) {
    this.bridgeToken = token;
    try {
      localStorage.setItem('pos_bridge_token_v1', token);
    } catch {}
  }

  public getToken(): string {
    return this.bridgeToken;
  }

  /**
   * Mode detection: default is strictly 'bridge'.
   * 'mock' is isolated and only active if explicitly configured via localStorage or URL query param.
   * Production NEVER automatically falls back to mock.
   */
  public getHardwareMode(): 'bridge' | 'mock' {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('hardwareMode') === 'mock') return 'mock';
        const saved = localStorage.getItem('kabira_hardware_mode');
        if (saved === 'mock') return 'mock';
      }
    } catch {}
    return 'bridge';
  }

  /**
   * Internal HTTP fetch wrapper with strict canonical headers and truthful failure handling
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.bridgeBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Client': 'Kabira-POS-React',
          'X-Bridge-Token': this.bridgeToken,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown server error');
        throw new BridgeDeviceError(
          `Bridge request to ${path} failed (${response.status}): ${errorText}`,
          path,
          `ERR_HTTP_${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new BridgeTimeoutError(`Bridge at ${this.bridgeBaseUrl} timed out after ${this.requestTimeoutMs}ms`, this.requestTimeoutMs);
      }
      if (err instanceof BridgeDeviceError) {
        throw err;
      }
      throw new BridgeConnectionError(
        `Hardware Bridge Unavailable at ${this.bridgeBaseUrl}. Please ensure KaBiRa POS Hardware Bridge service is running.`,
        this.bridgeBaseUrl
      );
    }
  }

  /**
   * 1. GET /api/bridge/health
   */
  public async getHealth(): Promise<BridgeHealth> {
    const startTime = performance.now();
    try {
      const res = await this.request<any>('/api/bridge/health');
      const elapsed = Math.round(performance.now() - startTime);

      return {
        status: res.status === 'running' || res.serviceRunning ? 'running' : 'degraded',
        version: res.version || '2.4.1-LTS',
        machineName: res.machineName || 'POS-HOST',
        serviceRunning: Boolean(res.serviceRunning ?? true),
        windowsDiscovery: Boolean(res.windowsDiscovery ?? true),
        networkDiscovery: Boolean(res.networkDiscovery ?? true),
        lastHeartbeat: new Date().toLocaleTimeString(),
        port: 5055,
        latencyMs: elapsed,
        error: null,
      };
    } catch (err: any) {
      return {
        status: 'offline',
        version: 'Not Connected',
        serviceRunning: false,
        windowsDiscovery: false,
        networkDiscovery: false,
        lastHeartbeat: 'Offline',
        port: 5055,
        latencyMs: 0,
        error: err.message || 'Hardware Bridge Offline',
      };
    }
  }

  /**
   * 2. GET /api/bridge/version
   */
  public async getVersion(): Promise<{ bridgeVersion: string; runtime: string; os: string; status: string }> {
    return await this.request<{ bridgeVersion: string; runtime: string; os: string; status: string }>('/api/bridge/version');
  }

  /**
   * 3. POST /api/hardware/scan
   */
  public async scanDevices(): Promise<DiscoveredHardwareDevice[]> {
    try {
      const res = await this.request<any>('/api/hardware/scan', { method: 'POST' });
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.devices)) return res.devices;
      return [];
    } catch (err: any) {
      // Truthful: if bridge is offline, do NOT manufacture fake hardware.
      throw err;
    }
  }

  /**
   * 4. GET /api/hardware/devices
   */
  public async getDevices(): Promise<DiscoveredHardwareDevice[]> {
    try {
      const res = await this.request<any>('/api/hardware/devices');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.devices)) return res.devices;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * 5. GET /api/hardware/summary
   */
  public async getSummary(): Promise<HardwareSummary | null> {
    try {
      return await this.request<HardwareSummary>('/api/hardware/summary');
    } catch {
      return null;
    }
  }

  /**
   * 6. GET /api/printers
   */
  public async getPrinters(): Promise<Array<{
    deviceId: string;
    name: string;
    queueName: string;
    port: string;
    driver: string;
    manufacturer: string;
    connection: string;
    windowsDetected: boolean;
    status: string;
    isDefault: boolean;
  }>> {
    try {
      const res = await this.request<any>('/api/printers');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.printers)) return res.printers;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * 7. POST /api/printers/{deviceId}/test-print
   */
  public async testPrint(deviceId: string): Promise<{ success: boolean; message: string; windowsDetected?: boolean }> {
    try {
      return await this.request<{ success: boolean; message: string; windowsDetected?: boolean }>(
        `/api/printers/${encodeURIComponent(deviceId)}/test-print`,
        { method: 'POST' }
      );
    } catch (err: any) {
      return {
        success: false,
        windowsDetected: true,
        message: err.message || 'Direct test print failed: communication timeout with Windows spooler',
      };
    }
  }

  /**
   * 8. POST /api/printers/{deviceId}/print
   */
  public async printReceipt(deviceId: string, receiptPayload: any): Promise<{
    success: boolean;
    jobId?: string;
    printerUsed?: string;
    message?: string;
  }> {
    try {
      return await this.request<{
        success: boolean;
        jobId?: string;
        printerUsed?: string;
        message?: string;
      }>(`/api/printers/${encodeURIComponent(deviceId)}/print`, {
        method: 'POST',
        body: typeof receiptPayload === 'string' ? receiptPayload : JSON.stringify(receiptPayload),
      });
    } catch (err: any) {
      return {
        success: false,
        message: `Direct printer communication failed: ${err.message}`,
      };
    }
  }

  /**
   * 9. POST /api/drawer/open
   */
  public async openDrawer(options: {
    connectionMethod?: 'through_printer' | 'usb' | 'serial' | 'network';
    printerId?: string;
    drawerPort?: string;
    pulseDurationMs?: number;
  } = {}): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request<{ success: boolean; message: string }>('/api/drawer/open', {
        method: 'POST',
        body: JSON.stringify(options),
      });
    } catch (err: any) {
      return {
        success: false,
        message: `Drawer pulse failed: ${err.message}`,
      };
    }
  }

  /**
   * 10. GET /api/displays
   */
  public async getDisplays(): Promise<{ displays: WindowsDisplayInfo[]; isExtended: boolean }> {
    try {
      const res = await this.request<any>('/api/displays');
      return {
        displays: res.displays || [],
        isExtended: Boolean(res.isExtended ?? (res.displays?.length > 1)),
      };
    } catch {
      return { displays: [], isExtended: false };
    }
  }

  /**
   * 11. POST /api/displays/{displayId}/test
   */
  public async testDisplay(displayId: string): Promise<{ success: boolean; message: string; displayId?: string }> {
    try {
      return await this.request<{ success: boolean; message: string; displayId?: string }>(
        `/api/displays/${encodeURIComponent(displayId)}/test`,
        { method: 'POST' }
      );
    } catch (err: any) {
      return {
        success: false,
        message: `Display test failed: ${err.message}`,
      };
    }
  }
}

export const bridgeClient = BridgeClient.getInstance();
