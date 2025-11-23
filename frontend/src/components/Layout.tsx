import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { formatUserName } from '../utils/nameFormatter';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, changePassword } = useAuth();
  const location = useLocation();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully');
    } catch (error: any) {
      setPasswordError(error.message);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-primary-bg animate-fade-in">
      <nav className="sticky top-0 z-50 bg-primary-secondary border-b border-primary-border animate-fade-in-down" style={{ width: '100vw', marginLeft: '50%', transform: 'translateX(-50%)' }}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold bg-accent-gradient bg-clip-text text-transparent">
                  Trainee Tool
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200 ${
                    isActive('/')
                      ? 'border-accent-primary text-primary-text'
                      : 'border-transparent text-primary-text-secondary hover:border-primary-border hover:text-primary-text'
                  }`}
                >
                  Dashboard
                </Link>
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'TRAINER') && (
                  <Link
                    to="/intakes"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/intakes') || location.pathname.startsWith('/intakes/')
                        ? 'border-accent-primary text-primary-text'
                        : 'border-transparent text-primary-text-secondary hover:border-primary-border hover:text-primary-text'
                    }`}
                  >
                    Intakes
                  </Link>
                )}
                {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'TRAINER') && (
                  <Link
                    to="/sessions/create"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname.startsWith('/sessions/')
                        ? 'border-accent-primary text-primary-text'
                        : 'border-transparent text-primary-text-secondary hover:border-primary-border hover:text-primary-text'
                    }`}
                  >
                    Create Session
                  </Link>
                )}
                {user?.role === 'ADMIN' && (
                  <>
                    <Link
                      to="/users"
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive('/users')
                          ? 'border-accent-primary text-primary-text'
                          : 'border-transparent text-primary-text-secondary hover:border-primary-border hover:text-primary-text'
                      }`}
                    >
                      Users
                    </Link>
                    <Link
                      to="/audit"
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive('/audit')
                          ? 'border-accent-primary text-primary-text'
                          : 'border-transparent text-primary-text-secondary hover:border-primary-border hover:text-primary-text'
                      }`}
                    >
                      Audit Logs
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-primary-text-secondary text-sm">
                {formatUserName(user?.username || '')} ({user?.role})
              </span>
              <button
                onClick={() => setShowChangePassword(true)}
                className="text-primary-text-secondary hover:text-primary-text text-sm"
              >
                Change Password
              </button>
              <button
                onClick={() => {
                  logout();
                  setTimeout(() => {
                    window.location.href = '/login';
                  }, 100);
                }}
                className="bg-danger-gradient text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto pb-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-primary-secondary rounded-lg p-6 max-w-md w-full mx-4 border border-primary-border animate-scale-in">
            <h2 className="text-xl font-bold mb-4 text-primary-text">Change Password</h2>
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-primary-text-secondary mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text"
                  required
                />
              </div>
              {passwordError && (
                <div className="mb-4 text-red-400 text-sm">{passwordError}</div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  className="px-4 py-2 border border-primary-border rounded-md text-primary-text hover:bg-primary-tertiary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent-primary rounded-md text-white hover:opacity-90"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

