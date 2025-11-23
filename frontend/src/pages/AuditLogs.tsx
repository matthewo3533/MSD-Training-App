import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { formatDateTime } from '../utils/date';
import { formatUserName } from '../utils/nameFormatter';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: {
    username: string;
    role: string;
  };
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/audit');
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-text">Audit Logs</h1>
        </div>

        <div className="bg-primary-secondary rounded-lg border border-primary-border overflow-hidden">
          <table className="min-w-full divide-y divide-primary-border">
            <thead className="bg-primary-tertiary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-text-secondary uppercase tracking-wider">
                  Entity ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-primary-secondary divide-y divide-primary-border">
              {logs.map((log) => (
                <tr key={log.id} className="animate-fade-in hover:bg-primary-tertiary transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text-secondary">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text">
                    {formatUserName(log.user.username)} ({log.user.role})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text-secondary">
                    {log.entityType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-text-secondary">
                    {log.entityId || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default AuditLogs;

