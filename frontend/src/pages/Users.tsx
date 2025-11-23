import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import { formatDate } from '../utils/date';
import { formatUserName } from '../utils/nameFormatter';

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ username: '', password: '', role: 'TRAINEE' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', createData);
      setShowCreate(false);
      setCreateData({ username: '', password: '', role: 'TRAINEE' });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-primary-text">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary-text">Users</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-accent-primary text-white px-4 py-2 rounded-md hover:opacity-90"
          >
            Create User
          </button>
        </div>

        <div className="bg-primary-secondary rounded-lg border border-primary-border overflow-hidden">
          <table className="min-w-full divide-y divide-primary-border">
            <thead className="bg-primary-tertiary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-primary-secondary divide-y divide-primary-border">
              {users.map((u) => (
                <tr key={u.id} className="animate-fade-in hover:bg-primary-tertiary transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text">{formatUserName(u.username)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text-secondary">{u.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text-secondary">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-primary-secondary rounded-lg p-6 max-w-md w-full mx-4 border border-primary-border animate-scale-in">
              <h2 className="text-xl font-bold mb-4 text-primary-text">Create User</h2>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={createData.username}
                    onChange={(e) => setCreateData({ ...createData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={createData.password}
                    onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                    Role *
                  </label>
                  <select
                    value={createData.role}
                    onChange={(e) => setCreateData({ ...createData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                  >
                    <option value="TRAINEE">Trainee</option>
                    <option value="TRAINER">Trainer</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 border border-primary-border rounded-md text-primary-text hover:bg-primary-tertiary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent-primary rounded-md text-white hover:opacity-90"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Users;

