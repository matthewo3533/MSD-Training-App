import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      // Small delay to ensure state is updated
      setTimeout(() => {
        navigate('/');
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-bg px-4 animate-fade-in">
      <div className="max-w-md w-full bg-primary-secondary rounded-lg shadow-lg p-8 border border-primary-border animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-accent-gradient bg-clip-text text-transparent mb-2">
            Trainee Tool
          </h1>
          <p className="text-primary-text-secondary">Employee Training Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-primary-text-secondary mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary-text-secondary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-primary-tertiary border border-primary-border rounded-md text-primary-text focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-gradient text-white py-2 px-4 rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-primary-text-muted">
          <p>Demo credentials:</p>
          <p className="mt-2">Admin: admin / admin123</p>
          <p>Manager: manager / manager123</p>
          <p>Trainer: trainer / trainer123</p>
          <p>Trainee: trainee1 / trainee123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

