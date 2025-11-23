import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import { formatDate } from '../utils/date';
import { formatUserName } from '../utils/nameFormatter';

interface TraineeProgress {
  averageScore: number;
  label: string;
  color: string;
}

interface IntakeMember {
  id: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
  progress?: TraineeProgress;
}

interface Intake {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members?: IntakeMember[];
  _count: {
    members: number;
    skillGroups: number;
    trainingSessions: number;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [stats, setStats] = useState({
    totalIntakes: 0,
    totalTrainees: 0,
    totalSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  // Redirect trainees directly to their profile page
  useEffect(() => {
    if (user && user.role === 'TRAINEE') {
      navigate(`/trainees/${user.id}`, { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // Only fetch data if user is not a trainee
    if (user && user.role !== 'TRAINEE') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const response = await api.get('/intakes');
      setIntakes(response.data);

      // Calculate stats
      const totalTrainees = response.data.reduce(
        (sum: number, intake: Intake) => sum + intake._count.members,
        0
      );
      const totalSessions = response.data.reduce(
        (sum: number, intake: Intake) => sum + intake._count.trainingSessions,
        0
      );

      setStats({
        totalIntakes: response.data.length,
        totalTrainees,
        totalSessions,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything for trainees (they'll be redirected)
  if (user?.role === 'TRAINEE') {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-primary-text">Redirecting...</div>
        </div>
      </Layout>
    );
  }

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
          <h1 className="text-3xl font-bold text-primary-text mb-2">Dashboard</h1>
          <p className="text-primary-text-secondary">
            Welcome back, {formatUserName(user?.username || '')}! ({user?.role})
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-stagger">
          <div className="bg-primary-secondary rounded-lg p-6 border border-primary-border hover-lift transition-all-smooth">
            <div className="text-primary-text-secondary text-sm mb-1">Total Intakes</div>
            <div className="text-3xl font-bold text-primary-text">{stats.totalIntakes}</div>
          </div>
          <div className="bg-primary-secondary rounded-lg p-6 border border-primary-border hover-lift transition-all-smooth">
            <div className="text-primary-text-secondary text-sm mb-1">Total Trainees</div>
            <div className="text-3xl font-bold text-primary-text">{stats.totalTrainees}</div>
          </div>
          <div className="bg-primary-secondary rounded-lg p-6 border border-primary-border hover-lift transition-all-smooth">
            <div className="text-primary-text-secondary text-sm mb-1">Total Sessions</div>
            <div className="text-3xl font-bold text-primary-text">{stats.totalSessions}</div>
          </div>
        </div>

        {/* Recent Intakes */}
        <div className="bg-primary-secondary rounded-lg border border-primary-border">
          <div className="p-6 border-b border-primary-border">
            <h2 className="text-xl font-semibold text-primary-text">Intakes</h2>
          </div>
          <div className="p-6">
            {intakes.length === 0 ? (
              <div className="text-center py-8 text-primary-text-secondary">
                No intakes found
              </div>
            ) : (
              <div className="space-y-4 animate-stagger">
                {intakes.map((intake) => (
                  <div
                    key={intake.id}
                    className="block bg-primary-tertiary rounded-lg border border-primary-border hover:border-accent-primary transition-all-smooth hover-lift overflow-hidden"
                  >
                    <Link to={`/intakes/${intake.id}`} className="block p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-primary-text mb-1">
                            {intake.name}
                          </h3>
                          {intake.description && (
                            <p className="text-primary-text-secondary text-sm mb-2">
                              {intake.description}
                            </p>
                          )}
                          <div className="flex space-x-4 text-sm text-primary-text-muted">
                            <span>{intake._count.members} trainees</span>
                            <span>{intake._count.skillGroups} skill groups</span>
                            <span>{intake._count.trainingSessions} sessions</span>
                          </div>
                        </div>
                        <div className="text-primary-text-secondary text-sm ml-4">
                          {formatDate(intake.createdAt)}
                        </div>
                      </div>
                    </Link>
                    {/* Trainees with Progress */}
                    {intake.members && intake.members.length > 0 && (
                      <div className="px-4 pb-4 border-t border-primary-border pt-3">
                        <div className="text-xs font-medium text-primary-text-secondary mb-2">
                          Trainees:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {intake.members.map((member) => {
                            const progress = member.progress;
                            const progressColors: { [key: string]: string } = {
                              green: 'bg-green-500/20 border-green-500/50 text-green-400',
                              blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
                              yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
                              red: 'bg-red-500/20 border-red-500/50 text-red-400',
                              gray: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
                            };
                            const colorClass = progress
                              ? progressColors[progress.color] || progressColors.gray
                              : progressColors.gray;

                            return (
                              <Link
                                key={member.id}
                                to={`/trainees/${member.user.id}`}
                                className="flex items-center justify-between p-2 rounded border hover:bg-primary-secondary transition-colors animate-fade-in"
                              >
                                <span className="text-sm text-primary-text truncate flex-1">
                                  {formatUserName(member.user.username)}
                                </span>
                                {progress ? (
                                  <div
                                    className={`ml-2 w-2 h-2 rounded-full ${colorClass}`}
                                    title={`Average Score: ${progress.averageScore.toFixed(1)}/10`}
                                  ></div>
                                ) : (
                                  <div
                                    className={`ml-2 w-2 h-2 rounded-full border ${colorClass}`}
                                    title="No data"
                                  ></div>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

