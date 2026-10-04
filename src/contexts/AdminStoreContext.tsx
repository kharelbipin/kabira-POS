import React, { createContext, useContext, useMemo, useState } from 'react';
import { StoreProfile } from '../types/industryConfig';
import { SAMPLE_STORES } from '../services/industryConfigService';

const STORAGE_KEY = 'kabira_admin_selected_store_v1';

interface AdminStoreContextValue {
  stores: StoreProfile[];
  selectedStoreId: string;
  selectedStore: StoreProfile | null;
  isAllStores: boolean;
  setSelectedStoreId: (storeId: string) => void;
}

const AdminStoreContext = createContext<AdminStoreContextValue | null>(null);

export const AdminStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStoreId, setSelectedStoreIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'all' || SAMPLE_STORES.some(store => store.id === saved)) {
        return saved;
      }
    } catch {
      // Local storage is optional; fall back to the first configured store.
    }
    return SAMPLE_STORES[0]?.id || 'all';
  });

  const setSelectedStoreId = (storeId: string) => {
    const valid = storeId === 'all' || SAMPLE_STORES.some(store => store.id === storeId);
    if (!valid) return;

    setSelectedStoreIdState(storeId);
    try {
      localStorage.setItem(STORAGE_KEY, storeId);
    } catch {
      // Keep the in-memory selection even if persistence is unavailable.
    }
  };

  const selectedStore = useMemo(
    () => SAMPLE_STORES.find(store => store.id === selectedStoreId) || null,
    [selectedStoreId]
  );

  const value = useMemo<AdminStoreContextValue>(
    () => ({
      stores: SAMPLE_STORES,
      selectedStoreId,
      selectedStore,
      isAllStores: selectedStoreId === 'all',
      setSelectedStoreId,
    }),
    [selectedStoreId, selectedStore]
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
};

export const useAdminStore = () => {
  const context = useContext(AdminStoreContext);
  if (!context) {
    throw new Error('useAdminStore must be used inside AdminStoreProvider');
  }
  return context;
};
