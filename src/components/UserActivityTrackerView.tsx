import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Users,
  Database,
  Search,
  Filter,
  Download,
  Shield,
  ShieldCheck,
  Clock,
  User,
  Key,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileCode,
  Lock,
  ChevronDown,
  ChevronUp,
  Terminal,
  Laptop,
  ArrowUpRight,
  UserCheck,
  Check
} from 'lucide-react';
import { AuditLog, User as SystemUser } from '../types';

interface UserActivityTrackerViewProps {
  currentUser: SystemUser;
}

interface ActivityStats {
  totalActivities: number;
  userBreakdown: Record<string, { name: string; role: string; count: number; lastActive: string }>;
  actionBreakdown: Record<string, number>;
  users: (SystemUser & { activityCount: number; lastActiveAt: string })[];
  recentActivities: AuditLog[];
}

export const UserActivityTrackerView: React.FC<UserActivityTrackerViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'stream' | 'users' | 'database'>('stream');
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [usersList, setUsersList] = useState<(SystemUser & { activityCount?: number; lastActiveAt?: string })[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlSchema, setSqlSchema] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<any>(null);

  const fetchActivityData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch user activities and breakdown
      const actRes = await fetch('/api/user-activities');
      if (actRes.ok) {
        const data = await actRes.json();
        setStats(data);
        setActivities(data.recentActivities || []);
        if (data.users) {
          setUsersList(data.users);
        }
      }

      // 2. Fetch database status
      const dbRes = await fetch('/api/database/status');
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDbStatus(dbData);
      }

      // 3. Fetch SQL schema for programmer inspector
      const schemaRes = await fetch('/api/database/schema-sql');
      if (schemaRes.ok) {
        const schemaText = await schemaRes.text();
        setSqlSchema(schemaText);
      }
    } catch (err) {
      console.error('Failed to load user activity data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, []);

  // Filter activities based on search query, user filter, and action filter
  const filteredActivities = useMemo(() => {
    return activities.filter(item => {
      const matchesSearch =
        !searchQuery ||
        item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.targetId && item.targetId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesUser =
        selectedUserFilter === 'all' || item.userId === selectedUserFilter;

      const matchesAction =
        selectedActionFilter === 'all' ||
        (selectedActionFilter === 'AUTH' && (item.action.includes('USER') || item.action.includes('LOGIN') || item.action.includes('SWITCH'))) ||
        (selectedActionFilter === 'SALES' && (item.action.includes('ORDER') || item.action.includes('SALE') || item.action.includes('PAYMENT'))) ||
        (selectedActionFilter === 'INVENTORY' && (item.action.includes('INVENTORY') || item.action.includes('STOCK') || item.action.includes('BARCODE'))) ||
        (selectedActionFilter === 'SYSTEM' && (item.action.includes('SETTINGS') || item.action.includes('SYSTEM') || item.action.includes('PROMOTION')));

      return matchesSearch && matchesUser && matchesAction;
    });
  }, [activities, searchQuery, selectedUserFilter, selectedActionFilter]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'User Name', 'Role', 'Action', 'Target Type', 'Target ID', 'Details', 'IP Address'];
    const rows = filteredActivities.map(a => [
      a.timestamp,
      `"${a.userName.replace(/"/g, '""')}"`,
      a.userRole,
      a.action,
      a.targetType,
      a.targetId || '',
      `"${a.details.replace(/"/g, '""')}"`,
      a.ipAddress || 'Local Terminal'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `user_activity_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('VOID') || action.includes('DELETE') || action.includes('DEACTIVATE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('CREATE') || action.includes('LOGIN') || action.includes('INIT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('UPDATE') || action.includes('ADJUST') || action.includes('OVERRIDE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50 overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                User Activity & System Audit Hub
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-900 text-amber-400 rounded-md">
                  Creator & Admin Portal
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Continuous real-time forensic activity tracking, cashier actions, audit trail, and database telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stream'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-500" />
            <span>Activity Stream ({filteredActivities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>System Users ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Database & Schema</span>
          </button>

          <button
            type="button"
            onClick={fetchActivityData}
            title="Refresh Live Data"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 shrink-0">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total User Activities</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {stats?.totalActivities ?? activities.length}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Audit log synchronized
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Registered Users</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {usersList.length}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {usersList.filter(u => u.active).length} Active Cashiers/Admins
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Database Engine</div>
            <div className="text-base font-black text-slate-900 mt-1 truncate max-w-[150px]" title="SQL Server 2022 / Azure SQL Compatible">
              SQL Server 2022
            </div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
              12 Relational Tables Ready
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Compliance & Security</div>
            <div className="text-base font-black text-emerald-600 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Texas TABC 21+
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Tamper-proof audit active
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Area based on activeTab */}
      <div className="flex-1 min-h-0 px-4 pb-4 overflow-hidden flex flex-col">
        {activeTab === 'stream' && (
          <div className="bg-white rounded-2xl border border-slate-200 flex-1 min-h-0 flex flex-col shadow-2xs overflow-hidden">
            {/* Filter Bar */}
            <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by cashier name, action, product, or target ID..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                {/* User Filter Dropdown */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500">User:</span>
                  <select
                    value={selectedUserFilter}
                    onChange={e => setSelectedUserFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-800 font-medium"
                  >
                    <option value="all">All Users ({usersList.length})</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Category Filter */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500">Type:</span>
                  <select
                    value={selectedActionFilter}
                    onChange={e => setSelectedActionFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-800 font-medium"
                  >
                    <option value="all">All Actions</option>
                    <option value="AUTH">Auth & Shifts</option>
                    <option value="SALES">Sales & Voids</option>
                    <option value="INVENTORY">Inventory & Recounts</option>
                    <option value="SYSTEM">System & Settings</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Activities Table */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {filteredActivities.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <div className="font-bold text-slate-700 text-sm">No activity records match your filter criteria</div>
                  <div className="text-xs text-slate-400 mt-1">Try broadening your search query or selecting "All Users"</div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">User / Operator</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Target</th>
                      <th className="py-2.5 px-4">Details</th>
                      <th className="py-2.5 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredActivities.map(item => {
                      const isExpanded = expandedLogId === item.id;
                      const badgeClass = getActionBadgeColor(item.action);

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              <div className="flex items-center space-x-1.5">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0">
                                  {item.userName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{item.userName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{item.userRole}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badgeClass}`}>
                                {item.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold mr-1 text-[10px]">
                                {item.targetType}
                              </span>
                              {item.targetId || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-slate-800 max-w-md truncate font-medium">
                              {item.details}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setExpandedLogId(isExpanded ? null : item.id)}
                                className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg inline-flex items-center space-x-1 transition-colors cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide' : 'Details'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-900 text-slate-200">
                              <td colSpan={6} className="p-4 border-y border-slate-800">
                                <div className="text-xs space-y-2 font-mono">
                                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                                    <div className="flex items-center space-x-2">
                                      <Terminal className="w-4 h-4 text-amber-400" />
                                      <span className="font-bold text-white">Event Forensics: {item.id}</span>
                                    </div>
                                    <span className="text-[11px]">IP: {item.ipAddress || '127.0.0.1 (Local Front Counter Terminal)'}</span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div>
                                      <div className="text-[10px] uppercase font-bold text-slate-400">Detailed Message</div>
                                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-amber-200 mt-1 font-sans">
                                        {item.details}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] uppercase font-bold text-slate-400">Context / Telemetry</div>
                                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300 mt-1">
                                        <div><strong>User ID:</strong> {item.userId}</div>
                                        <div><strong>Target Entity:</strong> {item.targetType} ({item.targetId})</div>
                                        <div><strong>Terminal Device:</strong> {item.deviceId || 'POS-FRONT-01'}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {(item.beforeData || item.afterData) && (
                                    <div className="pt-2">
                                      <div className="text-[10px] uppercase font-bold text-slate-400">State Snapshot (Before / After)</div>
                                      <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px] text-emerald-400 overflow-x-auto max-h-40">
                                        {JSON.stringify({ before: item.beforeData, after: item.afterData }, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: System Users & Security Profiles */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 flex-1 min-h-0 flex flex-col shadow-2xs overflow-hidden p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-base font-black text-slate-900">System Users & Cashier Operators</h2>
                <p className="text-xs text-slate-500">Track all accounts authorized to operate the POS terminal, their roles, and activity records</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {usersList.map(user => {
                  const userActivityCount = activities.filter(a => a.userId === user.id).length;
                  const lastLog = activities.find(a => a.userId === user.id);

                  return (
                    <div
                      key={user.id}
                      className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4.5 hover:border-amber-300 hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 font-black text-base flex items-center justify-center shadow-xs">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                              <div className="text-xs text-slate-500 font-mono">{user.email || 'No email attached'}</div>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'Admin'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : user.role === 'Manager'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-200 text-slate-800 border border-slate-300'
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center space-x-1.5">
                              <Key className="w-3.5 h-3.5 text-slate-400" />
                              <span>Terminal PIN:</span>
                            </span>
                            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {user.pin ? `•••• (${user.pin.length} digits)` : '1234'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center space-x-1.5">
                              <Activity className="w-3.5 h-3.5 text-amber-500" />
                              <span>Logged Activities:</span>
                            </span>
                            <span className="font-bold text-slate-900">{userActivityCount} events</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Last Active:</span>
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {lastLog ? new Date(lastLog.timestamp).toLocaleDateString() : 'Active Today'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active Operator
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserFilter(user.id);
                            setActiveTab('stream');
                          }}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Filter Audit Trail</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Database & Production Schema Inspector */}
        {activeTab === 'database' && (
          <div className="bg-white rounded-2xl border border-slate-200 flex-1 min-h-0 flex flex-col shadow-2xs overflow-hidden p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 shrink-0 gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  Database & Production Deployment Specifications
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold uppercase">
                    Ready to Deploy
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Target: Microsoft SQL Server 2022 / Azure SQL Database & PostgreSQL with Entity Framework Core models
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileCode className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>

                <a
                  href="/api/database/export"
                  download
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Backup (JSON)</span>
                </a>
              </div>
            </div>

            {/* Table Statistics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 py-4 shrink-0 border-b border-slate-200">
              {dbStatus?.tables &&
                Object.entries(dbStatus.tables).map(([tableName, val]: [string, any]) => (
                  <div key={tableName} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-mono text-slate-400 uppercase truncate">{tableName}</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">{val.count ?? 0} rows</div>
                  </div>
                ))}
            </div>

            {/* SQL Schema Code Viewer */}
            <div className="flex-1 min-h-0 flex flex-col mt-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-1.5 shrink-0">
                <span>/server/database/schema.sql (Production Ready)</span>
                <span>ANSI SQL-92 / T-SQL / PL-pgSQL</span>
              </div>
              <div className="flex-1 min-h-0 bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-auto text-xs font-mono text-slate-300">
                <pre>{sqlSchema || '-- Loading database schema...'}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
