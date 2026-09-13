import React, { useState } from 'react';
import { Customer } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import { Search, UserPlus, UserCheck, X, Phone, Mail } from 'lucide-react';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onRefreshCustomers: () => void;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSelectCustomer,
  onRefreshCustomers,
}) => {
  const [search, setSearch] = useState<string>('');
  const [showCreateInline, setShowCreateInline] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');

  if (!isOpen) return null;

  const filtered = customers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q));
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createCustomer({
        name: newName,
        phone: newPhone,
        email: newEmail,
      });
      playBeep('success');
      onRefreshCustomers();
      onSelectCustomer(created);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex justify-between items-center">
          <div>
            <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">Attach Customer to Sale</h3>
            <p className="text-xs text-[#737373] mt-0.5">Track loyalty points and purchase history</p>
          </div>
          <button onClick={onClose} className="text-[#737373] hover:text-white cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {showCreateInline ? (
            <form onSubmit={handleCreateCustomer} className="space-y-3 bg-[#141414] p-4 rounded-xl border border-[#262626] text-xs">
              <h4 className="font-bold text-[#E5E5E5] uppercase tracking-wider text-[11px]">Quick Add Customer</h4>
              <div>
                <label className="block text-[#888888] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Liam Walker"
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:border-[#C5A059] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[#888888] mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="e.g. 555-0182"
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:border-[#C5A059] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[#888888] mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="liam@example.com"
                  className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:border-[#C5A059] focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateInline(false)}
                  className="px-3 py-1.5 rounded-lg text-[#737373] hover:text-white uppercase tracking-wider text-[10px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-[11px] shadow-sm"
                >
                  Save & Attach
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search customer by name or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] rounded-full pl-10 pr-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden focus:border-[#C5A059] transition-colors"
                />
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#737373]">Existing Customers</span>
                <button
                  onClick={() => setShowCreateInline(true)}
                  className="text-xs text-[#C5A059] hover:underline font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Customer</span>
                </button>
              </div>

              {/* List */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto divide-y divide-[#262626]">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      playBeep('click');
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className="w-full p-3 rounded-lg hover:bg-[#141414] flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="font-medium text-xs text-[#E5E5E5] group-hover:text-[#C5A059] transition-colors flex items-center space-x-1.5">
                        <span>{c.name}</span>
                        {c.loyaltyTier && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#C5A059]/15 text-[#C5A059] font-bold">
                            {c.loyaltyTier}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#737373] font-mono mt-0.5">{c.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#C5A059] font-mono">{c.loyaltyPoints.toLocaleString()} pts</div>
                      <div className="text-[10px] text-[#737373] font-mono">${c.totalSpent.toFixed(2)} spent</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
