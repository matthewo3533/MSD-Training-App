import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import { downloadFile } from '../utils/download';

interface SkillGroup {
  id: string;
  name: string;
  description: string | null;
  skills: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

const SkillGroups = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [createData, setCreateData] = useState({ name: '', description: '' });
  const [csvData, setCsvData] = useState('');

  useEffect(() => {
    if (id) {
      fetchSkillGroups();
    }
  }, [id]);

  const fetchSkillGroups = async () => {
    try {
      const response = await api.get(`/skills/groups/intake/${id}`);
      setSkillGroups(response.data);
    } catch (error) {
      console.error('Error fetching skill groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/skills/groups', { intakeId: id, ...createData });
      setShowCreate(false);
      setCreateData({ name: '', description: '' });
      fetchSkillGroups();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create skill group');
    }
  };

  const handleImport = async () => {
    try {
      const response = await api.post(`/skills/groups/intake/${id}/import`, { csv: csvData, dryRun: false });
      alert(`Imported ${response.data.success} skills, ${response.data.errors} errors`);
      setShowImport(false);
      setCsvData('');
      fetchSkillGroups();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to import CSV');
    }
  };

  const handleExport = () => {
    downloadFile(`/skills/groups/intake/${id}/export`);
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

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to={`/intakes/${id}`} className="text-accent-primary hover:underline mb-4 inline-block">
            ← Back to Intake
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary-text">Skill Groups</h1>
            {canManage && (
              <div className="space-x-3">
                <button
                  onClick={() => setShowImport(true)}
                  className="bg-primary-tertiary text-primary-text px-4 py-2 rounded-md border border-primary-border hover:bg-primary-secondary"
                >
                  Import CSV
                </button>
                <button
                  onClick={handleExport}
                  className="bg-accent-primary text-white px-4 py-2 rounded-md hover:opacity-90"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="bg-accent-primary text-white px-4 py-2 rounded-md hover:opacity-90"
                >
                  Create Group
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {skillGroups.length === 0 ? (
            <div className="text-center py-12 bg-primary-secondary rounded-lg border border-primary-border">
              <div className="text-primary-text-secondary">No skill groups found</div>
            </div>
          ) : (
            skillGroups.map((group) => (
              <div key={group.id} className="bg-primary-secondary rounded-lg border border-primary-border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-primary-text">{group.name}</h3>
                    {group.description && (
                      <p className="text-primary-text-secondary text-sm mt-1">{group.description}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 animate-stagger">
                  {group.skills.length === 0 ? (
                    <div className="text-primary-text-secondary text-sm">No skills</div>
                  ) : (
                    group.skills.map((skill) => (
                      <div key={skill.id} className="bg-primary-tertiary rounded p-3 border border-primary-border hover-lift transition-all-smooth">
                        <div className="text-primary-text font-medium">{skill.name}</div>
                        {skill.description && (
                          <div className="text-primary-text-secondary text-sm mt-1">{skill.description}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-primary-secondary rounded-lg p-6 max-w-md w-full mx-4 border border-primary-border animate-scale-in">
              <h2 className="text-xl font-bold mb-4 text-primary-text">Create Skill Group</h2>
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

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-primary-secondary rounded-lg p-6 max-w-2xl w-full mx-4 border border-primary-border animate-scale-in">
              <h2 className="text-xl font-bold mb-4 text-primary-text">Import CSV</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                  CSV Data (format: Skill Group, Skill Name, Skill Description)
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text font-mono text-sm"
                  rows={10}
                  placeholder="Skill Group,Skill Name,Skill Description&#10;Computing Skills,Typing Speed,WPM&#10;Computing Skills,Navigation,System navigation"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowImport(false);
                    setCsvData('');
                  }}
                  className="px-4 py-2 border border-primary-border rounded-md text-primary-text hover:bg-primary-tertiary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-accent-primary rounded-md text-white hover:opacity-90"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SkillGroups;

