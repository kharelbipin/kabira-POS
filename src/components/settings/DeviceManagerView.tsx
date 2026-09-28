// Consolidated Device Manager View
// Renders the authoritative HardwareDeviceManager component focused on the Devices tab

import React from 'react';
import { HardwareDeviceManager } from '../admin/HardwareDeviceManager';

export const DeviceManagerView: React.FC = () => {
  return (
    <div className="space-y-6">
      <HardwareDeviceManager initialTab="devices" />
    </div>
  );
};
