import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  UserCheck,
  UserPlus,
  Shield,
  KeyRound,
  Mail,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  Lock,
} from 'lucide-react';

interface UsersViewProps {
  users: User[];
  currentUser: User | null;
  onRefresh: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, currentUser, onRefresh }) => {
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRole>('Cashier');
  const [pin, setPin] = useState<string>('1234');
  const [active, setActive] = useState<boolean>(true);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('Cashier');
    setPin('1234');
    setActive(true);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setPin(u.pin);
    setActive(u.active);
    setShowAddEditModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name,
          email,
          role,
          pin,
          active,
        });
      } else {
        await api.createUser({
          name,
          email,
          role,
          pin,
          active,
          password: 'password123',
        });
      }
      playBeep('success');
      setShowAddEditModal(false);
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to save operator account');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await api.updateUser(user.id, { active: !user.active });
      playBeep('success');
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] p-4 md:p-6 select-none space-y-4">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shrink-0">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-[#C5A059]" />
            <span>Staff & Access Management</span>
          </h2>
          <p className="text-xs text-[#737373] mt-0.5 font-sans">
            Configure register PINs, role permissions, and terminal access
          </p>
        </div>

        <button
          id="user-create-btn"
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl overflow-hidden shadow-md flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs text-[#D4D4D4]">
          <thead className="bg-[#0A0A0A] text-[#737373] uppercase text-[10px] tracking-widest border-b border-[#262626] font-bold">
            <tr>
              <th className="px-4 py-3.5">Employee Name</th>
              <th className="px-4 py-3.5">Email Address</th>
              <th className="px-4 py-3.5">System Role</th>
              <th className="px-4 py-3.5 font-mono">Terminal PIN</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-[#161616] transition-colors">
                <td className="px-4 py-3 font-medium text-[#F5F5F5] font-sans">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center font-bold text-xs font-serif border border-[#C5A059]/30">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                  </div>
                </td>

                <td className="px-4 py-3 font-mono text-[#A3A3A3] text-[11px]">{u.email}</td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'Admin'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : u.role === 'Manager'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>

                <td className="px-4 py-3 font-mono text-[#E5E5E5]">
                  <span className="tracking-widest bg-[#141414] px-2 py-0.5 rounded border border-[#262626]">
                    {u.pin}
                  </span>
                </td>

                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      u.active
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                        : 'bg-red-950/40 text-red-400 border border-red-800/60'
                    }`}
                  >
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                        u.active
                          ? 'bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-850'
                          : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-850'
                      }`}
                    >
                      {u.active ? 'Disable' : 'Reactivate'}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 text-[#737373] hover:text-white rounded hover:bg-[#1A1A1A] cursor-pointer transition-colors"
                      title="Edit User"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#262626] pb-3">
              <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">
                {editingUser ? `Edit ${editingUser.name}` : 'Create Staff Member'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-[#737373] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. David Martinez"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. david@pos.local"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Role *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-semibold focus:outline-hidden focus:border-[#C5A059]"
                  >
                    <option value="Cashier" className="bg-[#141414]">Cashier</option>
                    <option value="Manager" className="bg-[#141414]">Manager</option>
                    <option value="Admin" className="bg-[#141414]">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Register PIN (4-digits) *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono tracking-widest focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="user-active-chk"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="rounded bg-[#141414] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
                />
                <label htmlFor="user-active-chk" className="text-[#D4D4D4] font-medium">
                  Account Active (Allowed to sign into terminals)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-md"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
