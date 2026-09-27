import React, { useState } from 'react';
import { DiningTable, INITIAL_RESTAURANT_TABLES } from '../../services/industryConfigService';
import { playBeep } from '../../utils/audio';
import {
  LayoutGrid,
  Users,
  Clock,
  Receipt,
  Plus,
  Flame,
  CheckCircle2,
  Sparkles,
  Utensils,
  Wine,
  Sun,
  ShieldCheck,
} from 'lucide-react';

interface RestaurantTablesViewProps {
  onSelectTableForOrder: (table: DiningTable) => void;
  onOpenKds: () => void;
}

export const RestaurantTablesView: React.FC<RestaurantTablesViewProps> = ({
  onSelectTableForOrder,
  onOpenKds,
}) => {
  const [tables, setTables] = useState<DiningTable[]>(INITIAL_RESTAURANT_TABLES);
  const [activeSection, setActiveSection] = useState<'All' | 'Main Dining' | 'Bar Area' | 'Patio'>('All');
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(tables[1]);

  const filteredTables = activeSection === 'All'
    ? tables
    : tables.filter(t => t.section === activeSection);

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    billed: tables.filter(t => t.status === 'billed').length,
    dirty: tables.filter(t => t.status === 'dirty').length,
  };

  const handleUpdateStatus = (tableId: string, status: DiningTable['status']) => {
    playBeep('click');
    setTables(prev =>
      prev.map(t => (t.id === tableId ? { ...t, status } : t))
    );
    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => (prev ? { ...prev, status } : null));
    }
  };

  const getStatusBadge = (status: DiningTable['status']) => {
    switch (status) {
      case 'available':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-500',
          label: 'AVAILABLE',
        };
      case 'occupied':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-500 animate-pulse',
          label: 'SEATED / OCCUPIED',
        };
      case 'billed':
        return {
          bg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-500',
          label: 'CHECK PRINTED',
        };
      case 'dirty':
        return {
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-500',
          label: 'NEEDS BUSSING',
        };
    }
  };

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col bg-[#0F172A] text-slate-100 overflow-hidden select-none">
      {/* Top Bar with Stats & Section Filter */}
      <div className="bg-[#020617] px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Dining Floor & Table Map
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/30">
                RESTAURANT MODE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Table Statuses • Guest Seatings • Kitchen Routing
            </p>
          </div>
        </div>

        {/* Status Counters */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
            {stats.available} Available
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
            {stats.occupied} Seated
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-blue-950/60 border border-blue-500/40 text-blue-300 font-bold">
            {stats.billed} Billed
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold">
            {stats.dirty} Dirty
          </span>
        </div>

        {/* KDS Kitchen Monitor Button */}
        <button
          type="button"
          onClick={onOpenKds}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Kitchen Display (KDS)</span>
        </button>
      </div>

      {/* Sections Filter Bar */}
      <div className="bg-slate-900/80 px-6 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-xs font-bold">
          {(['All', 'Main Dining', 'Bar Area', 'Patio'] as const).map(sec => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeSection === sec
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {sec === 'Main Dining' && <Utensils className="w-3.5 h-3.5 inline mr-1.5" />}
              {sec === 'Bar Area' && <Wine className="w-3.5 h-3.5 inline mr-1.5" />}
              {sec === 'Patio' && <Sun className="w-3.5 h-3.5 inline mr-1.5" />}
              <span>{sec}</span>
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredTables.length} tables
        </span>
      </div>

      {/* Main Layout Area: Grid of Tables + Selected Table Action Inspector */}
      <div className="flex-1 min-h-0 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Table Map Canvas (8 cols) */}
        <div className="lg:col-span-8 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map(t => {
              const badge = getStatusBadge(t.status);
              const isSelected = selectedTable?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    playBeep('click');
                    setSelectedTable(t);
                  }}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between h-44 select-none relative ${
                    isSelected
                      ? 'bg-slate-800 border-rose-500 ring-2 ring-rose-500/40 shadow-xl'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  {/* Table Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-mono">{t.section}</span>
                      <h3 className="text-lg font-black text-white">{t.tableNumber}</h3>
                    </div>
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-semibold border border-slate-700">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{t.seats} top</span>
                    </span>
                  </div>

                  {/* Table Middle: Occupied info */}
                  {t.status === 'occupied' || t.status === 'billed' ? (
                    <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>{t.currentServer}</span>
                        <span className="text-amber-400 font-bold">{t.guestCount} guests</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{t.seatedAt}</span>
                        </span>
                        <span className="text-emerald-400 font-black">
                          ${(t.orderTotal || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-slate-500 italic">
                      {t.status === 'available' ? 'Table Ready to Seat' : 'Awaiting Bussing'}
                    </div>
                  )}

                  {/* Table Status Badge */}
                  <div className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold flex items-center justify-between ${badge.bg}`}>
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                      <span>{badge.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Table Inspector & Action Panel (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4">
          {selectedTable ? (
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-400 font-mono font-bold uppercase tracking-wider">
                    {selectedTable.section}
                  </span>
                  <h3 className="text-2xl font-black text-white">{selectedTable.tableNumber}</h3>
                </div>
                <div className="text-right font-mono">
                  <div className="text-xs text-slate-400">Capacity</div>
                  <div className="text-lg font-bold text-slate-200">{selectedTable.seats} Seats</div>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Update Table Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['available', 'occupied', 'billed', 'dirty'] as const).map(st => {
                    const b = getStatusBadge(st);
                    const isActive = selectedTable.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedTable.id, st)}
                        className={`p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
                          isActive
                            ? 'bg-slate-800 border-white text-white shadow-sm ring-1 ring-white/30'
                            : `${b.bg} hover:opacity-80`
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${b.dot}`}></span>
                        <span className="truncate">{st}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order / Seating Info Card */}
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Assigned Server:</span>
                  <span className="text-white font-bold">{selectedTable.currentServer || 'Elena R.'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Current Guest Count:</span>
                  <span className="text-amber-400 font-mono font-bold">{selectedTable.guestCount || selectedTable.seats} Guests</span>
                </div>
                {selectedTable.status === 'occupied' && (
                  <>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Seated Duration:</span>
                      <span className="text-slate-300 font-mono">{selectedTable.seatedAt || 'Just seated'}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-white uppercase">Table Balance:</span>
                      <span className="text-xl font-black font-mono text-emerald-400">
                        ${(selectedTable.orderTotal || 0).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 italic text-sm">
              Select a table from the floor map to manage orders and seating
            </div>
          )}

          {/* Primary Action Button */}
          {selectedTable && (
            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  playBeep('beep');
                  onSelectTableForOrder(selectedTable);
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Utensils className="w-4 h-4" />
                <span>Open Table Order in POS Register →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
