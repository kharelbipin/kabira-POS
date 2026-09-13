import React, { useState, useEffect } from 'react';
import { Device } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  Printer,
  ScanBarcode,
  CreditCard,
  Archive,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
} from 'lucide-react';

export const HardwareSettings: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'printer' as Device['type'],
    model: '',
    connectionType: 'usb' as Device['connectionType'],
    ipAddress: '',
    port: 9100,
    isDefault: false,
    active: true,
  });

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await api.getDevices();
      setDevices(data);
    } catch (err) {
      console.error('Failed to load devices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDevice({
        name: formData.name,
        type: formData.type,
        model: formData.model,
        connectionType: formData.connectionType,
        ipAddress: formData.connectionType === 'network' ? formData.ipAddress : undefined,
        port: formData.connectionType === 'network' ? Number(formData.port) : undefined,
        isDefault: formData.isDefault,
        active: formData.active,
      });
      playBeep('success');
      setShowAddModal(false);
      setFormData({
        name: '',
        type: 'printer',
        model: '',
        connectionType: 'usb',
        ipAddress: '',
        port: 9100,
        isDefault: false,
        active: true,
      });
      loadDevices();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to save hardware device');
    }
  };

  const handleTestDevice = async (device: Device) => {
    setTestingDeviceId(device.id);
    setTestResult(null);
    try {
      const res = await api.testDevice(device.id);
      playBeep('success');
      setTestResult({ id: device.id, success: res.success, message: res.message });
      setTimeout(() => setTestResult(null), 5000);
    } catch (err: any) {
      playBeep('error');
      setTestResult({ id: device.id, success: false, message: err.message || 'Test failed' });
    } finally {
      setTestingDeviceId(null);
    }
  };

  const handleDeleteDevice = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove device "${name}"?`)) return;
    try {
      await api.deleteDevice(id);
      playBeep('click');
      loadDevices();
    } catch (err: any) {
      alert(err.message || 'Failed to delete device');
    }
  };

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'printer':
        return <Printer className="w-5 h-5 text-[#C5A059]" />;
      case 'scanner':
        return <ScanBarcode className="w-5 h-5 text-[#C5A059]" />;
      case 'cash_drawer':
        return <Archive className="w-5 h-5 text-[#C5A059]" />;
      case 'card_reader':
        return <CreditCard className="w-5 h-5 text-[#C5A059]" />;
      default:
        return <Cpu className="w-5 h-5 text-[#C5A059]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626]">
        <div>
          <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-[#C5A059]" />
            <span>Hardware Devices & Peripherals (AP-DV-01 - 04)</span>
          </h3>
          <p className="text-xs text-[#737373] mt-0.5">
            Configure receipt thermal printers, optical barcode guns, RJ12 cash drawers, and EMV terminals
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadDevices}
            className="p-2 text-[#A3A3A3] hover:text-[#E5E5E5] bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] rounded-lg cursor-pointer transition-colors"
            title="Refresh Devices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Device List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map(device => {
          const isTesting = testingDeviceId === device.id;
          const result = testResult?.id === device.id ? testResult : null;

          return (
            <div
              key={device.id}
              className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 flex flex-col justify-between hover:border-[#C5A059]/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center">
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-[#E5E5E5]">{device.name}</h4>
                        {device.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 text-[10px] font-bold uppercase tracking-wider">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#737373] capitalize">
                        {device.type.replace('_', ' ')} • {device.model || 'Standard'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        device.status === 'online' ? 'bg-emerald-500 shadow-xs' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-[11px] font-mono text-[#A3A3A3] uppercase">
                      {device.status}
                    </span>
                  </div>
                </div>

                <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] text-xs font-mono space-y-1 text-[#A3A3A3]">
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <span className="text-[#E5E5E5] uppercase">{device.connectionType}</span>
                  </div>
                  {device.ipAddress && (
                    <div className="flex justify-between">
                      <span>IP Address:</span>
                      <span className="text-[#E5E5E5]">{device.ipAddress}:{device.port}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={device.active ? 'text-emerald-400' : 'text-neutral-500'}>
                      {device.active ? 'Active & Ready' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {result && (
                  <div
                    className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center space-x-2 ${
                      result.success
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                        : 'bg-red-950/40 border-red-800/60 text-red-400'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{result.message}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => handleTestDevice(device)}
                  disabled={isTesting}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] hover:border-[#C5A059] text-xs font-bold text-[#E5E5E5] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 text-[#C5A059] ${isTesting ? 'animate-pulse' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Connection / Print'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteDevice(device.id, device.name)}
                  className="p-1.5 text-[#737373] hover:text-red-400 hover:bg-[#1A1A1A] rounded-lg transition-colors cursor-pointer"
                  title="Remove Device"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111111] border border-[#262626] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#C5A059]" />
                <span>Register Hardware Peripheral</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#737373] hover:text-[#E5E5E5] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front Register Thermal Printer"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Device Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as Device['type'] })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  >
                    <option value="printer">Receipt Thermal Printer</option>
                    <option value="scanner">Barcode Scanner Gun</option>
                    <option value="cash_drawer">RJ12 Cash Drawer</option>
                    <option value="card_reader">EMV Card Terminal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Model / Hardware
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Star TSP143III"
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Connection Protocol *
                  </label>
                  <select
                    value={formData.connectionType}
                    onChange={e => setFormData({ ...formData, connectionType: e.target.value as Device['connectionType'] })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  >
                    <option value="usb">USB Plug & Play</option>
                    <option value="network">Ethernet / LAN IP</option>
                    <option value="bluetooth">Bluetooth Wireless</option>
                    <option value="serial">Serial RS-232 / RJ12</option>
                  </select>
                </div>

                {formData.connectionType === 'network' ? (
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                      Static IP Address
                    </label>
                    <input
                      type="text"
                      placeholder="192.168.1.150"
                      value={formData.ipAddress}
                      onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                    />
                  </div>
                ) : (
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 text-[#E5E5E5] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="rounded bg-[#1A1A1A] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
                      />
                      <span>Set as Default Device</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[#E5E5E5] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
