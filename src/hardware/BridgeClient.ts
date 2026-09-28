// Authoritative Bridge Client for Kabira POS
// Single point of contact with the local Windows Hardware Bridge (127.0.0.1:5055)
// No simulated discovery. React asks the Bridge and displays the real result.

import {
  BridgeHealth,
  DiscoveredHardwareDevice,
  HardwareSummary,
  WindowsDisplayInfo,
  MasterDiagnosticsReport,
} from './bridgeTypes';
import { BridgeConnectionError, BridgeTimeoutError, BridgeDeviceError } from './bridgeErrors';

export class BridgeClient {
  private static instance: BridgeClient;
  private bridgeBaseUrl: string = 'http://127.0.0.1:5055';
  private requestTimeoutMs: number = 3500;

  private constructor() {
    // Allow override via localStorage if configured
    try {
      const customUrl = localStorage.getItem('pos_bridge_endpoint_v1');
      if (customUrl) {
        this.bridgeBaseUrl = customUrl;
      }
    } catch {
      // localStorage may fail in restricted sandbox
    }
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

  /**
   * Internal HTTP fetch wrapper with strict timeout and truthful failure handling
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
        `Hardware Bridge Unavailable at ${this.bridgeBaseUrl}. Please ensure Kabira POS Hardware Bridge service is running.`,
        this.bridgeBaseUrl
      );
    }
  }

  /**
   * Checks Bridge service health
   */
  public async getHealth(): Promise<BridgeHealth> {
    const startTime = performance.now();
    try {
      // Try /health or /api/bridge/health
      let res: any;
      try {
        res = await this.request<any>('/health');
      } catch {
        res = await this.request<any>('/api/bridge/health');
      }

      const elapsed = Math.round(performance.now() - startTime);

      return {
        status: res.status === 'running' || res.serviceRunning ? 'running' : 'degraded',
        version: res.version || '1.0.4',
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
   * Performs full hardware scan via Bridge Windows discovery
   */
  public async scanDevices(): Promise<DiscoveredHardwareDevice[]> {
    try {
      let res: any;
      try {
        res = await this.request<any>('/devices/scan', { method: 'POST' });
      } catch {
        res = await this.request<any>('/api/hardware/scan', { method: 'POST' });
      }
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.devices)) return res.devices;
      return [];
    } catch (err: any) {
      // If bridge is offline, do NOT manufacture fake hardware.
      throw err;
    }
  }

  /**
   * Retrieves discovered devices from Bridge
   */
  public async getDevices(): Promise<DiscoveredHardwareDevice[]> {
    try {
      let res: any;
      try {
        res = await this.request<any>('/devices');
      } catch {
        res = await this.request<any>('/api/hardware/devices');
      }
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.devices)) return res.devices;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Retrieves hardware summary from Bridge
   */
  public async getSummary(): Promise<HardwareSummary | null> {
    try {
      return await this.request<HardwareSummary>('/devices/summary');
    } catch {
      return null;
    }
  }

  /**
   * Tests a device through the Bridge
   */
  public async testDevice(deviceId: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = performance.now();
    try {
      const res = await this.request<{ success: boolean; message?: string }>(`/devices/${encodeURIComponent(deviceId)}/test`, {
        method: 'POST',
      });
      return {
        success: Boolean(res.success),
        message: res.message || 'Device responded successfully',
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Direct device communication failed',
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }

  /**
   * Direct receipt printing through selected Device ID
   */
  public async printReceipt(printerId: string, receiptPayload: any): Promise<{ success: boolean; jobId?: string; message?: string }> {
    try {
      return await this.request<{ success: boolean; jobId?: string; message?: string }>(`/printers/${encodeURIComponent(printerId)}/print`, {
        method: 'POST',
        body: JSON.stringify(receiptPayload),
      });
    } catch (err: any) {
      return {
        success: false,
        message: `Direct printer communication failed: ${err.message}`,
      };
    }
  }

  /**
   * Test print on selected Printer Device ID
   */
  public async testPrint(printerId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request<{ success: boolean; message: string }>(`/printers/${encodeURIComponent(printerId)}/test`, {
        method: 'POST',
      });
    } catch (err: any) {
      return {
        success: false,
        message: `Direct printer communication failed: ${err.message}`,
      };
    }
  }

  /**
   * Kicks cash drawer through selected Printer Adapter or direct COM/USB
   */
  public async openDrawer(options: {
    connectionMethod?: 'through_printer' | 'usb' | 'serial' | 'network';
    printerId?: string;
    drawerPort?: string;
    pulseDurationMs?: number;
  } = {}): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request<{ success: boolean; message: string }>('/drawer/open', {
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
   * Enumerates Windows Displays from graphics subsystem
   */
  public async getDisplays(): Promise<{ displays: WindowsDisplayInfo[]; isExtended: boolean }> {
    try {
      const res = await this.request<any>('/displays');
      return {
        displays: res.displays || [],
        isExtended: Boolean(res.isExtended ?? true),
      };
    } catch {
      return { displays: [], isExtended: false };
    }
  }

  /**
   * Tests secondary display window
   */
  public async testDisplay(displayId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await this.request<{ success: boolean; message: string }>(`/displays/${encodeURIComponent(displayId)}/test`, {
        method: 'POST',
      });
    } catch (err: any) {
      return {
        success: false,
        message: `Display test failed: ${err.message}`,
      };
    }
  }

  /**
   * Queries full diagnostics matrix
   */
  public async getDiagnostics(): Promise<MasterDiagnosticsReport | null> {
    try {
      return await this.request<MasterDiagnosticsReport>('/diagnostics');
    } catch {
      return null;
    }
  }
}

export const bridgeClient = BridgeClient.getInstance();
