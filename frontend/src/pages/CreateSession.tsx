import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import RatingSelector from '../components/RatingSelector';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatDate } from '../utils/date';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Intake {
  id: string;
  name: string;
}

interface Skill {
  id: string;
  name: string;
  skillGroup: {
    id: string;
    name: string;
  };
}

interface SkillGroup {
  id: string;
  name: string;
  skills: Skill[];
}

interface SkillProgress {
  skillId: string;
  skillName: string;
  scores: Array<{ date: string; score: number; sessionDate: string }>;
}

const CreateSession = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [skillProgress, setSkillProgress] = useState<Map<string, SkillProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    intakeId: '',
    traineeId: searchParams.get('traineeId') || '',
    sessionDate: new Date(),
    comments: '',
    skillRatings: [] as Array<{ skillId: string; score: number; comments: string }>,
  });

  useEffect(() => {
    fetchData();
    if (id) {
      fetchSession();
    }
  }, [id]);

  // Handle traineeId from query params
  useEffect(() => {
    const traineeIdFromQuery = searchParams.get('traineeId');
    if (traineeIdFromQuery && !id) {
      setFormData(prev => ({ ...prev, traineeId: traineeIdFromQuery }));
    }
  }, [searchParams, id]);

  const fetchData = async () => {
    try {
      const [intakesRes, usersRes] = await Promise.all([
        api.get('/intakes'),
        user?.role === 'ADMIN' ? api.get('/users') : Promise.resolve({ data: [] }),
      ]);

      setIntakes(intakesRes.data);
      if (usersRes.data) {
        setTrainees(usersRes.data.filter((u: any) => u.role === 'TRAINEE'));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const response = await api.get(`/sessions/${id}`);
      const session = response.data;
      setFormData({
        intakeId: session.intakeId,
        traineeId: session.traineeId,
        sessionDate: new Date(session.sessionDate),
        comments: session.comments || '',
        skillRatings: session.skillRatings.map((r: any) => ({
          skillId: r.skill.id,
          score: r.score,
          comments: r.comments || '',
        })),
      });
      fetchSkillGroups(session.intakeId);
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  const fetchSkillGroups = async (intakeId: string) => {
    if (!intakeId) return;
    try {
      const response = await api.get(`/skills/groups/intake/${intakeId}`);
      setSkillGroups(response.data);

      // Initialize skill ratings if not editing
      if (!id) {
        const ratings: Array<{ skillId: string; score: number; comments: string }> = [];
        response.data.forEach((group: SkillGroup) => {
          group.skills.forEach((skill) => {
            ratings.push({ skillId: skill.id, score: 0, comments: '' });
          });
        });
        setFormData((prev) => ({ ...prev, skillRatings: ratings }));
      }

      // Note: Previous sessions will be fetched when trainee is selected
    } catch (error) {
      console.error('Error fetching skill groups:', error);
    }
  };

  const handleIntakeChange = (intakeId: string) => {
    setFormData((prev) => ({ ...prev, intakeId, traineeId: '' }));
    fetchSkillGroups(intakeId);
    // Fetch trainees for this intake
    fetchTraineesForIntake(intakeId);
    // Clear skill progress when intake changes
    setSkillProgress(new Map());
  };

  const fetchTraineesForIntake = async (intakeId: string) => {
    try {
      const response = await api.get(`/intakes/${intakeId}`);
      const members = response.data.members || [];
      setTrainees(members.map((m: any) => m.user));
    } catch (error) {
      console.error('Error fetching trainees:', error);
    }
  };

  const fetchPreviousSessions = async (traineeId: string, intakeId: string) => {
    if (!traineeId || !intakeId) {
      setSkillProgress(new Map());
      return;
    }

    try {
      // Fetch previous sessions for this trainee in this intake
      const response = await api.get(`/sessions?traineeId=${traineeId}&intakeId=${intakeId}`);
      let sessions = response.data || [];

      // If editing, exclude the current session from history
      if (id) {
        sessions = sessions.filter((s: any) => s.id !== id);
      }

      // Sort sessions by date ascending (oldest first) for chronological display
      const sortedSessions = [...sessions].sort((a: any, b: any) => {
        return new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
      });

      // Process skill progress
      const progressMap = new Map<string, SkillProgress>();

      sortedSessions.forEach((session: any) => {
        session.skillRatings.forEach((rating: any) => {
          const skillId = rating.skill.id;
          if (!progressMap.has(skillId)) {
            progressMap.set(skillId, {
              skillId,
              skillName: rating.skill.name,
              scores: [],
            });
          }
          const progress = progressMap.get(skillId)!;
          progress.scores.push({
            date: formatDate(session.sessionDate),
            score: rating.score,
            sessionDate: session.sessionDate,
          });
        });
      });

      // Sort scores by date for each skill (ensure chronological order)
      progressMap.forEach((progress) => {
        progress.scores.sort((a, b) => {
          return new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
        });
      });

      setSkillProgress(progressMap);
    } catch (error) {
      console.error('Error fetching previous sessions:', error);
      setSkillProgress(new Map());
    }
  };

  const handleScoreChange = (skillId: string, score: number) => {
    setFormData((prev) => ({
      ...prev,
      skillRatings: prev.skillRatings.map((r) =>
        r.skillId === skillId ? { ...r, score } : r
      ),
    }));
  };

  const handleCommentsChange = (skillId: string, comments: string) => {
    setFormData((prev) => ({
      ...prev,
      skillRatings: prev.skillRatings.map((r) =>
        r.skillId === skillId ? { ...r, comments } : r
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out ratings with score 0 (not rated)
    const ratings = formData.skillRatings.filter((r) => r.score > 0);

    try {
      const payload = {
        intakeId: formData.intakeId,
        traineeId: formData.traineeId,
        sessionDate: formData.sessionDate.toISOString(),
        comments: formData.comments,
        skillRatings: ratings.map((r) => ({
          skillId: r.skillId,
          score: r.score,
          comments: r.comments || undefined,
        })),
      };

      if (id) {
        await api.patch(`/sessions/${id}`, payload);
      } else {
        await api.post('/sessions', payload);
      }

      navigate(`/trainees/${formData.traineeId}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save session');
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
      <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-accent-primary hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-primary-text">
            {id ? 'Edit Session' : 'Create Training Session'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-primary-secondary rounded-lg border border-primary-border p-6 space-y-6 animate-fade-in-up">
          <div>
            <label className="block text-sm font-medium text-primary-text-secondary mb-2">
              Intake *
            </label>
            <select
              value={formData.intakeId}
              onChange={(e) => handleIntakeChange(e.target.value)}
              className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
              required
            >
              <option value="">Select an intake...</option>
              {intakes.map((intake) => (
                <option key={intake.id} value={intake.id}>
                  {intake.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text-secondary mb-2">
              Trainee *
            </label>
            <select
              value={formData.traineeId}
              onChange={(e) => {
                const traineeId = e.target.value;
                setFormData({ ...formData, traineeId });
                // Fetch previous sessions when trainee is selected
                if (traineeId && formData.intakeId) {
                  fetchPreviousSessions(traineeId, formData.intakeId);
                } else {
                  setSkillProgress(new Map());
                }
              }}
              className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
              required
            >
              <option value="">Select a trainee...</option>
              {trainees.map((trainee) => (
                <option key={trainee.id} value={trainee.id}>
                  {trainee.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text-secondary mb-2">
              Session Date *
            </label>
            <DatePicker
              selected={formData.sessionDate}
              onChange={(date: Date) => setFormData({ ...formData, sessionDate: date })}
              className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
              dateFormat="dd/MM/yyyy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text-secondary mb-2">
              Comments
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
              rows={3}
            />
          </div>

          {/* Skill Ratings */}
          {skillGroups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-primary-text-secondary mb-4">
                Skill Ratings (0-10) *
              </label>
              <div className="space-y-6">
                {skillGroups.map((group) => (
                  <div key={group.id} className="border border-primary-border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary-text mb-3">{group.name}</h3>
                    <div className="space-y-3">
                      {group.skills.map((skill) => {
                        const rating = formData.skillRatings.find((r) => r.skillId === skill.id);
                        const progress = skillProgress.get(skill.id);
                        const hasHistory = progress && progress.scores.length > 0;

                        return (
                          <div key={skill.id} className="bg-primary-tertiary rounded-lg p-4 border border-primary-border">
                            <div className="mb-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <label className="block text-primary-text font-semibold mb-1">
                                    {skill.name}
                                  </label>
                                </div>
                                {hasHistory && (
                                  <div className="ml-4 w-24 h-12 flex-shrink-0">
                                    <Sparklines data={progress!.scores.map((s) => s.score)}>
                                      <SparklinesLine color="#10b981" />
                                      <SparklinesSpots />
                                    </Sparklines>
                                  </div>
                                )}
                              </div>

                              {/* Historical Progress Chart */}
                              {hasHistory && (
                                <div className="mb-4 p-3 bg-primary-secondary rounded-lg border border-primary-border animate-fade-in">
                                  <div className="text-xs text-primary-text-secondary mb-2">
                                    Previous ratings for this skill:
                                  </div>
                                  <ResponsiveContainer width="100%" height={100}>
                                    <LineChart data={progress!.scores}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                      <XAxis 
                                        dataKey="date" 
                                        stroke="#94a3b8" 
                                        tick={{ fontSize: 10 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={50}
                                      />
                                      <YAxis 
                                        domain={[0, 10]} 
                                        stroke="#94a3b8" 
                                        tick={{ fontSize: 10 }}
                                        width={30}
                                      />
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: '#1e293b', 
                                          border: '1px solid #334155',
                                          fontSize: '12px'
                                        }} 
                                      />
                                      <Line 
                                        type="monotone" 
                                        dataKey="score" 
                                        stroke="#10b981" 
                                        strokeWidth={2}
                                        dot={{ fill: '#10b981', r: 3 }}
                                        activeDot={{ r: 5 }}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}

                              <RatingSelector
                                value={rating?.score || 0}
                                onChange={(score) => handleScoreChange(skill.id, score)}
                              />
                            </div>
                            <div className="mt-3">
                              <input
                                type="text"
                                value={rating?.comments || ''}
                                onChange={(e) => handleCommentsChange(skill.id, e.target.value)}
                                placeholder="Add comments (optional)"
                                className="w-full px-3 py-2 bg-primary-secondary border border-primary-border rounded-md text-primary-text text-sm placeholder-primary-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Link
              to="/"
              className="px-4 py-2 border border-primary-border rounded-md text-primary-text hover:bg-primary-tertiary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="px-4 py-2 bg-accent-primary rounded-md text-white hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              {id ? 'Update' : 'Create'} Session
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateSession;

