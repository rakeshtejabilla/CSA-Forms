import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuthStore } from '../context/useAuthStore';
import { Shield, Users, History, UserPlus, Trash2, Loader2, Building2, Eye, EyeOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const roleLabel = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ORG_ADMIN') return 'Org Admin';
  if (role === 'ENUMERATOR') return 'Enumerator';
  return role;
};

const roleBadgeClass = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'bg-rose-100 text-rose-700 border border-rose-200';
  if (role === 'ORG_ADMIN') return 'bg-amber-100 text-amber-700 border border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
};

export default function AdminPage() {
  const { token, user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState<'ENUMERATOR' | 'ORG_ADMIN'>('ENUMERATOR');

  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState('');
  const [actionIsError, setActionIsError] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [newUserOrgId, setNewUserOrgId] = useState('');

  // Filtering
  const [filterOrgId, setFilterOrgId] = useState('');

  // Editing
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editUserRole, setEditUserRole] = useState<'ENUMERATOR' | 'ORG_ADMIN' | 'SUPER_ADMIN'>('ENUMERATOR');
  const [editUserOrgId, setEditUserOrgId] = useState('');
  const [editUserStatus, setEditUserStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const usersRes = await axios.get(`${API_URL}/auth/users`, { headers }).catch(() => ({ data: [] }));
      const allUsers = usersRes.data || [];
      const filtered = allUsers.filter((u: any) => {
        if (user?.role === 'ORG_ADMIN') {
          return u.role === 'ENUMERATOR';
        }
        return true;
      });
      setUsers(filtered);
      const logsRes = await axios.get(`${API_URL}/auth/logs`, { headers }).catch(() => ({ data: [] }));
      setLogs(logsRes.data);
      if (user?.role === 'SUPER_ADMIN') {
        const orgsRes = await axios.get(`${API_URL}/organizations`, { headers }).catch(() => ({ data: [] }));
        setOrganizations(orgsRes.data || []);
      }
    } catch {
      const fallback = [
        { id: '1', name: 'System Admin', email: 'admin@formbuilder.com', role: 'SUPER_ADMIN', createdAt: '2026-05-15T00:00:00Z' },
        { id: '2', name: 'Field Operator', email: 'user@formbuilder.com', role: 'ENUMERATOR', createdAt: '2026-05-20T00:00:00Z' },
      ];
      const filteredFallback = fallback.filter((u: any) => {
        if (user?.role === 'ORG_ADMIN') {
          return u.role === 'ENUMERATOR';
        }
        return true;
      });
      setUsers(filteredFallback);
      setLogs([
        { id: 'l1', action: 'USER_LOGIN', userEmail: 'admin@formbuilder.com', timestamp: '2026-06-01T17:30:00Z', details: 'Successful session authorization' },
        { id: 'l2', action: 'FORM_CREATE', userEmail: 'admin@formbuilder.com', timestamp: '2026-06-01T17:35:00Z', details: 'Form "User Feedback" created' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, [token]);

  useEffect(() => {
    if (!token) return;
    
    // Connect to websocket for live logs
    const socketUrl = API_URL.replace('/api', '');
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      // Join the appropriate room based on role
      const roomToJoin = user?.role === 'SUPER_ADMIN' ? 'admin' : user?.organizationId;
      if (roomToJoin) {
        socket.emit('joinOrganization', roomToJoin);
      }
    });

    socket.on('newAuditLog', (newLog: any) => {
      setLogs((prevLogs) => [newLog, ...prevLogs].slice(0, 100)); // Keep top 100
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  const showStatus = (msg: string, isError = false) => {
    setActionStatus(msg);
    setActionIsError(isError);
    setTimeout(() => setActionStatus(''), 3500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    showStatus('Creating user...');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/auth/users`,
        {
          name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole,
          organizationId: user?.role === 'SUPER_ADMIN' ? newUserOrgId : user?.organizationId
        },
        { headers }
      );
      showStatus('User created successfully!');
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserOrgId('');
      fetchAdminData();
    } catch (err: any) {
      showStatus(err.response?.data?.message || 'Failed to create user.', true);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    showStatus('Deleting user...');
    try {
      await axios.delete(`${API_URL}/auth/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      showStatus('User deleted successfully.');
      fetchAdminData();
    } catch (err: any) {
      showStatus(err.response?.data?.message || 'Failed to delete user.', true);
    }
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserPassword('');
    setEditUserRole(u.role);
    setEditUserOrgId(u.organizationId || '');
    setEditUserStatus(u.status || 'ACTIVE');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    showStatus('Updating user...');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(
        `${API_URL}/auth/users/${editingUser.id}`,
        {
          name: editUserName,
          email: editUserEmail,
          password: editUserPassword || undefined,
          role: editUserRole,
          organizationId: user?.role === 'SUPER_ADMIN' ? editUserOrgId : undefined,
          status: editUserStatus
        },
        { headers }
      );
      showStatus('User updated successfully!');
      setEditingUser(null);
      fetchAdminData();
    } catch (err: any) {
      showStatus(err.response?.data?.message || 'Failed to update user.', true);
    }
  };

  const displayedUsers = users.filter((u: any) => {
    if (filterOrgId) return u.organizationId === filterOrgId;
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="bg-brand-100 p-3 rounded-xl">
          <Shield className="h-6 w-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">Admin Panel</h1>
          <p className="text-xs text-slate-500">Manage members, roles, and review audit activity logs.</p>
        </div>
      </div>

      {actionStatus && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${actionIsError
            ? 'bg-rose-50 border border-rose-200 text-rose-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          }`}>
          <span className={`w-2 h-2 rounded-full ${actionIsError ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          {actionStatus}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Member Directory */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-500" />
                <h2 className="text-sm font-bold text-slate-700">Member Directory</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                  {displayedUsers.length} {user?.role === 'ORG_ADMIN' ? 'enumerators' : 'users'}
                </span>
              </div>
              {user?.role === 'SUPER_ADMIN' && organizations.length > 0 && (
                <select
                  value={filterOrgId}
                  onChange={(e) => setFilterOrgId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-1.5 text-slate-700 cursor-pointer outline-none"
                >
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-5 w-1/4">Name</th>
                    <th className="py-3 px-5 w-1/4">Email</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-5 font-semibold text-slate-800">{u.name}</td>
                      <td className="py-4 px-5 font-mono text-slate-500">{u.email}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${roleBadgeClass(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right flex justify-end gap-2">
                        {user?.id !== u.id && (user?.role === 'SUPER_ADMIN' || (user?.role === 'ORG_ADMIN' && u.role === 'ENUMERATOR')) && (
                          <>
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-brand-600 rounded-lg transition"
                              title="Edit User"
                            >
                              <Shield className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 hover:text-rose-600 rounded-lg transition"
                              title="Delete User"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-700">Audit Logs</h2>
            </div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto p-4">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2 text-center">No audit logs available.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.userEmail}</span>
                      </div>
                      <p className="text-slate-500 mt-1.5">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Create User */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-bold text-slate-700">Add New Member</h2>
          </div>
          <form onSubmit={handleCreateUser} className="p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
                className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                placeholder="John Doe"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
                className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                placeholder="name@company.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full pr-10 text-slate-800 outline-none transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-700 cursor-pointer outline-none"
              >
                <option value="ENUMERATOR">Enumerator (Data Collector)</option>
                {user?.role === 'SUPER_ADMIN' && (
                  <option value="ORG_ADMIN">Organization Admin</option>
                )}
              </select>
            </div>

            {user?.role === 'SUPER_ADMIN' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Organization *</label>
                <select
                  value={newUserOrgId}
                  onChange={(e) => setNewUserOrgId(e.target.value)}
                  required
                  className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-700 cursor-pointer outline-none"
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org: any) => (
                    <option key={org.id} value={org.id}>{org.name} ({org.code})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold tracking-tight shadow-sm shadow-brand-500/20 transition"
            >
              Add Member
            </button>
          </form>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <Shield className="h-4 w-4" /> {/* Replacing X icon with Shield for simplicity, ideally should be an X icon but avoiding extra imports if not available */}
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Full Name *</label>
                <input type="text" value={editUserName} onChange={e => setEditUserName(e.target.value)} required
                  className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Email Address *</label>
                <input type="email" value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} required
                  className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editUserPassword}
                    onChange={e => setEditUserPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full pr-10 text-slate-800 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Role</label>
                <select value={editUserRole} onChange={e => setEditUserRole(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-700 cursor-pointer outline-none"
                >
                  <option value="ENUMERATOR">Enumerator (Data Collector)</option>
                  {user?.role === 'SUPER_ADMIN' && (
                    <option value="ORG_ADMIN">Organization Admin</option>
                  )}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Status</label>
                <select value={editUserStatus} onChange={e => setEditUserStatus(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-700 cursor-pointer outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              {user?.role === 'SUPER_ADMIN' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Organization *</label>
                  <select value={editUserOrgId} onChange={e => setEditUserOrgId(e.target.value)} required
                    className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-700 cursor-pointer outline-none"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map((org: any) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-brand-500/20 transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}