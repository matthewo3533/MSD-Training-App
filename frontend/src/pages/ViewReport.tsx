import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Editor } from '@hugerte/hugerte-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import { formatDate } from '../utils/date';
import { formatUserName } from '../utils/nameFormatter';
import { downloadFile } from '../utils/download';

const ViewReport = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const response = await api.get(`/sessions/${id}`);
      const sessionData = response.data;
      setSession(sessionData);

      if (sessionData.dailySummary) {
        setSummary(sessionData.dailySummary);
        setContent(sessionData.dailySummary.content || '');
      } else {
        setContent('');
        setSummary(null);
      }

      // Fetch previous sessions for progress calculation
      if (sessionData.traineeId) {
        const prevSessionsRes = await api.get(`/sessions?traineeId=${sessionData.traineeId}&intakeId=${sessionData.intakeId}`);
        const allSessions = prevSessionsRes.data;
        
        // Sort by date descending and get sessions before current session date
        const sessionDate = new Date(sessionData.sessionDate);
        const prevSessions = allSessions
          .filter((s: any) => new Date(s.sessionDate) < sessionDate)
          .sort((a: any, b: any) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
        
        setPreviousSessions(prevSessions);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }

    setSaving(true);
    try {
      await api.post(`/sessions/${id}/summary`, { content });
      // Refetch session data to get the updated summary
      const response = await api.get(`/sessions/${id}`);
      const sessionData = response.data;
      
      if (sessionData.dailySummary) {
        setSummary(sessionData.dailySummary);
        setContent(sessionData.dailySummary.content || '');
      }
      setIsEditing(false);
      // Smoothly update without navigation or alert - the UI will automatically switch to view mode
    } catch (error: any) {
      console.error('Failed to save summary:', error);
      // Could show a subtle error message here if needed
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset content to original summary content
    if (summary) {
      setContent(summary.content || '');
    }
  };

  const handleExport = () => {
    downloadFile(`/exports/summary/${id}/pdf`);
  };

  // Check if user can edit (trainees cannot edit)
  const canEdit =
    user?.role === 'TRAINER' ||
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER';

  // If no summary exists and user can edit, start in editing mode
  useEffect(() => {
    if (!loading && !summary && canEdit) {
      setIsEditing(true);
    }
  }, [loading, summary, canEdit]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-primary-text">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-primary-text">Session not found</div>
        </div>
      </Layout>
    );
  }

  const hasSummary = summary && summary.content && summary.content.trim() !== '';
  
  // Group skill ratings by skill group
  const skillRatingsByGroup = new Map<string, any[]>();
  if (session.skillRatings && session.skillRatings.length > 0) {
    session.skillRatings.forEach((rating: any) => {
      const groupName = rating.skill.skillGroup.name;
      if (!skillRatingsByGroup.has(groupName)) {
        skillRatingsByGroup.set(groupName, []);
      }
      skillRatingsByGroup.get(groupName)!.push(rating);
    });
  }

  // Calculate average score (not currently used)
  // const calculateAverageScore = () => {
  //   if (!session.skillRatings || session.skillRatings.length === 0) {
  //     return 'N/A';
  //   }
  //   const total = session.skillRatings.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
  //   const avg = total / session.skillRatings.length;
  //   return avg.toFixed(1);
  // };

  const getScoreColor = (score: number | string) => {
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore)) return 'text-primary-text-secondary';
    if (numScore >= 8) return 'text-green-400';
    if (numScore >= 6) return 'text-yellow-400';
    if (numScore >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBadgeColor = (score: number | string) => {
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore)) return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    if (numScore >= 8) return 'bg-green-500/20 border-green-500/50 text-green-400';
    if (numScore >= 6) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
    if (numScore >= 4) return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
    return 'bg-red-500/20 border-red-500/50 text-red-400';
  };

  const getScoreLabel = (score: number | string) => {
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore)) return 'N/A';
    if (numScore >= 8) return 'Excellent';
    if (numScore >= 6) return 'Good';
    if (numScore >= 4) return 'Average';
    return 'Needs Improvement';
  };

  // Calculate progress percentage since last session
  const getProgressPercentage = (skillId: string, currentScore: number): number | null => {
    if (!previousSessions || previousSessions.length === 0) return null;
    
    // Find the most recent session with this skill
    for (const prevSession of previousSessions) {
      const prevRating = prevSession.skillRatings?.find((r: any) => r.skill.id === skillId);
      if (prevRating) {
        const prevScore = prevRating.score;
        if (prevScore === 0) {
          // Can't calculate percentage change from 0
          return currentScore > 0 ? 100 : null;
        }
        const change = ((currentScore - prevScore) / prevScore) * 100;
        return Math.round(change * 10) / 10; // Round to 1 decimal place
      }
    }
    return null;
  };

  // Calculate average score for same skill on same date and intake (not currently used)
  // const getAverageScore = (skillId: string): number | null => {
  //   if (!sameDateSessions || sameDateSessions.length === 0) return null;
  //   
  //   const scores: number[] = [];
  //   sameDateSessions.forEach((s: any) => {
  //     const rating = s.skillRatings?.find((r: any) => r.skill.id === skillId);
  //     if (rating) {
  //       scores.push(rating.score);
  //     }
  //   });
  //   
  //   if (scores.length === 0) return null;
  //   
  //   const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  //   return Math.round(avg * 10) / 10; // Round to 1 decimal place
  // };

  // Calculate percentage above/below average (not currently used)
  // const getAverageComparison = (skillId: string, currentScore: number): number | null => {
  //   const avgScore = getAverageScore(skillId);
  //   if (avgScore === null) return null;
  //   
  //   if (avgScore === 0) {
  //     return currentScore > 0 ? 100 : null;
  //   }
  //   
  //   const difference = ((currentScore - avgScore) / avgScore) * 100;
  //   return Math.round(difference * 10) / 10; // Round to 1 decimal place
  // };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to={`/trainees/${session.traineeId}`}
            className="text-accent-primary hover:underline mb-4 inline-block transition-colors duration-200"
          >
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-primary-text">
            {session.trainee ? `${formatUserName(session.trainee.username)} - Session Report` : 'Session Report'}
          </h1>
          <div className="mt-2 text-primary-text-secondary">
            Session Date: {formatDate(session.sessionDate)} | Trainer:{' '}
            {formatUserName(session.trainer.username)} | Intake: {session.intake.name}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Session Stats */}
          <div className="space-y-6">
            <div className="bg-primary-secondary rounded-lg border border-primary-border p-6">
              {/* Skill Ratings by Group */}
              {Array.from(skillRatingsByGroup.entries()).map(([groupName, ratings]) => (
                <div key={groupName} className="mb-6">
                  <h3 className="text-lg font-semibold text-primary-text mb-3 pb-2 border-b border-primary-border">
                    {groupName}
                  </h3>
                  <div className="space-y-2">
                    {ratings.map((rating) => {
                      const progressPercent = getProgressPercentage(rating.skill.id, rating.score);
                      
                      return (
                        <div
                          key={rating.id}
                          className="p-3 bg-primary-tertiary rounded-lg border border-primary-border hover:bg-primary-secondary transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-primary-text text-sm flex-1">{rating.skill.name}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-medium ${getScoreColor(rating.score)}`}>
                                {rating.score}/10
                              </span>
                              <div className={`px-2 py-1 rounded text-xs font-medium border ${getScoreBadgeColor(rating.score)}`}>
                                {getScoreLabel(rating.score)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-primary-text-secondary mt-1">
                            {progressPercent !== null && (
                              <span className={progressPercent > 0 ? 'text-green-400' : progressPercent < 0 ? 'text-red-400' : ''}>
                                {progressPercent > 0 ? '+' : ''}{progressPercent}% since last session
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {session.skillRatings?.length === 0 && (
                <div className="text-center py-8 text-primary-text-secondary">
                  No skill ratings for this session
                </div>
              )}
            </div>

            {/* Session Details */}
            <div className="bg-primary-secondary rounded-lg border border-primary-border p-6">
              <h2 className="text-xl font-semibold text-primary-text mb-4">Session Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-primary-border">
                  <span className="text-primary-text-secondary text-sm">Date</span>
                  <span className="text-primary-text font-medium">{formatDate(session.sessionDate)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary-border">
                  <span className="text-primary-text-secondary text-sm">Trainer</span>
                  <span className="text-primary-text font-medium">{formatUserName(session.trainer.username)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary-border">
                  <span className="text-primary-text-secondary text-sm">Intake</span>
                  <span className="text-primary-text font-medium">{session.intake.name}</span>
                </div>
                {session.trainee && (
                  <div className="flex justify-between items-center py-2 border-b border-primary-border">
                    <span className="text-primary-text-secondary text-sm">Trainee</span>
                    <span className="text-primary-text font-medium">{formatUserName(session.trainee.username)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Summary */}
          <div className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-96px)]">
            <div className="bg-primary-secondary rounded-lg border border-primary-border p-6 lg:overflow-y-auto lg:max-h-full" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-primary-text">Daily Summary</h2>
                {hasSummary && summary.updatedAt && (
                  <span className="text-xs text-primary-text-secondary">
                    Updated: {formatDate(summary.updatedAt)}
                  </span>
                )}
              </div>

              {(hasSummary && !isEditing) ? (
                <>
                  {summary.user && (
                    <p className="text-sm text-primary-text-secondary mb-4">
                      Written by: {formatUserName(summary.user.username)}
                    </p>
                  )}
                  <div
                    dangerouslySetInnerHTML={{ __html: summary.content }}
                    className="summary-content text-primary-text animate-fade-in"
                    style={{
                      lineHeight: '1.75',
                    }}
                  />
                  <div className="mt-6 pt-6 border-t border-primary-border flex gap-3">
                    {canEdit && (
                      <button
                        onClick={handleEdit}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-md text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Summary
                      </button>
                    )}
                    <button
                      onClick={handleExport}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-tertiary text-primary-text border border-primary-border rounded-md text-sm font-medium hover:bg-primary-secondary transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export PDF
                    </button>
                  </div>
                </>
              ) : canEdit ? (
                <div className="animate-fade-in">
                  {!hasSummary && (
                    <div className="mb-4 p-4 bg-primary-tertiary rounded-lg border border-primary-border">
                      <p className="text-primary-text text-sm">
                        This session doesn't have a summary yet. Use the editor below to write the daily summary.
                      </p>
                    </div>
                  )}
                  <Editor
                    onInit={(_evt, editor) => {
                      editorRef.current = editor;
                    }}
                    value={content}
                    onEditorChange={(newContent) => {
                      setContent(newContent);
                    }}
                    init={{
                      height: 500,
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'link image | removeformat | code | fullscreen | help',
                      branding: false,
                      promotion: false,
                      placeholder: 'Write your daily summary here...',
                    }}
                  />
                  <div className="mt-6 flex gap-3">
                    {hasSummary && (
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2 border border-primary-border rounded-md text-primary-text hover:bg-primary-tertiary transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving || !content.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary rounded-md text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:scale-100 ml-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {saving ? 'Saving...' : 'Save Summary'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-primary-text-secondary animate-fade-in">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg mb-2">No summary available</p>
                  <p className="text-sm">
                    This session does not have a summary yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ViewReport;

