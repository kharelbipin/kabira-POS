// Consolidated Hardware Settings View
// Renders the single authoritative HardwareDeviceManager component

import React from 'react';
import { HardwareDeviceManager } from './admin/HardwareDeviceManager';

export const HardwareSettings: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <HardwareDeviceManager />
    </div>
  );
};
