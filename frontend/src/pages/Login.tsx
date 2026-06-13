import { useState, useMemo, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Shield, User, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import './Login.css';

const demoCredentials = {
  client: { email: 'client@atomlink.com', password: 'Client123', role: 'Client' },
  admin: { email: 'admin@atomlink.com', password: 'Admin123', role: 'Admin' },
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [role, setRole] = useState<'client' | 'admin'>('client');
  const [email, setEmail] = useState(demoCredentials.client.email);
  const [password, setPassword] = useState(demoCredentials.client.password);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'AtomLink Login';
    return () => {
      document.title = 'AtomLink';
    };
  }, []);

  const selectedRoute = useMemo(
    () => (role === 'admin' ? '/admin-dashboard' : '/client-dashboard'),
    [role],
  );

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRole = e.target.value as 'client' | 'admin';
    setRole(selectedRole);
    setEmail(demoCredentials[selectedRole].email);
    setPassword(demoCredentials[selectedRole].password);
    setError('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please fill in both email and password.');
      return;
    }

    const expectedEmail = demoCredentials[role].email.toLowerCase();
    const expectedPassword = demoCredentials[role].password;

    if (trimmedEmail.toLowerCase() !== expectedEmail || trimmedPassword !== expectedPassword) {
      setError('Invalid email or password');
      return;
    }

    setError('');
    setIsLoading(true);
    
    // Simulate API delay and set global auth state
    window.setTimeout(() => {
      const authRole = role === 'admin' ? 'Admin' : 'Client';
      const authUserId = role === 'admin' ? 'admin_123' : 'client_123';
      const authName = role === 'admin' ? 'Admin User' : 'Alex Morgan';
      
      login(authUserId, authRole, authName);
      
      navigate(selectedRoute, { replace: true });
      setIsLoading(false);
    }, 900);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Left Side: Login Form */}
        <div className="login-form-side">
          <div className="login-header">
            <Link to="/" className="login-header-logo">
              <span className="icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19 12c0-3.866-3.134-7-7-7s-7 3.134-7 7 3.134 7 7 7 7-3.134 7-7z" transform="rotate(60 12 12)"></path>
                  <path d="M19 12c0-3.866-3.134-7-7-7s-7 3.134-7 7 3.134 7 7 7 7-3.134 7-7z" transform="rotate(120 12 12)"></path>
                </svg>
              </span>
              AtomLink
            </Link>
            <h1>Welcome back</h1>
            <p>Please enter your details to sign in.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Role</label>
              <div className="input-icon-wrapper">
                <Shield size={18} />
                <select className="form-select" value={role} onChange={handleRoleChange}>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Email address</label>
              <div className="input-icon-wrapper">
                <Mail size={18} />
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrapper">
                <Lock size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember for 30 days
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            <button type="submit" className="btn-login-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }}/>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Demo Credentials */}
        <div className="login-demo-side">
          <div className="demo-content">
            <h2>Demo Access</h2>
            <p>Use the credentials below to explore the different roles and features available in AtomLink.</p>
            
            <div className="demo-credentials">
              {/* Client Card */}
              <div className="demo-card">
                <h3><User size={18} /> Client Access</h3>
                <div className="demo-detail">
                  <span>Email:</span>
                  <span>{demoCredentials.client.email}</span>
                </div>
                <div className="demo-detail">
                  <span>Password:</span>
                  <span>{demoCredentials.client.password}</span>
                </div>
              </div>

              {/* Admin Card */}
              <div className="demo-card">
                <h3><Shield size={18} /> Admin Access</h3>
                <div className="demo-detail">
                  <span>Email:</span>
                  <span>{demoCredentials.admin.email}</span>
                </div>
                <div className="demo-detail">
                  <span>Password:</span>
                  <span>{demoCredentials.admin.password}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
