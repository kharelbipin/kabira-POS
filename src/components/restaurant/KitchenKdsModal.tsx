import React, { useState } from 'react';
import { playBeep } from '../../utils/audio';
import {
  X,
  Flame,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Volume2,
} from 'lucide-react';

interface KitchenKdsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface KitchenTicket {
  id: string;
  ticketNumber: number;
  table: string;
  server: string;
  timeElapsed: string;
  items: {
    name: string;
    qty: number;
    modifiers?: string;
  }[];
  status: 'new' | 'preparing' | 'ready';
}

const INITIAL_KITCHEN_TICKETS: KitchenTicket[] = [
  {
    id: 'kds-101',
    ticketNumber: 42,
    table: 'Table #2 (Main Dining)',
    server: 'Elena R.',
    timeElapsed: '4m 12s',
    items: [
      { name: '12oz Prime Ribeye Steak', qty: 2, modifiers: 'Temp: Med Rare • Truffle Butter • Caesar Salad' },
      { name: 'Crispy Truffle Fries', qty: 1, modifiers: 'Extra crispy • Dip on side' },
      { name: 'Brazos Craft IPA (Pint)', qty: 2 },
    ],
    status: 'preparing',
  },
  {
    id: 'kds-102',
    ticketNumber: 43,
    table: 'Table #4 (Main Dining)',
    server: 'Marcus K.',
    timeElapsed: '1m 45s',
    items: [
      { name: 'Pan-Seared Atlantic Salmon', qty: 1, modifiers: 'Steamed Garlic Broccoli • Lemon butter' },
      { name: 'House Caesar Salad', qty: 1, modifiers: 'No croutons (**GLUTEN-FREE**)' },
    ],
    status: 'new',
  },
  {
    id: 'kds-103',
    ticketNumber: 44,
    table: 'Bar Stool #1 (Bar)',
    server: 'Elena R.',
    timeElapsed: '8m 30s',
    items: [
      { name: 'Smoked Buffalo Wings (10pc)', qty: 1, modifiers: 'Sauce: Ghost Pepper Hot • Ranch' },
      { name: 'Old Fashioned Bourbon Cocktail', qty: 1, modifiers: 'Large rock cube' },
    ],
    status: 'ready',
  },
];

export const KitchenKdsModal: React.FC<KitchenKdsModalProps> = ({ isOpen, onClose }) => {
  const [tickets, setTickets] = useState<KitchenTicket[]>(INITIAL_KITCHEN_TICKETS);
  const [printedAlert, setPrintedAlert] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateTicketStatus = (id: string, newStatus: KitchenTicket['status']) => {
    playBeep(newStatus === 'ready' ? 'success' : 'click');
    setTickets(prev =>
      prev.map(t => (t.id === id ? { ...t, status: newStatus } : t))
    );
  };

  const handlePrintKitchenChit = (ticket: KitchenTicket) => {
    playBeep('beep');
    setPrintedAlert(`Kitchen Chit #${ticket.ticketNumber} routed to Line Cook Thermal Printer.`);
    setTimeout(() => setPrintedAlert(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0B1120] border border-rose-500/40 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#020617] px-6 py-4 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight text-white uppercase">
                  Kitchen Display System (KDS) & Chit Router
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                  LINE COOK TERMINAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                POS Bridge Kitchen Printer (Epson TM-T88) & Real-time Prep Monitor
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chit Print Notification banner */}
        {printedAlert && (
          <div className="bg-emerald-950/80 border-b border-emerald-600 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-300 font-mono animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{printedAlert}</span>
            </div>
            <span className="text-[10px] text-emerald-500">ESC/POS 80mm</span>
          </div>
        )}

        {/* Tickets Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map(ticket => {
            const isNew = ticket.status === 'new';
            const isPrep = ticket.status === 'preparing';
            const isReady = ticket.status === 'ready';

            return (
              <div
                key={ticket.id}
                className={`rounded-3xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                  isNew
                    ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                    : isPrep
                    ? 'bg-slate-900 border-blue-500/60 ring-1 ring-blue-500/30'
                    : 'bg-emerald-950/20 border-emerald-500/60 ring-1 ring-emerald-500/30'
                }`}
              >
                {/* Ticket Top */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-black font-mono text-white">
                        #{ticket.ticketNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-300 truncate max-w-[140px]">
                        {ticket.table}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">Server: {ticket.server}</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-xs font-mono text-amber-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ticket.timeElapsed}</span>
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                        isNew
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isPrep
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </div>

                {/* Ticket Items List */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  {ticket.items.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-800/80 pb-2 last:border-none last:pb-0">
                      <div className="flex items-start justify-between text-xs font-bold text-white">
                        <span>{item.name}</span>
                        <span className="font-mono text-amber-400 shrink-0 ml-2">x{item.qty}</span>
                      </div>
                      {item.modifiers && (
                        <div className="text-[11px] font-mono text-rose-300/90 mt-0.5 bg-slate-950/40 p-1 rounded-md border border-slate-800">
                          {item.modifiers}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Ticket Actions */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintKitchenChit(ticket)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Reprint Kitchen Chit"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {isNew && (
                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(ticket.id, 'preparing')}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Start Prep →
                    </button>
                  )}

                  {isPrep && (
                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(ticket.id, 'ready')}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Mark Ready (Expedite) ✓
                    </button>
                  )}

                  {isReady && (
                    <div className="flex-1 py-2 text-center text-xs font-black font-mono text-emerald-400 bg-emerald-950/40 rounded-xl border border-emerald-800">
                      ORDER READY FOR RUNNER
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
