import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';
import Login from './pages/Login';
import TestCall from './pages/TestCall';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/test-call" element={<TestCall />} />
          <Route path="/dashboard" element={<Navigate to="/client-dashboard" replace />} />
          <Route path="/client-dashboard" element={<Dashboard role="Client" />} />
          <Route path="/admin-dashboard" element={<Dashboard role="Admin" />} />
          <Route path="/room/:roomId" element={<MeetingRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
