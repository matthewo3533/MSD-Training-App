import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import { formatUserName } from '../utils/nameFormatter';

interface IntakeMember {
  id: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

interface Intake {
  id: string;
  name: string;
  description: string | null;
  members: IntakeMember[];
  skillGroups: any[];
  _count: {
    trainingSessions: number;
  };
}

const IntakeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (id) {
      fetchIntake();
      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        fetchAvailableUsers();
      }
    }
  }, [id, user]);

  const fetchIntake = async () => {
    try {
      const response = await api.get(`/intakes/${id}`);
      setIntake(response.data);
    } catch (error) {
      console.error('Error fetching intake:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      if (user?.role === 'ADMIN') {
        const response = await api.get('/users');
        const trainees = response.data.filter((u: any) => u.role === 'TRAINEE');
        setAvailableUsers(trainees);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    try {
      await api.post(`/intakes/${id}/members`, { userId: selectedUserId });
      setShowAddMember(false);
      setSelectedUserId('');
      fetchIntake();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this trainee from the intake?')) return;
    try {
      await api.delete(`/intakes/${id}/members/${userId}`);
      fetchIntake();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove member');
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

  if (!intake) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-primary-text">Intake not found</div>
        </div>
      </Layout>
    );
  }

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/intakes" className="text-accent-primary hover:underline mb-4 inline-block">
            ← Back to Intakes
          </Link>
          <h1 className="text-3xl font-bold text-primary-text mb-2">{intake.name}</h1>
          {intake.description && (
            <p className="text-primary-text-secondary">{intake.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trainees */}
          <div className="bg-primary-secondary rounded-lg border border-primary-border">
            <div className="p-6 border-b border-primary-border flex justify-between items-center">
              <h2 className="text-xl font-semibold text-primary-text">Trainees</h2>
              {canManage && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="bg-accent-primary text-white px-4 py-2 rounded-md text-sm hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                >
                  Add Trainee
                </button>
              )}
            </div>
            <div className="p-6">
              {intake.members.length === 0 ? (
                <div className="text-center py-8 text-primary-text-secondary">
                  No trainees assigned
                </div>
              ) : (
                <div className="space-y-2 animate-stagger">
                  {intake.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex justify-between items-center p-3 bg-primary-tertiary rounded-lg hover-lift transition-all-smooth"
                    >
                      <Link
                        to={`/trainees/${member.user.id}`}
                        className="text-primary-text hover:text-accent-primary"
                      >
                        {formatUserName(member.user.username)}
                      </Link>
                      {canManage && (
                        <button
                          onClick={() => handleRemoveMember(member.user.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Skill Groups */}
          <div className="bg-primary-secondary rounded-lg border border-primary-border">
            <div className="p-6 border-b border-primary-border flex justify-between items-center">
              <h2 className="text-xl font-semibold text-primary-text">Skill Groups</h2>
              <Link
                to={`/intakes/${id}/skills`}
                className="text-accent-primary hover:underline text-sm"
              >
                Manage →
              </Link>
            </div>
            <div className="p-6">
              {intake.skillGroups.length === 0 ? (
                <div className="text-center py-8 text-primary-text-secondary">
                  No skill groups created
                </div>
              ) : (
                <div className="space-y-2 animate-stagger">
                  {intake.skillGroups.map((group: any) => (
                    <div
                      key={group.id}
                      className="p-3 bg-primary-tertiary rounded-lg hover-lift transition-all-smooth"
                    >
                      <div className="text-primary-text font-medium">{group.name}</div>
                      <div className="text-primary-text-secondary text-sm">
                        {group._count?.skills || 0} skills
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-primary-secondary rounded-lg p-6 max-w-md w-full mx-4 border border-primary-border animate-scale-in">
              <h2 className="text-xl font-bold mb-4 text-primary-text">Add Trainee</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                  Select Trainee
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                >
                  <option value="">Select a trainee...</option>
                  {availableUsers
                    .filter(
                      (u) => !intake.members.some((m) => m.user.id === u.id)
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {formatUserName(u.username)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setSelectedUserId('');
                  }}
                  className="px-4 py-2 border border-primary-border rounded-md text-primary-text hover:bg-primary-tertiary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  className="px-4 py-2 bg-accent-primary rounded-md text-white hover:opacity-90"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default IntakeDetail;

