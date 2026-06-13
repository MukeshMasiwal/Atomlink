import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, 
  Video, 
  Plus, 
  History, 
  Copy, 
  FileText, 
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import './Dashboard.css';

import { useAuthStore } from '../store/useAuthStore';

type DashboardProps = {
  role: 'Client' | 'Admin';
};

export default function Dashboard({ role }: DashboardProps) {
  const { userId, name, isAuthenticated, logout } = useAuthStore();
  const [cases, setCases] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: '', description: '' });
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      navigate('/login');
    }
  }, [isAuthenticated, userId, navigate]);

  const userName = name || 'User';

  useEffect(() => {
    fetchCases();
    fetchSessions();
  }, [role]);

  const fetchCases = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cases?role=${role}&clientId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (error) {
      console.error('Error fetching cases', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/sessions/history?role=${role}&userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      clientId: userId,
      title: newRequest.title,
      description: newRequest.description
    };
    console.log("Submitting request", payload);

    if (!payload.clientId || !payload.title || !payload.description) {
      console.error("Missing required fields in form:", payload);
      alert("Missing required fields.");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log("API response status:", res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log("API response data:", data);
        setShowCreateModal(false);
        setNewRequest({ title: '', description: '' });
        alert('Request created successfully!');
        fetchCases();
      } else {
        const errorData = await res.json();
        console.error("API error response:", errorData);
        alert(`Failed to create request: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating request', error);
      alert('Network or server error when creating request.');
    }
  };

  const handleApproveCase = async (caseId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cases/${caseId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: userId })
      });
      if (res.ok) {
        fetchCases();
        fetchSessions();
      }
    } catch (error) {
      console.error('Error approving case', error);
    }
  };

  const handleRejectCase = async (caseId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cases/${caseId}/reject`, { method: 'PUT' });
      if (res.ok) {
        fetchCases();
      }
    } catch (error) {
      console.error('Error rejecting case', error);
    }
  };

  const getSessionForCase = (caseId: string) => {
    return sessions.find(s => s.caseId === caseId || s.caseId?._id === caseId);
  };

  const handleJoinCall = (roomToken: string) => {
    navigate(`/room/${roomToken}`);
  };

  return (
    <div className="dashboard-wrapper">
      <nav className="dash-navbar">
        <Link to="/" className="dash-logo">
          <div className="dash-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19 12c0-3.866-3.134-7-7-7s-7 3.134-7 7 3.134 7 7 7 7-3.134 7-7z" transform="rotate(60 12 12)"></path>
              <path d="M19 12c0-3.866-3.134-7-7-7s-7 3.134-7 7 3.134 7 7 7 7-3.134 7-7z" transform="rotate(120 12 12)"></path>
            </svg>
          </div>
          AtomLink
        </Link>
        <div className="dash-nav-right">
          <div className="dash-profile">
            <div className="dash-avatar">
              {userName.charAt(0)}
            </div>
            {userName} ({role})
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="dash-container">
        <section className="dash-welcome">
          <h1>Welcome back, {userName.split(' ')[0]} 👋</h1>
          <p>{role === 'Admin' ? 'Manage pending cases and active sessions.' : 'Manage your requests and join meetings.'}</p>
        </section>

        {/* Quick Actions for Client */}
        {role === 'Client' && (
          <section className="quick-actions-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="action-card" onClick={() => setShowCreateModal(true)}>
              <div className="action-icon">
                <Plus size={24} />
              </div>
              <h3>Create Request</h3>
              <p>Submit a new case for review</p>
            </div>
            <div className="action-card">
              <div className="action-icon">
                <History size={24} />
              </div>
              <h3>Session History</h3>
              <p>View past meeting records</p>
            </div>
          </section>
        )}

        {/* Cases Section */}
        <section className="content-section">
          <h2 className="section-heading"><FileText size={20} /> {role === 'Admin' ? 'All Cases' : 'My Cases'}</h2>
          
          {cases.length === 0 ? (
            <p style={{ color: '#6B7280' }}>No cases found.</p>
          ) : (
            <div className="file-list">
              {cases.map((c) => {
                const session = getSessionForCase(c._id);
                return (
                  <div className="file-item" key={c._id} style={{ alignItems: 'flex-start' }}>
                    <div className="file-info" style={{ alignItems: 'flex-start' }}>
                      <div className="file-icon" style={{ marginTop: '4px' }}>
                        {c.status === 'approved' ? <CheckCircle2 color="#22C55E" size={24}/> : 
                         c.status === 'rejected' ? <XCircle color="#E53935" size={24}/> : 
                         <Clock color="#F59E0B" size={24}/>}
                      </div>
                      <div className="file-details">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {c.title} 
                          {c.caseNumber && <span style={{ fontSize: '12px', background: '#E5E7EB', padding: '2px 6px', borderRadius: '4px' }}>{c.caseNumber}</span>}
                        </h4>
                        <p>{c.description}</p>
                        <p style={{ marginTop: '8px', fontSize: '11px' }}>Status: <strong>{c.status.toUpperCase()}</strong> | Created: {new Date(c.createdAt).toLocaleString()}</p>
                        
                        {session && (
                          <div style={{ marginTop: '12px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                            <p style={{ fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>Active Session Details</p>
                            <p style={{ fontSize: '12px', marginBottom: '12px' }}>Room Token: <code style={{ background: '#F3F4F6', padding: '2px 4px', borderRadius: '4px' }}>{session.roomToken}</code></p>
                            
                            {role === 'Client' && (
                              <button className="btn-primary" onClick={() => handleJoinCall(session.roomToken)}>
                                <Video size={16} /> Join Call
                              </button>
                            )}
                            
                            {role === 'Admin' && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-primary" onClick={() => handleJoinCall(session.roomToken)}>
                                  <Video size={16} /> Start Call
                                </button>
                                <button className="btn-secondary" onClick={() => {navigator.clipboard.writeText(session.roomToken)}}>
                                  <Copy size={16} /> Copy Token
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {role === 'Admin' && c.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-primary" style={{ background: '#22C55E' }} onClick={() => handleApproveCase(c._id)}>Approve</button>
                        <button className="btn-secondary" onClick={() => handleRejectCase(c._id)}>Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Create New Request</h2>
            <form onSubmit={handleCreateRequest}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Title</label>
                <input 
                  type="text" 
                  value={newRequest.title} 
                  onChange={e => setNewRequest({...newRequest, title: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }} 
                  required 
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Description</label>
                <textarea 
                  value={newRequest.description} 
                  onChange={e => setNewRequest({...newRequest, description: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', minHeight: '100px' }} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}