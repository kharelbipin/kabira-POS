// Consolidated Hardware Diagnostics Tab
// Renders the authoritative HardwareDeviceManager component focused on Diagnostics

import React from 'react';
import { HardwareDeviceManager } from './HardwareDeviceManager';

export const HardwareDiagnosticsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <HardwareDeviceManager initialTab="diagnostics" />
    </div>
  );
};
