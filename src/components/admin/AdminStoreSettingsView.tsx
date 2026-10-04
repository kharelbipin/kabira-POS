import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Settings2 } from 'lucide-react';
import { StoreSettings, User } from '../../types';
import { api } from '../../utils/api';
import { useAdminStore } from '../../contexts/AdminStoreContext';
import { ManagerSettingsCenter } from '../settings/ManagerSettingsCenter';

interface AdminStoreSettingsViewProps {
  currentUser: User | null;
}

export const AdminStoreSettingsView: React.FC<AdminStoreSettingsViewProps> = ({
  currentUser,
}) => {
  const { selectedStoreId, selectedStore, isAllStores } = useAdminStore();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isAllStores || !selectedStore) {
      setSettings(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getSettings(selectedStoreId, selectedStore.name);
      setSettings({
        ...data,
        storeName: data.storeName || selectedStore.name,
        address: data.address || selectedStore.address,
        cityStateZip: data.cityStateZip || selectedStore.cityStateZip,
        phone: data.phone || selectedStore.phone,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load store settings.');
    } finally {
      setLoading(false);
    }
  }, [isAllStores, selectedStore, selectedStoreId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isAllStores || !selectedStore) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f4f8fc] p-6">
        <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 mx-auto flex items-center justify-center">
            <Building2 className="w-7 h-7 text-sky-600" />
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-900">Select a Store</h2>
          <p className="mt-2 text-sm text-slate-500">
            Store settings are intentionally isolated. Choose a specific store from the Admin
            store selector before editing tax, receipt, payment, display, or register settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !settings) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f4f8fc]">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <Settings2 className="w-5 h-5 animate-spin" />
          Loading {selectedStore.name} settings...
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f4f8fc] p-6">
        <div className="max-w-lg w-full rounded-2xl border border-rose-200 bg-white p-6 text-center">
          <div className="text-sm font-black text-rose-700">{error || 'Settings unavailable.'}</div>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ManagerSettingsCenter
      key={selectedStoreId}
      settings={settings}
      currentUser={currentUser}
      storeId={selectedStoreId}
      onRefresh={() => void load()}
    />
  );
};
