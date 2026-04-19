// src/App.js — Example showing how to integrate Edu-Smart backend
// Replace your existing App.js with this pattern, or adapt individual sections.

import { useState, useEffect, createContext, useContext } from 'react';
import { authService, studentService, attendanceService, aiService } from './services/api';

// ─── Auth Context (Global State) ──────────────────────────────────────────────
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user,    setUser]    = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      return { success: true, role: data.user.role };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Login Page Example ────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const { login, loading } = useAuth();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      onLogin(result.role);
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h2>Edu-Smart Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={{ display: 'block', width: '100%', marginBottom: 12, padding: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

// ─── Student Dashboard Example ─────────────────────────────────────────────────
function StudentDashboard() {
  const { user, logout } = useAuth();
  const [students,  setStudents]  = useState([]);
  const [aiReply,   setAiReply]   = useState('');
  const [aiPrompt,  setAiPrompt]  = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // Fetch student data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await studentService.getAll();
        setStudents(result.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Ask EduBot
  const handleAiChat = async () => {
    if (!aiPrompt.trim()) return;
    try {
      const result = await aiService.chat(aiPrompt);
      setAiReply(result.response);
    } catch (err) {
      setAiReply('Sorry, EduBot is unavailable right now.');
    }
  };

  if (loading) return <p>Loading your dashboard...</p>;
  if (error)   return <p style={{ color: 'red' }}>{error}</p>;

  const myProfile = students[0]; // Students only get their own profile

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Welcome, {user?.name} 👋</h2>
        <button onClick={logout}>Logout</button>
      </div>

      {myProfile && (
        <div>
          {/* Attendance Card */}
          <div style={{ background: '#f0f9ff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3>Attendance: {myProfile.attendancePercentage}%</h3>
            <p style={{ color: myProfile.attendancePercentage < 75 ? 'red' : 'green' }}>
              {myProfile.attendancePercentage < 75 ? '⚠️ Below 75% — risk of debarment' : '✅ Good standing'}
            </p>
          </div>

          {/* Marks Table */}
          <h3>Academic Marks</h3>
          <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Subject</th><th>CA1</th><th>CA2</th><th>Midterm</th><th>Endterm</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {myProfile.marks?.map((m, i) => (
                <tr key={i}>
                  <td>{m.subject}</td>
                  <td>{m.ca1}</td>
                  <td>{m.ca2}</td>
                  <td>{m.midterm}</td>
                  <td>{m.endterm}</td>
                  <td><strong>{m.ca1 + m.ca2 + m.midterm + m.endterm}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EduBot AI Chat */}
      <div style={{ marginTop: 24, background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
        <h3>🤖 Ask EduBot</h3>
        <input
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Ask about your performance, study tips..."
          style={{ width: '80%', padding: 8 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
        />
        <button onClick={handleAiChat} style={{ marginLeft: 8, padding: '8px 16px' }}>Ask</button>
        {aiReply && (
          <div style={{ marginTop: 12, background: 'white', padding: 12, borderRadius: 4 }}>
            <strong>EduBot:</strong> {aiReply}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Faculty Dashboard Example ─────────────────────────────────────────────────
function FacultyDashboard() {
  const { user, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [qrSession, setQrSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentService.getAll()
      .then((res) => setStudents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const generateQR = async () => {
    const subject = prompt('Enter subject name for QR attendance:');
    if (!subject) return;
    try {
      const result = await attendanceService.generateSession(subject, 15);
      setQrSession(result.data);
      // In your real app: pass result.data.qrData to a QR code library like 'qrcode.react'
      alert(`QR Session created! Session ID: ${result.data.sessionId}\nShow this QR to students.`);
    } catch (err) {
      alert('Failed to generate QR session');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>Faculty Dashboard — {user?.name}</h2>
        <button onClick={logout}>Logout</button>
      </div>

      <button onClick={generateQR} style={{ marginBottom: 16, padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6 }}>
        📱 Generate Attendance QR
      </button>

      {qrSession && (
        <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <p>✅ Active QR Session — Expires: {new Date(qrSession.expiresAt).toLocaleTimeString()}</p>
          {/* Install 'qrcode.react' and use: <QRCodeSVG value={qrSession.qrData} size={256} /> */}
          <code style={{ fontSize: 10, wordBreak: 'break-all' }}>{qrSession.qrData}</code>
        </div>
      )}

      <h3>All Students ({students.length})</h3>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr><th>Name</th><th>Student ID</th><th>Department</th><th>Attendance %</th></tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.studentId}</td>
              <td>{s.department}</td>
              <td style={{ color: s.attendancePercentage < 75 ? 'red' : 'green' }}>
                {s.attendancePercentage}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Root App Component ────────────────────────────────────────────────────────
function App() {
  const { user } = useAuth();
  const [page,  setPage]  = useState(user ? 'dashboard' : 'login');

  const handleLogin = (role) => setPage('dashboard');

  if (page === 'login' || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Route to the correct dashboard based on role
  if (user.role === 'Faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
}

// Wrap App with AuthProvider in your index.js like:
// <AuthProvider><App /></AuthProvider>
export default function AppWithProvider() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
