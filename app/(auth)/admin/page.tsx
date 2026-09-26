'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_locked: boolean;
  failed_login_attempts: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (res.ok) {
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } else {
      alert('Failed to create account');
    }
  };

  const handleToggleLock = async (id: string, currentLockStatus: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_locked: !currentLockStatus }),
    });
    fetchUsers();
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  if (loading) return <div className="p-8">Loading administration dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-8 space-y-8">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Account Administration</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage user accounts, roles, and unlock locked users</p>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link href="/" className="bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded text-sm font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Create User Form */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
        <h2 className="text-lg font-semibold">Create New Account</h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button type="submit" className="bg-indigo-600 text-white rounded font-semibold py-2">
            + Add Account
          </button>
        </form>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Failed Attempts</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-3">
                  <p className="font-semibold">{u.name || 'N/A'}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="px-6 py-3 font-mono text-xs">{u.role}</td>
                <td className="px-6 py-3">{u.failed_login_attempts}</td>
                <td className="px-6 py-3">
                  {u.is_locked ? (
                    <span className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-2 py-1 rounded text-xs font-bold">
                      LOCKED
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-1 rounded text-xs font-bold">
                      ACTIVE
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleToggleLock(u.id, u.is_locked)}
                    className="bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded text-xs font-semibold"
                  >
                    {u.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="bg-rose-600 text-white px-3 py-1 rounded text-xs font-semibold"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
