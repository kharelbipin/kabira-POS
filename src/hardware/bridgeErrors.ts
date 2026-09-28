// Canonical Bridge Error Classes for Kabira POS

export class BridgeConnectionError extends Error {
  public readonly endpoint: string;
  public readonly code: string;

  constructor(message: string = 'Hardware Bridge Unavailable at 127.0.0.1:5055', endpoint: string = 'http://127.0.0.1:5055') {
    super(message);
    this.name = 'BridgeConnectionError';
    this.endpoint = endpoint;
    this.code = 'ERR_BRIDGE_UNAVAILABLE';
  }
}

export class BridgeTimeoutError extends Error {
  public readonly timeoutMs: number;

  constructor(message: string = 'Bridge communication timed out', timeoutMs: number = 3000) {
    super(message);
    this.name = 'BridgeTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class BridgeDeviceError extends Error {
  public readonly deviceId: string;
  public readonly errorCode: string;

  constructor(message: string, deviceId: string, errorCode: string = 'ERR_DEVICE_COMM') {
    super(message);
    this.name = 'BridgeDeviceError';
    this.deviceId = deviceId;
    this.errorCode = errorCode;
  }
}

export class BridgeNotInstalledError extends Error {
  constructor(message: string = 'Kabira POS Hardware Bridge service is not installed on this Windows PC.') {
    super(message);
    this.name = 'BridgeNotInstalledError';
  }
}
