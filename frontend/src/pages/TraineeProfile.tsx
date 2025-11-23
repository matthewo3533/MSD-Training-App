import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import { formatDate } from '../utils/date';
import { formatUserName } from '../utils/nameFormatter';
import { downloadFile } from '../utils/download';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparklines, SparklinesLine, SparklinesSpots } from 'react-sparklines';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

interface Session {
  id: string;
  sessionDate: string;
  trainee?: { username: string; id: string; role: string };
  trainer: { username: string };
  intake: { name: string };
  skillRatings: Array<{
    id: string;
    score: number;
    skill: {
      id: string;
      name: string;
      skillGroup: { name: string };
    };
  }>;
  dailySummary?: { content: string };
}

interface SkillProgress {
  skillId: string;
  skillName: string;
  skillGroup: string;
  scores: Array<{ date: string; score: number; sessionDate?: string }>;
}

const TraineeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [skillProgress, setSkillProgress] = useState<SkillProgress[]>([]);
  const [traineeName, setTraineeName] = useState<string>('Trainee Profile');
  const [skillGroups, setSkillGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('');
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const navContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // Scroll detection for active section indicator
  useEffect(() => {
    const handleScroll = () => {
      const headerOffset = 130;
      const viewportTop = window.scrollY + headerOffset;

      // Check all skill group sections
      const sections: { id: string; element: HTMLElement | null }[] = [
        ...skillGroups.map(group => ({
          id: `skill-group-${group.replace(/\s+/g, '-').toLowerCase()}`,
          element: document.getElementById(`skill-group-${group.replace(/\s+/g, '-').toLowerCase()}`)
        })),
        { id: 'summaries', element: document.getElementById('summaries') }
      ].filter(s => s.element !== null);

      // Find the section that's currently at or just above the viewport top
      let currentSection = '';
      let closestDistance = Infinity;

      sections.forEach(section => {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const distance = Math.abs(elementTop - viewportTop);

          // If this section is at or above the viewport top and closer than previous
          if (elementTop <= viewportTop + 100 && distance < closestDistance) {
            closestDistance = distance;
            currentSection = section.id;
          }
        }
      });

      // If no section found and we're near the top, set the first section as active
      if (!currentSection && window.scrollY < 200 && sections.length > 0) {
        currentSection = sections[0].id;
      }

      // If still no section found, find the one closest to the top
      if (!currentSection && sections.length > 0) {
        sections.forEach(section => {
          if (section.element) {
            const rect = section.element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const distance = Math.abs(elementTop - viewportTop);
            if (distance < closestDistance) {
              closestDistance = distance;
              currentSection = section.id;
            }
          }
        });
      }

      if (currentSection && currentSection !== activeSection) {
        setActiveSection(currentSection);
      }
    };

    // Initial check
    handleScroll();

    // Add scroll listener with throttling for better performance
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [skillGroups, activeSection]);

  // Update indicator position when activeSection changes or window resizes
  useEffect(() => {
    const updateIndicator = () => {
      if (activeSection && navContainerRef.current) {
        const button = buttonRefs.current[activeSection];
        const container = navContainerRef.current;
        
        if (button && container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const left = buttonRect.left - containerRect.left;
          const width = buttonRect.width;
          
          setIndicatorStyle({ left, width });
        }
      }
    };

    updateIndicator();

    // Update on window resize
    window.addEventListener('resize', updateIndicator);
    
    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeSection]);

  const fetchData = async () => {
    try {
      const response = await api.get(`/sessions?traineeId=${id}`);
      const sessionsData = response.data;
      
      // Sort sessions by date ascending (oldest first) for proper chronological display
      const sortedSessions = [...sessionsData].sort((a, b) => {
        return new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
      });
      setSessions(sortedSessions);

      // Get trainee name - try from sessions first, then from logged-in user if viewing own profile
      if (sortedSessions.length > 0 && sortedSessions[0].trainee?.username) {
        setTraineeName(formatUserName(sortedSessions[0].trainee.username));
      } else if (user?.id === id && user?.username) {
        // If viewing own profile and no sessions, use logged-in user's name
        setTraineeName(formatUserName(user.username));
      }
      // Otherwise keep default "Trainee Profile"

      // Process skill progress - use sorted sessions for chronological order
      const progressMap = new Map<string, SkillProgress>();

      sortedSessions.forEach((session: Session) => {
        session.skillRatings.forEach((rating) => {
          const key = rating.skill.id;
          if (!progressMap.has(key)) {
            progressMap.set(key, {
              skillId: key,
              skillName: rating.skill.name,
              skillGroup: rating.skill.skillGroup.name,
              scores: [],
            });
          }
          const progress = progressMap.get(key)!;
          progress.scores.push({
            date: formatDate(session.sessionDate),
            score: rating.score,
            sessionDate: session.sessionDate, // Keep raw date for sorting
          });
        });
      });

      // Sort scores by date for each skill (ensure chronological order)
      const sortedProgress = Array.from(progressMap.values()).map((progress) => ({
        ...progress,
        scores: progress.scores.sort((a, b) => {
          const dateA = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
          const dateB = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
          return dateA - dateB;
        }),
      }));

      // Sort by skill group name, then by skill name
      sortedProgress.sort((a, b) => {
        if (a.skillGroup !== b.skillGroup) {
          return a.skillGroup.localeCompare(b.skillGroup);
        }
        return a.skillName.localeCompare(b.skillName);
      });

      // Extract unique skill groups
      const uniqueSkillGroups = Array.from(new Set(sortedProgress.map(p => p.skillGroup))).sort();
      setSkillGroups(uniqueSkillGroups);

      setSkillProgress(sortedProgress);
    } catch (error) {
      console.error('Error fetching trainee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    downloadFile(`/exports/trainee/${id}/excel`);
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

  const canView = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'TRAINER' || user?.id === id;

  if (!canView) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-red-400">Access Denied</div>
        </div>
      </Layout>
    );
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Account for sticky headers: main header (64px) + sticky nav (56px) = 120px, plus some padding
      const headerOffset = 130;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const canCreateSession = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'TRAINER';

  return (
    <Layout>
      {/* Sticky Navigation Bar - Full width breaking out of Layout's max-width container */}
      <div className="sticky top-16 z-40 bg-primary-secondary border-b border-primary-border" style={{ width: '100vw', marginLeft: '50%', transform: 'translateX(-50%)' }}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 overflow-x-auto">
            <div className="flex items-center gap-4 text-sm text-primary-text whitespace-nowrap">
              <span className="text-xl font-bold text-primary-text">{traineeName}</span>
              {skillGroups.length > 0 && (
                <>
                  <div className="h-6 w-px bg-primary-border"></div>
                  <div ref={navContainerRef} className="relative flex items-center gap-3">
                    {skillGroups.map((group) => {
                      const sectionId = `skill-group-${group.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <button
                          key={group}
                          ref={(el) => {
                            buttonRefs.current[sectionId] = el;
                          }}
                          onClick={() => scrollToSection(sectionId)}
                          className="hover:text-accent-primary transition-colors duration-200 px-2 py-1 rounded hover:bg-primary-tertiary"
                        >
                          {group}
                        </button>
                      );
                    })}
                    <button
                      ref={(el) => {
                        buttonRefs.current['summaries'] = el;
                      }}
                      onClick={() => scrollToSection('summaries')}
                      className="hover:text-accent-primary transition-colors duration-200 px-2 py-1 rounded hover:bg-primary-tertiary"
                    >
                      Summaries
                    </button>
                    {/* Animated indicator line */}
                    {activeSection && indicatorStyle.width > 0 && (
                      <span
                        className="absolute bottom-0 h-0.5 bg-green-500 transition-all duration-300 ease-in-out"
                        style={{
                          left: `${indicatorStyle.left}px`,
                          width: `${indicatorStyle.width}px`,
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {canCreateSession && (
                <Link
                  to={`/sessions/create?traineeId=${id}`}
                  className="inline-flex items-center gap-2 bg-accent-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Session
                </Link>
              )}
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 bg-primary-tertiary text-primary-text border border-primary-border px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-secondary transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-6">
        <div className="mb-8 flex justify-between items-center animate-fade-in">
          <h1 className="text-3xl font-bold text-primary-text">{traineeName}</h1>
        </div>

        {/* Recent Reports Section */}
        {(() => {
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          
          const recentSessions = sessions.filter(session => {
            const sessionDate = new Date(session.sessionDate);
            return sessionDate >= twoWeeksAgo;
          }).sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

          if (recentSessions.length === 0) {
            return null;
          }

          const scrollToAllReports = () => {
            const element = document.getElementById('summaries');
            if (element) {
              const headerOffset = 130;
              const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
              const offsetPosition = elementPosition - headerOffset;
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
            }
          };

          return (
            <div className="mb-8 bg-primary-secondary rounded-lg border border-primary-border p-6 animate-fade-in-up">
              <h2 className="text-xl font-semibold text-primary-text mb-4">Recent Reports</h2>
              <div className="relative">
                <Swiper
                  spaceBetween={16}
                  slidesPerView="auto"
                  className="!pb-12"
                >
                  {recentSessions.map((session) => {
                    const sessionDate = new Date(session.sessionDate);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = dayNames[sessionDate.getDay()];
                    const formattedDate = formatDate(session.sessionDate);
                    const dateString = `${dayName} ${formattedDate}`;
                    
                    // Calculate days ago
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const sessionDateNormalized = new Date(sessionDate);
                    sessionDateNormalized.setHours(0, 0, 0, 0);
                    const diffTime = today.getTime() - sessionDateNormalized.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const daysAgoText = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
                    
                    return (
                      <SwiperSlide key={session.id} className="!w-64">
                        <Link
                          to={`/sessions/${session.id}/report`}
                          className="block h-full bg-primary-tertiary rounded-lg p-4 border border-primary-border hover-lift transition-all-smooth cursor-pointer"
                        >
                          <div className="flex flex-col h-full">
                            <div className="text-primary-text font-medium mb-2">
                              {dateString}
                            </div>
                            <div className="text-primary-text-secondary text-sm mb-1">
                              {formatUserName(session.trainer.username)}
                            </div>
                            <div className="text-primary-text-secondary text-xs mb-4 flex-grow">
                              {daysAgoText}
                            </div>
                            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-all duration-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Report
                            </div>
                          </div>
                        </Link>
                      </SwiperSlide>
                    );
                  })}
                  {/* View All box */}
                  <SwiperSlide className="!w-64">
                    <div
                      onClick={scrollToAllReports}
                      className="block h-full bg-primary-tertiary rounded-lg p-4 border-2 border-green-500 hover-lift transition-all-smooth cursor-pointer"
                    >
                      <div className="flex flex-col h-full items-center justify-center">
                        <svg className="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <div className="text-primary-text font-medium text-lg">
                          View All
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                </Swiper>
              </div>
            </div>
          );
        })()}

        {/* Skill Progress Charts */}
        <div className="mb-8 bg-primary-secondary rounded-lg border border-primary-border p-6 animate-fade-in-up">
          <h2 className="text-xl font-semibold text-primary-text mb-6">Skill Progress</h2>
          
          {/* Group skills by skill group */}
          {(() => {
            const groupedBySkillGroup = new Map<string, SkillProgress[]>();
            skillProgress.forEach((progress) => {
              if (!groupedBySkillGroup.has(progress.skillGroup)) {
                groupedBySkillGroup.set(progress.skillGroup, []);
              }
              groupedBySkillGroup.get(progress.skillGroup)!.push(progress);
            });

            return Array.from(groupedBySkillGroup.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([skillGroupName, skills]) => (
                <div 
                  key={skillGroupName} 
                  id={`skill-group-${skillGroupName.replace(/\s+/g, '-').toLowerCase()}`}
                  className="mb-8 last:mb-0 animate-fade-in scroll-mt-[130px]"
                >
                  <h3 className="text-lg font-semibold text-primary-text mb-4 pb-2 border-b border-primary-border">
                    {skillGroupName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-stagger">
                    {skills.map((progress) => (
                      <div key={progress.skillId} className="bg-primary-tertiary rounded-lg p-4 border border-primary-border hover-lift transition-all-smooth">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-primary-text font-medium">{progress.skillName}</div>
                          <div className="w-24 h-12">
                            <Sparklines data={progress.scores.map((s) => s.score)}>
                              <SparklinesLine color="#10b981" />
                              <SparklinesSpots />
                            </Sparklines>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={progress.scores}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis domain={[0, 10]} stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ))}
                  </div>
                </div>
              ));
          })()}
          
          {skillProgress.length === 0 && (
            <div className="text-center py-8 text-primary-text-secondary">
              No skill progress data available
            </div>
          )}
        </div>

        {/* Sessions */}
        <div id="summaries" className="bg-primary-secondary rounded-lg border border-primary-border scroll-mt-[130px]">
          <div className="p-6 border-b border-primary-border">
            <h2 className="text-xl font-semibold text-primary-text">Training Sessions</h2>
          </div>
          <div className="p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-primary-text-secondary">
                No sessions found
              </div>
            ) : (
              <div className="relative">
                <Swiper
                  spaceBetween={16}
                  slidesPerView="auto"
                  className="!pb-12"
                >
                  {sessions.map((session) => {
                    const sessionDate = new Date(session.sessionDate);
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = dayNames[sessionDate.getDay()];
                    const formattedDate = formatDate(session.sessionDate);
                    const dateString = `${dayName} ${formattedDate}`;
                    
                    // Calculate days ago
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const sessionDateNormalized = new Date(sessionDate);
                    sessionDateNormalized.setHours(0, 0, 0, 0);
                    const diffTime = today.getTime() - sessionDateNormalized.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const daysAgoText = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
                    
                    return (
                      <SwiperSlide key={session.id} className="!w-64">
                        <Link
                          to={`/sessions/${session.id}/report`}
                          className="block h-full bg-primary-tertiary rounded-lg p-4 border border-primary-border hover-lift transition-all-smooth cursor-pointer"
                        >
                          <div className="flex flex-col h-full">
                            <div className="text-primary-text font-medium mb-2">
                              {dateString}
                            </div>
                            <div className="text-primary-text-secondary text-sm mb-1">
                              {formatUserName(session.trainer.username)}
                            </div>
                            <div className="text-primary-text-secondary text-xs mb-4 flex-grow">
                              {daysAgoText}
                            </div>
                            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-all duration-200">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Report
                            </div>
                          </div>
                        </Link>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TraineeProfile;

