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
  private bridgeToken: string = '';

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
