// Consolidated Windows POS Manager Tab
// Renders the authoritative HardwareDeviceManager component

import React from 'react';
import { HardwareDeviceManager } from '../admin/HardwareDeviceManager';

interface WindowsPosManagerTabProps {
  onOpenCustomerDisplayWindow?: () => void;
  activeCartCount?: number;
}

export const WindowsPosManagerTab: React.FC<WindowsPosManagerTabProps> = ({
  onOpenCustomerDisplayWindow,
}) => {
  return (
    <div className="space-y-6">
      <HardwareDeviceManager onOpenCustomerDisplay={onOpenCustomerDisplayWindow} />
    </div>
  );
};
