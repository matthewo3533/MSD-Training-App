import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

interface Intake {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: {
    members: number;
    skillGroups: number;
    trainingSessions: number;
  };
}

const Intakes = () => {
  const { user } = useAuth();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchIntakes();
  }, []);

  const fetchIntakes = async () => {
    try {
      const response = await api.get('/intakes');
      setIntakes(response.data);
    } catch (error) {
      console.error('Error fetching intakes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/intakes', createData);
      setShowCreate(false);
      setCreateData({ name: '', description: '' });
      fetchIntakes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create intake');
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

  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-primary-text">Intakes</h1>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="bg-accent-primary text-white px-4 py-2 rounded-md hover:opacity-90"
            >
              Create Intake
            </button>
          )}
        </div>

        {intakes.length === 0 ? (
          <div className="text-center py-12 bg-primary-secondary rounded-lg border border-primary-border">
            <div className="text-primary-text-secondary">No intakes found</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
            {intakes.map((intake) => (
              <Link
                key={intake.id}
                to={`/intakes/${intake.id}`}
                className="block p-6 bg-primary-secondary rounded-lg border border-primary-border hover:border-accent-primary transition-all-smooth hover-lift animate-fade-in-up"
              >
                <h3 className="text-xl font-semibold text-primary-text mb-2">{intake.name}</h3>
                {intake.description && (
                  <p className="text-primary-text-secondary text-sm mb-4">{intake.description}</p>
                )}
                <div className="flex justify-between text-sm text-primary-text-muted">
                  <span>{intake._count.members} trainees</span>
                  <span>{intake._count.trainingSessions} sessions</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-primary-secondary rounded-lg p-6 max-w-md w-full mx-4 border border-primary-border">
              <h2 className="text-xl font-bold mb-4 text-primary-text">Create Intake</h2>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={createData.name}
                    onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={createData.description}
                    onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                    rows={3}
                  />
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

export default Intakes;

