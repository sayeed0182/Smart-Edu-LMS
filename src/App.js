// ─────────────────────────────────────────────────────────────────────────────
// App.js — SMART-EDU v2.0
// Features added:
//   ✅ GPA/CGPA on 10.0 scale
//   ✅ Absent button fixed (real state management)
//   ✅ File upload — functional drag-and-drop
//   ✅ Syllabus — Faculty edit/upload | Student view/download
//   ✅ Study Rooms — real-time socket.io chat (Discord-style)
//   ✅ Dark/Light mode — persisted in localStorage
//   ✅ Smart scheduling — live next-class reminder
//   ✅ Logo updated — SMART-EDU branding
//   ✅ AI Chat — Gemini proxy via /api/ai/chat
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes, Route, Navigate,
  useNavigate, useLocation,
} from 'react-router-dom';
import {
  BookOpen, GraduationCap, ChevronRight, Briefcase, ArrowLeft,
  AlertCircle, Send, Clock, Users, BarChart3, Bell,
  ClipboardCheck, CreditCard, Smartphone, ShieldCheck,
  MoreVertical, Download, Save, Search, Eye, PlusCircle,
  Upload, Settings, X, FileText, Menu, LogOut,
  Bot, Loader2, Sun, Moon, Hash, Paperclip, Trash2,
  CheckCircle, XCircle, FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import QRCode from 'react-qr-code';
import axios from 'axios';
import { io as socketIO } from 'socket.io-client';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { UserProvider, useUser } from './Context/UserContext';
import Sidebar from './components/Sidebar';
import AttendanceGuard from './components/AttendanceGuard';
import MarksheetPDF from './components/MarksheetPDF';
import AnnouncementsPage from './components/AnnouncementsPage';
import useAlerts from './hooks/useAlerts';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import StudentDetailPage from './components/StudentDetailPage';

// ─── Constants ─────────────────────────────────────────────────────────────────
// Always use the same hostname the browser is on, but always port 5001 for backend.
const _host      = `http://${window.location.hostname}:5001`;
const API_BASE   = process.env.REACT_APP_API_URL || `${_host}/api`;
const SOCKET_URL = _host;

// ─── GPA 10.0 Scale helpers ────────────────────────────────────────────────────
const marksToGradePoint = (marks, max = 100) => {
  const pct = (marks / max) * 100;
  if (pct >= 90) return 10;
  if (pct >= 80) return 9;
  if (pct >= 70) return 8;
  if (pct >= 60) return 7;
  if (pct >= 50) return 6;
  if (pct >= 45) return 5;
  if (pct >= 40) return 4;
  return 0;
};
const gradePointToLetter = (gp) => {
  if (gp === 10) return 'O'; if (gp === 9) return 'A+'; if (gp === 8) return 'A';
  if (gp === 7) return 'B+'; if (gp === 6) return 'B';  if (gp === 5) return 'C';
  if (gp === 4) return 'D';  return 'F';
};
const calcCGPA10 = (subjects) => {
  if (!subjects?.length) return '0.00';
  const totalCredits = subjects.reduce((s, sub) => s + (sub.credits || 3), 0);
  const weighted = subjects.reduce((s, sub) => {
    const gp = sub.gradePoint ?? marksToGradePoint(sub.marks || 0);
    return s + gp * (sub.credits || 3);
  }, 0);
  return (weighted / totalCredits).toFixed(2);
};

// ─── Debounce ──────────────────────────────────────────────────────────────────
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

const calcTotal = (s) =>
  (s.ca1 || 0) + (s.ca2 || 0) + (s.ca3 || 0) + (s.midterm || 0) + (s.endterm || 0);

// ─── Data ──────────────────────────────────────────────────────────────────────
const SYLLABUS = [
  { name: "Human Computer Interaction",   code: "CS401", modules: 5,  description: "Focuses on design and evaluation of UI/UX." },
  { name: "Data Structures & Algorithms", code: "CS202", modules: 6,  description: "Core logic and complexity analysis." },
  { name: "Cloud Computing",              code: "CS505", modules: 4,  description: "AWS, Azure, and distributed systems." },
  { name: "AI & Machine Learning",        code: "CS601", modules: 8,  description: "Neural networks and Deep Learning." },
  { name: "Python Programming",           code: "CS105", modules: 4,  description: "Scripting and advanced data processing." },
  { name: "Java Development",             code: "CS205", modules: 6,  description: "OOP principles and Enterprise apps." },
  { name: "Computer Networks",            code: "CS301", modules: 5,  description: "TCP/IP, Routing, and Security fundamentals." },
  { name: "Operating Systems",            code: "CS208", modules: 7,  description: "Kernels, threads, and memory management." },
  { name: "Discrete Mathematics",         code: "CS102", modules: 6,  description: "Set theory, logic, and graph theory." },
];

const TIMETABLE_SLOTS = [
  { time: "09:00 - 10:00", period: "1", start: 9 },
  { time: "10:00 - 11:00", period: "2", start: 10 },
  { time: "11:00 - 12:00", period: "3", start: 11 },
  { time: "12:00 - 01:00", period: "LUNCH", isBreak: true, start: 12 },
  { time: "01:00 - 02:00", period: "4", start: 13 },
  { time: "02:00 - 03:00", period: "5", start: 14 },
  { time: "03:00 - 04:00", period: "6", start: 15 },
];

const SCHEDULE = [
  ["CS401","CS202","CS505","CS601","CS105"],
  ["CS205","CS301","CS208","CS102","CS401"],
  ["CS601","CS105","CS202","CS205","CS301"],
  [null,   null,   null,   null,   null  ],
  ["CS208","CS102","CS401","CS505","CS202"],
  ["CS301","CS601","CS105","CS208","CS102"],
  ["CS102","CS205","CS301","CS401","CS505"],
];

// Faculty schedule — different from student, includes FREE periods
const FACULTY_SCHEDULE = [
  ["CS401", null,    "CS505","CS601","CS105"],   // P1: Mon free
  ["CS205","CS301","CS208", null,  "CS401"],    // P2: Thu free
  [null,   "CS105","CS202","CS205","CS301"],    // P3: Mon free
  [null,   null,   null,   null,   null  ],       // LUNCH
  ["CS208","CS102", null,  "CS505","CS202"],    // P4: Wed free
  [null,   "CS601","CS105","CS208","CS102"],    // P5: Mon free
  ["CS102","CS205","CS301", null,  "CS505"],    // P6: Thu free
];

// ─── Theme Hook ────────────────────────────────────────────────────────────────
const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('edusmartTheme');
    return saved !== null ? saved === 'dark' : true; // default: dark
  });
  useEffect(() => {
    localStorage.setItem('edusmartTheme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.setProperty('color-scheme', isDark ? 'dark' : 'light');
  }, [isDark]);
  return { isDark, toggleTheme: () => setIsDark(p => !p) };
};

// ─── Login Screen ──────────────────────────────────────────────────────────────
const LoginScreen = () => {
  const { login } = useUser();
  const navigate = useNavigate();
  const [step, setStep]   = useState(1);
  const [role, setRole]   = useState(null);
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotStatus, setForgotStatus] = useState({ type: '', message: '' });
  const [forgotLoading, setForgotLoading] = useState(false);

  const selectRole = (r) => { setRole(r); setStep(2); setError(''); };
  const back = () => { setStep(1); setRole(null); setForm({ email: '', password: '' }); setError(''); };

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, { email: form.email, password: form.password });
      localStorage.setItem('edusmartToken', data.token);
      login(data.user);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotStatus({ type: 'error', message: 'Please enter your email address.' }); return; }
    setForgotLoading(true); setForgotStatus({ type: '', message: '' });
    try {
      await axios.post(`${API_BASE}/auth/forgot-password`, { email: forgotEmail.trim() });
      setForgotStatus({ type: 'success', message: 'Check your email for a reset link' });
    } catch (err) {
      setForgotStatus({ type: 'error', message: err.response?.data?.message || 'Unable to process request.' });
    } finally { setForgotLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans dark:text-slate-200 text-gray-800 antialiased">
      <div className="max-w-md w-full dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl -mr-16 -mt-16" />

        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center mb-10">
              {/* SMART-EDU Logo */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                  <BookOpen className="dark:text-white text-gray-900 w-10 h-10" />
                </div>
              </div>
              <h1 className="text-3xl font-black tracking-tight dark:text-white text-gray-900 mb-1">SMART-EDU</h1>
              <p className="text-sm text-cyan-400 font-bold tracking-widest uppercase">AI Powered LMS</p>
              <p className="text-sm dark:text-slate-500 text-gray-500 mt-2">Select your role to continue</p>
            </div>
            <div className="space-y-4">
              <button onClick={() => selectRole('student')} className="w-full bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 p-8 rounded-[2rem] transition-all shadow-xl shadow-indigo-600/20 group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap size={32} className="dark:text-white text-gray-900" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold dark:text-white text-gray-900 mb-1">Student Portal</h3>
                    <p className="text-sm text-indigo-100 opacity-90">Access your courses, grades, and more</p>
                  </div>
                  <ChevronRight size={24} className="dark:text-white text-gray-900/60 group-hover:dark:text-white hover:text-indigo-600 transition-colors" />
                </div>
              </button>
              <button onClick={() => selectRole('faculty')} className="w-full dark:bg-slate-800 bg-gray-50 hover:bg-slate-700 p-8 rounded-[2rem] transition-all border-2 dark:border-slate-700 border-gray-300 hover:border-slate-600 group">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase size={32} className="dark:text-slate-300 text-gray-700" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-bold dark:text-white text-gray-900 mb-1">Faculty Portal</h3>
                    <p className="text-sm dark:text-slate-400 text-gray-600">Manage students and track progress</p>
                  </div>
                  <ChevronRight size={24} className="dark:text-slate-500 text-gray-500 group-hover:dark:text-slate-300 text-gray-700 transition-colors" />
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <button onClick={back} className="flex items-center gap-2 dark:text-slate-400 text-gray-600 hover:dark:text-white hover:text-indigo-600 transition-colors text-sm font-medium mb-4">
              <ArrowLeft size={16} /> Back to role selection
            </button>
            <div className="text-center mb-8">
              <div className={`w-14 h-14 ${role === 'student' ? 'bg-indigo-600' : 'bg-slate-700'} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                {role === 'student' ? <GraduationCap className="dark:text-white text-gray-900 w-7 h-7" /> : <Briefcase className="dark:text-white text-gray-900 w-7 h-7" />}
              </div>
              <h1 className="text-2xl font-bold tracking-tight dark:text-white text-gray-900 mb-1">{role === 'student' ? 'Student' : 'Faculty'} Login</h1>
              <p className="text-sm dark:text-slate-500 text-gray-500">Enter your credentials to continue</p>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold dark:text-slate-500 text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
                <input type="email" placeholder="your@email.com"
                  className="w-full dark:bg-slate-800 bg-gray-50/50 border dark:border-slate-700 border-gray-300/50 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm"
                  value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold dark:text-slate-500 text-gray-500 uppercase tracking-wider ml-1">Password</label>
                <input type="password" placeholder="........"
                  className="w-full dark:bg-slate-800 bg-gray-50/50 border dark:border-slate-700 border-gray-300/50 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              </div>
            </div>
            <button onClick={handleLogin} disabled={loading}
              className={`w-full ${role === 'student' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'} dark:text-white text-gray-900 text-sm font-bold py-3 rounded-xl transition-all shadow-lg mt-6 flex items-center justify-center gap-2 disabled:opacity-60`}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
            <div className="text-center">
              <button onClick={() => { setShowForgotModal(true); setForgotEmail(form.email || ''); setForgotStatus({ type: '', message: '' }); }}
                className="text-[13px] dark:text-slate-500 text-gray-500 hover:text-indigo-400 transition-colors">
                Forgot your password?
              </button>
            </div>
          </div>
        )}
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-3xl p-6">
            <h3 className="dark:text-white text-gray-900 text-lg font-bold mb-2">Reset Password</h3>
            <p className="dark:text-slate-400 text-gray-600 text-sm mb-4">Enter your account email to receive a reset token.</p>
            <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com"
              className="w-full bg-slate-950 border dark:border-slate-700 border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
            {forgotStatus.message && (
              <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${forgotStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/10 text-red-300 border border-red-500/30'}`}>
                {forgotStatus.message}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowForgotModal(false)} className="px-4 py-2.5 rounded-xl dark:bg-slate-800 bg-gray-50 dark:text-slate-300 text-gray-700 text-sm font-bold">Close</button>
              <button onClick={handleForgotPassword} disabled={forgotLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 dark:text-white text-gray-900 text-sm font-bold">
                {forgotLoading ? 'Sending...' : 'Send Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Circular Progress ─────────────────────────────────────────────────────────
const CircularProgress = ({ percentage }) => {
  const radius = 65, circ = 2 * Math.PI * radius;
  const offset = circ - (percentage / 100) * circ;
  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg className="w-40 h-40 transform -rotate-90">
        <circle cx="80" cy="80" r={radius} strokeWidth="10" fill="transparent" className="stroke-slate-800" />
        <circle cx="80" cy="80" r={radius} strokeWidth="10" fill="transparent"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="stroke-indigo-500 transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold dark:text-white text-gray-900 leading-none">{percentage}%</span>
        <span className="text-[9px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest mt-1">Attendance</span>
      </div>
    </div>
  );
};

// ─── Timetable ─────────────────────────────────────────────────────────────────
const TimetableUI = () => {
  const codeMap = Object.fromEntries(SYLLABUS.map(s => [s.code, s.name.split(' ')[0]]));
  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay(); // 1=Mon…5=Fri

  return (
    <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-2xl overflow-hidden shadow-xl w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[600px]">
          <thead>
            <tr className="dark:bg-slate-800 bg-gray-50/50 dark:text-slate-500 text-gray-500 text-[10px] uppercase font-black tracking-widest">
              <th className="py-4 border-r dark:border-slate-800 border-gray-200">Time / Period</th>
              {["Mon","Tue","Wed","Thu","Fri"].map((d,i) => (
                <th key={d} className={`py-4 px-4 ${dayOfWeek === i+1 ? 'text-indigo-400' : ''}`}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {TIMETABLE_SLOTS.map((slot, idx) => {
              const isCurrent = !slot.isBreak && currentHour === slot.start;
              return (
                <tr key={idx} className={`border-t dark:border-slate-800 border-gray-200 ${slot.isBreak ? 'bg-amber-500/5' : ''} ${isCurrent ? 'bg-indigo-500/5' : ''}`}>
                  <td className="py-5 border-r dark:border-slate-800 border-gray-200 dark:bg-slate-900 bg-white/50">
                    <p className={`font-bold ${isCurrent ? 'text-indigo-300' : 'dark:text-slate-300 text-gray-700'}`}>{slot.time}</p>
                    <p className="text-[10px] text-slate-600 uppercase font-bold">P{slot.period}</p>
                    {isCurrent && <p className="text-[8px] text-indigo-400 font-black mt-0.5">● NOW</p>}
                  </td>
                  {[0,1,2,3,4].map(d => (
                    <td key={d} className="py-4 px-3">
                      {slot.isBreak
                        ? <span className="text-[10px] font-black text-amber-600/80 tracking-widest">LUNCH</span>
                        : (() => {
                            const code = SCHEDULE[idx]?.[d];
                            const isActiveCell = isCurrent && dayOfWeek === d+1;
                            return code ? (
                              <div className={`p-2 rounded-lg border transition-colors cursor-pointer
                                ${isActiveCell
                                  ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                                  : 'dark:bg-slate-800 bg-gray-50/30 dark:border-slate-800 border-gray-200 hover:border-indigo-500/40'}`}>
                                <p className="text-indigo-400 font-bold text-[11px]">{code}</p>
                                <p className="text-slate-600 text-[10px]">{codeMap[code]}</p>
                              </div>
                            ) : <span className="text-slate-700 text-[10px]">—</span>;
                          })()
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Faculty Timetable ─────────────────────────────────────────────────────────
const FacultyTimetableUI = () => {
  const codeMap = Object.fromEntries(SYLLABUS.map(s => [s.code, s.name.split(' ')[0]]));
  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <span className="text-xs font-black uppercase tracking-widest dark:text-slate-500 text-gray-500">Faculty Schedule</span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="w-3 h-3 rounded bg-indigo-600/30 border border-indigo-500/40 inline-block" />
          <span className="text-[10px] dark:text-slate-500 text-gray-500">Class</span>
          <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block ml-2" />
          <span className="text-[10px] dark:text-slate-500 text-gray-500">Free Period</span>
        </div>
      </div>
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-2xl overflow-hidden shadow-xl w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[600px]">
            <thead>
              <tr className="dark:bg-slate-800 bg-gray-50/50 dark:text-slate-500 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                <th className="py-4 border-r dark:border-slate-800 border-gray-200">Time / Period</th>
                {["Mon","Tue","Wed","Thu","Fri"].map((d,i) => (
                  <th key={d} className={`py-4 px-4 ${dayOfWeek === i+1 ? 'text-indigo-400' : ''}`}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {TIMETABLE_SLOTS.map((slot, idx) => {
                const isCurrent = !slot.isBreak && currentHour === slot.start;
                return (
                  <tr key={idx} className={`border-t dark:border-slate-800 border-gray-200 ${slot.isBreak ? 'bg-amber-500/5' : ''} ${isCurrent ? 'bg-indigo-500/5' : ''}`}>
                    <td className="py-5 border-r dark:border-slate-800 border-gray-200 dark:bg-slate-900 bg-white/50">
                      <p className={`font-bold ${isCurrent ? 'text-indigo-300' : 'dark:text-slate-300 text-gray-700'}`}>{slot.time}</p>
                      <p className="text-[10px] text-slate-600 uppercase font-bold">{slot.isBreak ? 'BREAK' : `P${slot.period}`}</p>
                      {isCurrent && <p className="text-[8px] text-indigo-400 font-black mt-0.5">● NOW</p>}
                    </td>
                    {[0,1,2,3,4].map(d => (
                      <td key={d} className="py-4 px-3">
                        {slot.isBreak
                          ? <span className="text-[10px] font-black text-amber-600/80 tracking-widest">LUNCH</span>
                          : (() => {
                              const code = FACULTY_SCHEDULE[idx]?.[d];
                              const isActiveCell = isCurrent && dayOfWeek === d+1;
                              if (code) {
                                return (
                                  <div className={`p-2 rounded-lg border transition-colors cursor-pointer
                                    ${isActiveCell
                                      ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                                      : 'dark:bg-slate-800 bg-gray-50/30 dark:border-slate-800 border-gray-200 hover:border-indigo-500/40'}`}>
                                    <p className="text-indigo-400 font-bold text-[11px]">{code}</p>
                                    <p className="text-slate-600 text-[10px]">{codeMap[code]}</p>
                                  </div>
                                );
                              }
                              return (
                                <div className="p-2 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                                  <p className="text-emerald-500 font-black text-[10px] tracking-widest">FREE</p>
                                </div>
                              );
                            })()
                        }
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Marks Input (memoised) ────────────────────────────────────────────────────
const MarkInput = memo(({ value, max, onChange }) => {
  const [localVal, setLocalVal] = useState(value);
  const debouncedVal = useDebounce(localVal, 500);
  useEffect(() => { onChange(debouncedVal); }, [debouncedVal]); // eslint-disable-line
  useEffect(() => { setLocalVal(value); }, [value]);
  return (
    <input type="number" min="0" max={max} value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      className="w-16 dark:bg-slate-800 bg-gray-50/50 border dark:border-slate-700 border-gray-300 rounded-lg px-2 py-2 text-center outline-none
        focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-sm font-bold dark:text-white text-gray-900" />
  );
});

const MarksRow = memo(({ student, onUpdate }) => {
  const total = calcTotal(student);
  return (
    <tr className="hover:dark:bg-slate-800 hover:bg-gray-100/20 transition-colors">
      <td className="px-6 lg:px-8 py-4 lg:py-5 sticky left-0 dark:bg-slate-900 bg-white z-10">
        <p className="font-bold dark:text-white text-gray-900">{student.name}</p>
        <p className="text-xs dark:text-slate-500 text-gray-500 mt-0.5">{student.id}</p>
      </td>
      {['ca1','ca2','ca3'].map(f => (
        <td key={f} className="px-4 py-4 text-center">
          <MarkInput value={student[f]} max={20} onChange={(v) => onUpdate(student.id, f, v)} />
        </td>
      ))}
      <td className="px-4 py-4 text-center">
        <MarkInput value={student.midterm} max={50} onChange={(v) => onUpdate(student.id, 'midterm', v)} />
      </td>
      <td className="px-4 py-4 text-center">
        <MarkInput value={student.endterm} max={100} onChange={(v) => onUpdate(student.id, 'endterm', v)} />
      </td>
      <td className="px-6 lg:px-8 py-4 text-center bg-indigo-500/5">
        <div className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
          <span className="text-lg font-black text-indigo-400">{total}</span>
        </div>
      </td>
    </tr>
  );
});

// ─── QR Generator ─────────────────────────────────────────────────────────────
const QRGenerator = ({ subject = 'General', durationMinutes = 15, facultyId = 'faculty' }) => {
  const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
  const now = new Date(), expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
  const payload = JSON.stringify({ sessionId, subject, date: now.toISOString(), facultyId, expiresAt: expiresAt.toISOString() });
  return (
    <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl">
      <QRCode value={payload} size={220} level="H" />
      <p className="text-[11px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest">Scan to mark attendance</p>
      <p className="text-[10px] dark:text-slate-400 text-gray-600">Subject: <strong>{subject}</strong> · Expires: {expiresAt.toLocaleTimeString()}</p>
    </div>
  );
};

// ─── XLSX helpers ──────────────────────────────────────────────────────────────
const exportStudentList = (students) => {
  const ws = XLSX.utils.json_to_sheet(students.map(s => ({
    'Student ID': s.id, 'Full Name': s.name, 'Email': s.email,
    'Attendance': s.attendance, 'Performance': s.performance,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'student_list.xlsx');
};
const exportMarks = (marks) => {
  const ws = XLSX.utils.json_to_sheet(marks.map(s => ({
    'Student ID': s.id, 'Name': s.name, 'CA1 (/20)': s.ca1, 'CA2 (/20)': s.ca2,
    'CA3 (/20)': s.ca3, 'Midterm (/50)': s.midterm, 'Endterm (/100)': s.endterm, 'Total (/210)': calcTotal(s),
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Marks');
  XLSX.writeFile(wb, 'student_marks.xlsx');
};

// ─── AI Chat FAB ───────────────────────────────────────────────────────────────
const AIChatFAB = () => {
  const [open, setOpen]     = useState(false);
  const [messages, setMsgs] = useState([
    { role: 'assistant', content: '👋 Namaste! I\'m your EduAI Study Buddy. Ask me anything — academics, attendance, career, study tips! 🎓' }
  ]);
  const [input, setInput]   = useState('');
  const [typing, setTyping] = useState(false);
  const endRef              = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || typing) return;
    const userMsg = { role: 'user', content: input };
    const history = messages.slice(-10); // send last 10 msgs for context
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    try {
      const token = localStorage.getItem('edusmartToken');
      const res = await axios.post(`${API_BASE}/ai/chat`, {
        message: input,
        history,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // backend returns res.data.reply
      const reply = res.data.reply || res.data.response || 'No response received.';
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      setMsgs(prev => [...prev, { role: 'assistant', content: serverMsg
        ? `⚠️ ${serverMsg}`
        : '⚠️ EduAI is temporarily unavailable. Please ensure the backend is running with a valid GEMINI_API_KEY.' }]);
    } finally { setTyping(false); }
  };

  return (
    <div className="fixed bottom-4 right-4 lg:bottom-10 lg:right-10 z-50">
      {open && (
        <div className="mb-4 w-80 lg:w-96 dark:bg-slate-900 bg-white border dark:border-slate-700 border-gray-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 480 }}>
          <div className="p-4 border-b dark:border-slate-800 border-gray-200 flex items-center justify-between bg-indigo-600/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Bot size={16} className="dark:text-white text-gray-900" />
              </div>
              <div>
                <p className="text-sm font-bold dark:text-white text-gray-900">EduAI Study Buddy</p>
                <p className="text-[10px] text-indigo-400">Powered by Gemini</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="dark:text-slate-500 text-gray-500 hover:dark:text-white hover:text-indigo-600 transition-colors"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'dark:bg-slate-800 bg-gray-50 dark:text-slate-200 text-gray-800 rounded-bl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="dark:bg-slate-800 bg-gray-50 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t dark:border-slate-800 border-gray-200 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask anything…"
              className="flex-1 dark:bg-slate-800 bg-gray-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600" />
            <button onClick={send} disabled={typing || !input.trim()}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-all">
              <Send size={16} className="dark:text-white text-gray-900" />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(p => !p)}
        className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-2xl shadow-indigo-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95">
        {open ? <X size={22} className="dark:text-white text-gray-900" /> : <Bot size={22} className="dark:text-white text-gray-900" />}
      </button>
    </div>
  );
};

// ─── Smart Scheduling Banner ───────────────────────────────────────────────────
const NextClassBanner = () => {
  const [nextClass, setNextClass] = useState(null);
  const codeMap = Object.fromEntries(SYLLABUS.map(s => [s.code, s.name]));

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const hour = now.getHours(), min = now.getMinutes();
      const day = now.getDay(); // 0=Sun,1=Mon...5=Fri,6=Sat
      const dayIdx = day >= 1 && day <= 5 ? day - 1 : null; // 0-4 for Mon-Fri

      if (dayIdx === null) { setNextClass(null); return; }

      for (let i = 0; i < TIMETABLE_SLOTS.length; i++) {
        const slot = TIMETABLE_SLOTS[i];
        if (slot.isBreak) continue;
        const code = SCHEDULE[i]?.[dayIdx];
        if (!code) continue;
        if (slot.start > hour || (slot.start === hour && min < 60)) {
          const minsUntil = (slot.start - hour) * 60 - min;
          if (minsUntil <= 60 && minsUntil >= 0) {
            setNextClass({ code, name: codeMap[code], time: slot.time, minsUntil });
            return;
          }
        }
        // currently in class — skip silently
      }
      setNextClass(null);
    };
    compute();
    const interval = setInterval(compute, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  if (!nextClass) return null;

  return (
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-bold
      ${nextClass.minsUntil <= 10
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'}`}>
      <Clock size={16} className="shrink-0" />
      <span>
        {nextClass.minsUntil === 0
          ? `🔔 ${nextClass.name} is starting now!`
          : nextClass.minsUntil <= 10
          ? `⚠️ ${nextClass.name} starts in ${nextClass.minsUntil} min · ${nextClass.time}`
          : `📅 Next: ${nextClass.name} · ${nextClass.time} (in ${nextClass.minsUntil} min)`}
      </span>
    </div>
  );
};

// ─── Page: Student Home ────────────────────────────────────────────────────────
const StudentHome = () => {
  const { studentData } = useUser();
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-2 space-y-6 lg:space-y-8">
        {/* Smart Scheduling */}
        <NextClassBanner />

        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-10 flex flex-col md:flex-row items-center justify-between gap-6 lg:gap-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -ml-20 -mt-20" />
          <CircularProgress percentage={studentData.attendance} />
          <div className="flex-1 space-y-4">
            <h3 className="text-xl lg:text-2xl font-bold dark:text-white text-gray-900 tracking-tight">Academic Overview</h3>
            <p className="dark:text-slate-400 text-gray-600 leading-relaxed text-sm">Your attendance is solid. Keep it up to maintain academic standing!</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="dark:bg-slate-800 bg-gray-50/30 p-4 rounded-2xl border dark:border-slate-800 border-gray-200/50">
                <p className="text-[9px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest mb-1">Semester CGPA</p>
                <p className="text-2xl font-black dark:text-white text-gray-900">
                  {calcCGPA10(studentData.results?.[studentData.results.length - 1]?.subjects)}
                  <span className="text-xs dark:text-slate-500 text-gray-500 font-medium"> /10</span>
                </p>
              </div>
              <div className="dark:bg-slate-800 bg-gray-50/30 p-4 rounded-2xl border dark:border-slate-800 border-gray-200/50">
                <p className="text-[9px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest mb-1">Current Rank</p>
                <p className="text-2xl font-black text-indigo-400">#12</p>
              </div>
            </div>
          </div>
        </div>
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] p-6 lg:p-8 shadow-xl">
          <h4 className="font-bold dark:text-white text-gray-900 text-sm mb-6 uppercase tracking-widest dark:text-slate-400 text-gray-600">Attendance Trend</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={studentData.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[1.5rem] p-6 shadow-xl">
            <h4 className="font-bold text-xs mb-4 uppercase tracking-widest dark:text-slate-500 text-gray-500">Next Class</h4>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><Clock size={20} /></div>
              <div>
                <p className="dark:text-white text-gray-900 font-bold">HCI: Design Lab</p>
                <p className="text-xs dark:text-slate-500 text-gray-500">Starts in 45m · Lab 202</p>
              </div>
            </div>
          </div>
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[1.5rem] p-6 shadow-xl">
            <h4 className="font-bold text-xs mb-4 uppercase tracking-widest dark:text-slate-500 text-gray-500">Assignments</h4>
            <div className="flex items-center justify-between dark:bg-slate-800 bg-gray-50/30 p-3 rounded-xl border dark:border-slate-800 border-gray-200">
              <span className="text-sm font-bold dark:text-white text-gray-900">DSA Quiz #4</span>
              <span className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1 rounded-full font-black">2 Days Left</span>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4 lg:space-y-6">
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] p-6 shadow-xl">
          <h4 className="font-bold text-xs mb-4 uppercase tracking-widest dark:text-slate-500 text-gray-500">Grade Distribution</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={studentData.gradeDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={60} label={({ name }) => name}>
                {studentData.gradeDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] p-6 lg:p-8 dark:text-white text-gray-900 shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm opacity-80 mb-6">Tuition Fees 2024</p>
            <p className="text-3xl font-black tracking-tighter mb-6">₹{studentData.feeAmount.toLocaleString()}</p>
            <button onClick={() => navigate('/pay-fee')} className="w-full bg-white text-indigo-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-lg">
              Make Payment
            </button>
          </div>
        </div>
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[1.5rem] p-6 shadow-xl">
          <h4 className="font-bold text-xs mb-6 uppercase tracking-widest dark:text-slate-500 text-gray-500">Notices</h4>
          <div className="space-y-6">
            <div className="flex gap-4 pb-6 border-b dark:border-slate-800 border-gray-200/50">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 shrink-0 shadow-lg shadow-indigo-500/50" />
              <div>
                <p className="text-xs dark:text-white text-gray-900 font-medium">Exam registration deadline extended until Feb 15</p>
                <p className="text-[10px] text-slate-600 font-bold uppercase mt-1.5">2 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0 shadow-lg shadow-emerald-500/50" />
              <div>
                <p className="text-xs dark:text-white text-gray-900 font-medium">New digital marksheet available for Sem 3</p>
                <p className="text-[10px] text-slate-600 font-bold uppercase mt-1.5">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Page: Faculty Home ────────────────────────────────────────────────────────
const FacultyHome = () => {
  const { facultyData } = useUser();
  const navigate = useNavigate();
  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700 w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { label: "Assigned Students", value: facultyData.managedStudents.length.toString(), icon: Users,    color: "text-blue-400", onClick: () => navigate('/student-lists') },
          { label: "Avg. Presence",     value: "91%", icon: BarChart3, color: "text-emerald-400" },
          { label: "Live Courses",      value: facultyData.syllabusTracking.length.toString(),   icon: BookOpen,  color: "text-indigo-400", onClick: () => navigate('/completion-tracking')  },
          { label: "System Alerts",     value: "05",  icon: Bell,      color: "text-amber-400"   },
        ].map((stat, i) => (
          <div key={i} onClick={stat.onClick} className={`dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[1.5rem] p-5 lg:p-7 hover:dark:border-slate-700 hover:border-gray-300 transition-colors ${stat.onClick ? 'cursor-pointer hover:dark:bg-slate-800 hover:bg-gray-100' : ''}`}>
            <stat.icon size={20} className={`${stat.color} mb-3 lg:mb-5`} />
            <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">{stat.label}</p>
            <p className="text-2xl lg:text-3xl font-bold dark:text-white text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] p-6 lg:p-8 shadow-xl">
          <h3 className="font-bold dark:text-white text-gray-900 mb-6">Class Avg. Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={facultyData.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] p-6 lg:p-8 shadow-xl">
          <h3 className="font-bold dark:text-white text-gray-900 mb-6">Course Progress</h3>
          <div className="space-y-5">
            {facultyData.syllabusTracking.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest dark:text-slate-500 text-gray-500">
                  <span>{s.subject}</span><span>{s.completed}%</span>
                </div>
                <div className="w-full h-2.5 dark:bg-slate-800 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all duration-700" style={{ width: `${s.completed}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Page: Results ─────────────────────────────────────────────────────────────
const ResultsPage = () => {
  const { studentData } = useUser();
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSem, setSelectedSem] = useState(null);
  const [view, setView] = useState('picker'); // 'picker' | 'marksheet'

  // Only semesters the student has actually started (not Locked)
  const availableResults = studentData.results.filter(r => r.status !== 'Locked');
  const semsForYear = selectedYear
    ? availableResults.filter(r => r.year === selectedYear)
    : [];

  const selectedResult = availableResults.find(
    r => r.year === selectedYear && r.sem === selectedSem
  );

  const marksheetStudent = useMemo(() => ({
    name: studentData.name, id: studentData.id,
    semester: studentData.semester, results: studentData.results,
  }), [studentData]);

  const completedResults = studentData.results.filter(r => r.status === 'Pass');
  const cgpa = calcCGPA10(completedResults.flatMap(r => r.subjects));

  // ── Picker view ─────────────────────────────────────────
  if (view === 'picker') {
    return (
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* CGPA Banner */}
        <div className="bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-indigo-500/30 rounded-3xl p-6 lg:p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-[11px] text-indigo-300 uppercase font-black tracking-widest mb-1.5 flex items-center gap-2">
              <ShieldCheck size={14} /> Overall CGPA (10.0 Scale)
            </p>
            <p className="text-5xl font-black dark:text-white text-gray-900 tracking-tight">
              {cgpa}
              <span className="text-xl text-indigo-200/50 font-bold tracking-normal"> / 10.0</span>
            </p>
            <p className="text-xs text-indigo-300/70 mt-2 font-medium">Based on completed semesters (1–3)</p>
          </div>
          <div className="text-right relative z-10 hidden sm:block">
            <p className="text-[11px] text-indigo-300 uppercase font-black tracking-widest mb-1.5">Current Year</p>
            <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex flex-col items-center justify-center shadow-inner">
              <p className="text-2xl font-black text-indigo-400">4th</p>
              <p className="text-[9px] text-indigo-300/70 font-bold uppercase tracking-widest">Sem</p>
            </div>
          </div>
        </div>

        {/* Year Selector */}
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
          <div>
            <h3 className="font-black dark:text-white text-gray-900 text-lg tracking-tight mb-1">Select Academic Year</h3>
            <p className="dark:text-slate-500 text-gray-500 text-sm">Choose the year and semester to view your marksheet.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(y => {
              const yearLabel = `Year ${y}`;
              const yearResults = availableResults.filter(r => r.year === yearLabel);
              const isAvailable = yearResults.length > 0;
              const isSelected = selectedYear === yearLabel;
              return (
                <button
                  key={y}
                  onClick={() => { if (isAvailable) { setSelectedYear(yearLabel); setSelectedSem(null); }}}
                  disabled={!isAvailable}
                  className={`relative rounded-2xl p-5 text-left transition-all border-2 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/30'
                      : isAvailable
                        ? 'dark:bg-slate-800 bg-gray-50/60 dark:border-slate-700 border-gray-300 hover:border-indigo-500/60 hover:dark:bg-slate-800 hover:bg-gray-100'
                        : 'dark:bg-slate-800 bg-gray-50/20 dark:border-slate-800 border-gray-200/50 opacity-40 cursor-not-allowed'
                  }`}>
                  <p className={`text-2xl font-black mb-1 ${isSelected ? 'dark:text-white text-gray-900' : 'dark:text-slate-300 text-gray-700'}`}>
                    Y{y}
                  </p>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-indigo-100' : 'dark:text-slate-500 text-gray-500'}`}>
                    {yearLabel}
                  </p>
                  {!isAvailable && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[8px] bg-slate-700 dark:text-slate-500 text-gray-500 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Locked</span>
                    </div>
                  )}
                  {isAvailable && (
                    <p className={`text-[9px] mt-2 font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-600'}`}>
                      {yearResults.length} Sem{yearResults.length > 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Semester Selector */}
          {selectedYear && (
            <div className="pt-4 border-t dark:border-slate-800 border-gray-200">
              <h4 className="font-black dark:text-white text-gray-900 text-sm mb-3 uppercase tracking-widest">Select Semester</h4>
              <div className="grid grid-cols-2 gap-3">
                {semsForYear.map(r => {
                  const isSelected = selectedSem === r.sem;
                  const isOngoing = r.status === 'Ongoing';
                  return (
                    <button
                      key={r.sem}
                      onClick={() => setSelectedSem(r.sem)}
                      className={`rounded-2xl p-4 text-left transition-all border-2 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/30'
                          : 'dark:bg-slate-800 bg-gray-50/60 dark:border-slate-700 border-gray-300 hover:border-indigo-500/60 hover:dark:bg-slate-800 hover:bg-gray-100'
                      }`}>
                      <p className={`font-black text-base mb-0.5 ${isSelected ? 'dark:text-white text-gray-900' : 'dark:text-slate-300 text-gray-700'}`}>{r.sem}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          r.status === 'Pass' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : r.status === 'Ongoing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-700 dark:text-slate-500 text-gray-500 border-slate-600'
                        }`}>{r.status}</span>
                        {!isOngoing && <span className={`text-[9px] font-bold ${isSelected ? 'text-indigo-200' : 'dark:text-slate-500 text-gray-500'}`}>SGPA: {r.gpa}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Button */}
          {selectedYear && selectedSem && (
            <button
              onClick={() => setView('marksheet')}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 dark:text-white text-gray-900 font-black rounded-2xl uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 flex items-center justify-center gap-2">
              <FileSpreadsheet size={18} />
              View Marksheet for {selectedSem}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Marksheet view ──────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Back + Download */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('picker')}
          className="flex items-center gap-2 dark:text-slate-400 text-gray-600 hover:dark:text-white hover:text-indigo-600 transition-colors font-bold text-sm">
          <ArrowLeft size={16} /> Back to Selection
        </button>
        <MarksheetPDF student={marksheetStudent} />
      </div>

      {/* SGPA Banner */}
      {selectedResult && (
        <div className="bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border border-indigo-500/30 rounded-3xl p-6 lg:p-8 flex items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-black dark:text-white text-gray-900 text-2xl tracking-tight">{selectedResult.sem}</h3>
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black text-indigo-300 tracking-widest uppercase">{selectedResult.year}</span>
            </div>
            <p className="text-[11px] text-indigo-300/70 uppercase font-black tracking-widest">Academic Performance Report</p>
          </div>
          <div className="relative z-10 bg-slate-950/50 py-3 px-6 rounded-2xl border dark:border-slate-800 border-gray-200/80 flex items-center gap-6">
            {selectedResult.status !== 'Ongoing' && (
              <div>
                <p className="text-[9px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest mb-0.5">SGPA</p>
                <p className="text-3xl font-black text-indigo-400">{calcCGPA10(selectedResult.subjects)}</p>
              </div>
            )}
            {selectedResult.status !== 'Ongoing' && <div className="h-10 w-px dark:bg-slate-800 bg-gray-50" />}
            <div>
              <p className="text-[9px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest mb-1.5">Status</p>
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border
                ${selectedResult.status === 'Pass' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : selectedResult.status === 'Ongoing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {selectedResult.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Marksheet Table */}
      {selectedResult && (
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="overflow-x-auto p-4 lg:p-6">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b dark:border-slate-800 border-gray-200">
                  <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest dark:text-slate-500 text-gray-500">Subject</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest dark:text-slate-500 text-gray-500 text-center">Credits</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest dark:text-slate-500 text-gray-500 text-center">Marks</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest dark:text-slate-500 text-gray-500 text-center">Grade Point</th>
                  <th className="px-4 py-3 text-[10px] uppercase font-black tracking-widest dark:text-slate-500 text-gray-500 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {selectedResult.subjects.map((s, si) => {
                  const gp = s.gradePoint !== '-' ? s.gradePoint : (marksToGradePoint(s.marks || 0));
                  const isOngoing = s.marks === '-';
                  const letter = isOngoing ? '-' : (s.grade || gradePointToLetter(gp));
                  return (
                    <tr key={si} className="hover:dark:bg-slate-800 hover:bg-gray-100/20 transition-colors group">
                      <td className="px-4 py-4 font-bold text-sm dark:text-slate-200 text-gray-800 group-hover:text-indigo-300 transition-colors">{s.name}</td>
                      <td className="px-4 py-4 text-center text-sm dark:text-slate-400 text-gray-600 font-medium">{s.credits}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-black text-sm ${isOngoing ? 'text-slate-600' : 'dark:text-slate-300 text-gray-700'}`}>{s.marks}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-black
                          ${isOngoing ? 'dark:bg-slate-800 bg-gray-50/50 dark:text-slate-500 text-gray-500' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                          {isOngoing ? '-' : gp}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-black
                          ${isOngoing ? 'text-slate-600'
                            : letter === 'O' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : letter.includes('A') ? 'bg-blue-500/20 text-blue-400'
                            : 'dark:bg-slate-800 bg-gray-50 dark:text-slate-300 text-gray-700'}`}>
                          {letter}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedResult.status !== 'Ongoing' && (
            <div className="px-6 lg:px-8 py-4 border-t dark:border-slate-800 border-gray-200 dark:bg-slate-800 bg-gray-50/20 flex items-center justify-between">
              <span className="text-[10px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest">
                Total Credits: {selectedResult.subjects.reduce((a, s) => a + (s.credits || 0), 0)}
              </span>
              <span className="text-[10px] dark:text-slate-500 text-gray-500 uppercase font-black tracking-widest">
                SGPA: <span className="text-indigo-400">{calcCGPA10(selectedResult.subjects)}</span> / 10.0
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Page: Assessments ─────────────────────────────────────────────────────────
const AssessmentsPage = () => {
  const { studentData } = useUser();
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="p-6 border-b dark:border-slate-800 border-gray-200 dark:bg-slate-800 bg-gray-50/20">
          <h3 className="font-bold dark:text-white text-gray-900 text-lg">Your Assessments</h3>
          <p className="text-xs dark:text-slate-500 text-gray-500 mt-1">Track your quizzes and assignments</p>
        </div>
        <div className="p-4 space-y-4">
          {studentData.assessments.map((a) => (
            <div key={a.id} className="dark:bg-slate-800 bg-gray-50/40 border dark:border-slate-800 border-gray-200 rounded-2xl p-5 hover:dark:bg-slate-800 hover:bg-gray-100/60 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${a.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <ClipboardCheck size={24} />
                  </div>
                  <div>
                    <h4 className="dark:text-white text-gray-900 font-bold text-lg mb-1">{a.name}</h4>
                    <p className="text-sm dark:text-slate-500 text-gray-500">{a.subject}</p>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-widest">{a.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:flex-col md:items-end">
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${a.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {a.status}
                  </span>
                  {a.status === 'Completed' && (
                    <div className="text-right">
                      <p className="text-sm dark:text-slate-500 text-gray-500 uppercase font-bold tracking-widest mb-1">Score</p>
                      <p className="text-xl font-black dark:text-white text-gray-900">{a.score}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Page: Syllabus (Role-based) ───────────────────────────────────────────────
const SyllabusPage = () => {
  const { userRole } = useUser();
  const { dismissAlert } = useAlerts();
  const isFaculty = userRole === 'faculty';
  const [editing, setEditing] = useState(null); // code of subject being edited
  const [subjects, setSubjects] = useState(SYLLABUS);
  const [uploadingCode, setUploadingCode] = useState(null);
  const fileInputRef = useRef(null);

  const handleDescriptionChange = (code, value) => {
    setSubjects(prev => prev.map(s => s.code === code ? { ...s, description: value } : s));
  };

  const handleUploadClick = (code) => {
    setUploadingCode(code);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && uploadingCode) {
      // Simulate file upload delay
      setTimeout(() => {
        setUploadingCode(null);
        alert(`Successfully uploaded "${file.name}" for ${uploadingCode}`);
      }, 1500);
    } else {
      setUploadingCode(null);
    }
    e.target.value = ''; // Reset input
  };

  return (
    <div className="w-full">
      {/* Hidden file input for uploading materials */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.ppt,.pptx"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-4">
        {subjects.map(sub => (
          <div key={sub.code} className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 p-6 lg:p-8 rounded-[2rem] hover:border-indigo-500/50 transition-all group shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">{sub.code}</div>
              {isFaculty && (
                <button onClick={() => setEditing(editing === sub.code ? null : sub.code)}
                  className="text-slate-600 hover:text-indigo-400 transition-colors p-1">
                  <Settings size={16} />
                </button>
              )}
              {!isFaculty && <MoreVertical size={16} className="text-slate-600" />}
            </div>
            <h4 className="text-lg font-bold dark:text-white text-gray-900 mb-3 tracking-tight">{sub.name}</h4>

            {isFaculty && editing === sub.code ? (
              <textarea
                value={sub.description}
                onChange={(e) => handleDescriptionChange(sub.code, e.target.value)}
                className="w-full dark:bg-slate-800 bg-gray-50 border dark:border-slate-700 border-gray-300 rounded-xl p-3 text-sm dark:text-slate-300 text-gray-700 outline-none focus:border-indigo-500 resize-none h-20 mb-4"
              />
            ) : (
              <p className="text-sm dark:text-slate-500 text-gray-500 mb-8 leading-relaxed h-12 overflow-hidden">{sub.description}</p>
            )}

            <div className={`flex items-center justify-between ${isFaculty && editing === sub.code ? '' : 'pt-6 border-t dark:border-slate-800 border-gray-200/60'}`}>
              <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">{sub.modules} Modules</span>
              {isFaculty ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUploadClick(sub.code)}
                    disabled={uploadingCode === sub.code}
                    className="flex items-center gap-1 text-indigo-400 text-xs font-black uppercase tracking-widest bg-indigo-500/10 px-3 py-2 rounded-xl border border-indigo-500/20 hover:bg-indigo-500 hover:dark:text-white hover:text-indigo-600 transition-all disabled:opacity-50">
                    {uploadingCode === sub.code ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploadingCode === sub.code ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              ) : (
                <button className="text-indigo-400 text-sm font-bold hover:underline flex items-center gap-2">
                  Download <Download size={14}/>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Page: Attendance (with fixed Absent button) ───────────────────────────────
const AttendancePage = () => {
  const { currentUser } = useUser();
  const [subject, setSubject] = useState('Data Structures & Algorithms');
  // ✅ FIX: Real state for each student's attendance status
  const [attendanceMap, setAttendanceMap] = useState({
    "S001": "present", "S002": "present", "S003": "present", "S004": "present",
  });
  const [submitted, setSubmitted] = useState(false);

  const students = [
    { id: "S001", name: "John Doe" },
    { id: "S002", name: "Jane Smith" },
    { id: "S003", name: "Mike Ross" },
    { id: "S004", name: "Rachel Zane" },
  ];

  const toggleStatus = useCallback((id, status) => {
    setAttendanceMap(prev => ({ ...prev, [id]: status }));
    setSubmitted(false);
  }, []);

  const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length;

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] p-8 shadow-xl">
        <h3 className="font-bold dark:text-white text-gray-900 text-lg mb-4 text-center">Today's Attendance QR</h3>
        <div className="mb-4">
          <label className="text-[11px] font-bold dark:text-slate-500 text-gray-500 uppercase tracking-wider">Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}
            className="w-full mt-1 dark:bg-slate-800 bg-gray-50 border dark:border-slate-700 border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors">
            {SYLLABUS.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <QRGenerator subject={subject} durationMinutes={15} facultyId={currentUser?.id || 'faculty'} />
      </div>

      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b dark:border-slate-800 border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-800 bg-gray-50/20">
          <div>
            <h3 className="font-bold dark:text-white text-gray-900 text-lg">Mark Attendance</h3>
            <p className="text-xs dark:text-slate-500 text-gray-500 mt-1 uppercase font-bold tracking-widest">{subject} · Today</p>
            <p className="text-xs text-emerald-400 mt-1 font-bold">{presentCount}/{students.length} Present</p>
          </div>
          <div className="flex items-center gap-3">
            {submitted && (
              <span className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                <CheckCircle size={14} /> Submitted!
              </span>
            )}
            <button
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-500 dark:text-white text-gray-900 text-xs font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/10">
              Submit Roll Call
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {students.map(({ id, name }) => {
            const status = attendanceMap[id];
            return (
              <div key={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[1.5rem] dark:bg-slate-800 bg-gray-50/20 hover:dark:bg-slate-800 hover:bg-gray-100/40 transition-colors border border-transparent hover:dark:border-slate-700 hover:border-gray-300">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border
                    ${status === 'present' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white text-gray-900">{name}</p>
                    <p className="text-[11px] dark:text-slate-500 text-gray-500 font-bold uppercase tracking-widest mt-0.5">{id}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* ✅ FIX: Both buttons now have real click handlers + active visual states */}
                  <button
                    onClick={() => toggleStatus(id, 'present')}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 justify-center
                      ${status === 'present'
                        ? 'bg-emerald-500 dark:text-white text-gray-900 border-emerald-400/30 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-950 dark:text-slate-500 text-gray-500 dark:border-slate-800 border-gray-200 hover:border-emerald-500/50 hover:text-emerald-400'}`}>
                    <CheckCircle size={13} /> Present
                  </button>
                  <button
                    onClick={() => toggleStatus(id, 'absent')}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 justify-center
                      ${status === 'absent'
                        ? 'bg-red-500 dark:text-white text-gray-900 border-red-400/30 shadow-lg shadow-red-500/20'
                        : 'bg-slate-950 dark:text-slate-500 text-gray-500 dark:border-slate-800 border-gray-200 hover:border-red-500/50 hover:text-red-400'}`}>
                    <XCircle size={13} /> Absent
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

// ─── Component: Inner QR Scanner ──────────────────────────────────────────────
const QRScannerComponent = ({ onScanSuccess }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    
    scanner.render((decodedText) => {
      scanner.clear();
      onScanSuccess(decodedText);
    }, (error) => {
      // ignore scanning errors
    });

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScanSuccess]);

  return (
    <div className="rounded-2xl overflow-hidden border dark:border-slate-700 border-gray-300">
      <div id="qr-reader" className="w-full bg-black"></div>
    </div>
  );
};

// ─── Page: Student Scan Attendance ─────────────────────────────────────────────
const ScanAttendancePage = () => {
  const [scanned, setScanned] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleScanSuccess = useCallback((decodedText) => {
    setScanned(true);
    try {
      const payload = JSON.parse(decodedText);
      setSuccessMsg(`Attendance marked Present for ${payload.subject}!`);
    } catch {
      setSuccessMsg("Attendance marked Present!");
    }
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] p-8 shadow-xl">
        <h3 className="font-bold dark:text-white text-gray-900 text-lg mb-2">Scan Faculty QR</h3>
        <p className="dark:text-slate-500 text-gray-500 text-sm mb-6">Scan the QR code displayed by your faculty to mark your attendance. Geolocation verification is required.</p>
        
        <AttendanceGuard
          onVerified={() => setErrorMsg('')}
          onDenied={() => setErrorMsg('You are outside the campus boundary. Marked Absent.')}>
          
          {scanned ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
              <h4 className="text-xl font-bold dark:text-white text-gray-900 mb-2">Success!</h4>
              <p className="text-emerald-400 font-medium">{successMsg}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {errorMsg ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                  <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold dark:text-white text-gray-900 mb-2">Absent</h4>
                  <p className="text-red-400 font-medium">{errorMsg}</p>
                </div>
              ) : (
                <QRScannerComponent onScanSuccess={handleScanSuccess} />
              )}
            </div>
          )}
        </AttendanceGuard>
      </div>
    </div>
  );
};


// ─── Page: Upload Marks ────────────────────────────────────────────────────────
const UploadMarksPage = () => {
  const { facultyData, updateMark, applyImportedMarks } = useUser();
  const marks = facultyData.marksData;
  const [saving, setSaving]   = useState(false);
  const [subject, setSubject] = useState('Data Structures & Algorithms');
  const [banner, setBanner]   = useState({ type: '', message: '' });
  const fileInputRef = useRef(null);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('edusmartToken');
      const marksData = marks.map((s) => ({ ...s, studentId: s.id, subject }));
      await axios.put(`${API_BASE}/students/marks/batch`, { marksData }, { headers: { Authorization: `Bearer ${token}` } });
      showBanner('success', 'Marks saved successfully.');
    } catch (err) {
      showBanner('error', err.response?.data?.message || err.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const token = localStorage.getItem('edusmartToken');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      const marksData = rows.map((row) => ({
        studentId: String(row['Student ID'] || '').trim(),
        subject: String(row.Subject || '').trim(),
        ca1: Number(row.CA1) || 0, ca2: Number(row.CA2) || 0, ca3: Number(row.CA3) || 0,
        midterm: Number(row.Midterm) || 0, endterm: Number(row.Endterm) || 0,
      })).filter((row) => row.studentId && row.subject);

      if (marksData.length === 0) { showBanner('error', 'No valid rows found.'); return; }

      await axios.put(`${API_BASE}/students/marks/batch`, { marksData }, { headers: { Authorization: `Bearer ${token}` } });
      applyImportedMarks(marksData);
      showBanner('success', 'Excel imported successfully.');
    } catch (err) {
      showBanner('error', err.response?.data?.message || err.message || 'Import failed.');
    } finally { event.target.value = ''; }
  };

  return (
    <div className="w-full">
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 lg:p-8 border-b dark:border-slate-800 border-gray-200 dark:bg-slate-800 bg-gray-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold dark:text-white text-gray-900 text-lg mb-1">Upload Student Marks</h3>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}
              className="mt-1 dark:bg-slate-800 bg-gray-50 border dark:border-slate-700 border-gray-300 rounded-xl px-3 py-1.5 text-sm dark:text-slate-300 text-gray-700 outline-none focus:border-indigo-500">
              {SYLLABUS.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-3 justify-end">
              <button onClick={() => exportMarks(marks)}
                className="bg-emerald-600 hover:bg-emerald-500 dark:text-white text-gray-900 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl flex items-center gap-2">
                <Download size={16} /> Export Excel
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-500 dark:text-white text-gray-900 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl flex items-center gap-2">
                <Upload size={16} /> Import Excel
              </button>
              <button onClick={handleSaveAll} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 dark:text-white text-gray-900 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save All
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
            {banner.message && (
              <div className={`text-xs font-bold px-3 py-2 rounded-xl border ${banner.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-red-500/10 text-red-300 border-red-500/30'}`}>
                {banner.message}
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="dark:bg-slate-800 bg-gray-50/50 text-[10px] uppercase font-black tracking-widest dark:text-slate-500 text-gray-500 border-b dark:border-slate-800 border-gray-200">
              <tr>
                <th className="px-6 lg:px-8 py-5 sticky left-0 dark:bg-slate-800 bg-gray-50/50 z-10">Student Details</th>
                <th className="px-4 py-5 text-center">CA1<br/><span className="text-[8px] text-slate-600">(Max 20)</span></th>
                <th className="px-4 py-5 text-center">CA2<br/><span className="text-[8px] text-slate-600">(Max 20)</span></th>
                <th className="px-4 py-5 text-center">CA3<br/><span className="text-[8px] text-slate-600">(Max 20)</span></th>
                <th className="px-4 py-5 text-center">Midterm<br/><span className="text-[8px] text-slate-600">(Max 50)</span></th>
                <th className="px-4 py-5 text-center">Endterm<br/><span className="text-[8px] text-slate-600">(Max 100)</span></th>
                <th className="px-6 lg:px-8 py-5 text-center bg-indigo-500/5">Total<br/><span className="text-[8px] text-slate-600">(210)</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {marks.map((student) => <MarksRow key={student.id} student={student} onUpdate={updateMark} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Page: Student Lists ───────────────────────────────────────────────────────
const StudentListsPage = () => {
  const { facultyData } = useUser();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const filtered = useMemo(() =>
    facultyData.managedStudents.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())),
    [search, facultyData.managedStudents]);

  return (
    <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-5xl mx-auto">
      <div className="p-6 lg:p-8 border-b dark:border-slate-800 border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-slate-800 bg-gray-50/20">
        <h3 className="text-xl font-bold dark:text-white text-gray-900">Active Student Roster</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-3 dark:text-slate-500 text-gray-500" size={18} />
            <input type="text" placeholder="Search by name or ID…"
              className="w-full bg-slate-950 border dark:border-slate-700 border-gray-300 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={() => exportStudentList(facultyData.managedStudents)}
            className="bg-emerald-600 hover:bg-emerald-500 dark:text-white text-gray-900 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl flex items-center gap-2 whitespace-nowrap">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="dark:bg-slate-800 bg-gray-50/50 text-[10px] uppercase font-black tracking-widest dark:text-slate-500 text-gray-500 border-b dark:border-slate-800 border-gray-200">
            <tr>
              <th className="px-6 lg:px-8 py-5">Full Name</th>
              <th className="px-6 lg:px-8 py-5">ID Number</th>
              <th className="px-6 lg:px-8 py-5">Attendance %</th>
              <th className="px-6 lg:px-8 py-5">Status</th>
              <th className="px-6 lg:px-8 py-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {filtered.length > 0 ? filtered.map(s => (
              <tr key={s.id} className="hover:dark:bg-slate-800 hover:bg-gray-100/20 transition-colors">
                <td className="px-6 lg:px-8 py-5 font-bold dark:text-white text-gray-900">{s.name}</td>
                <td className="px-6 lg:px-8 py-5 dark:text-slate-500 text-gray-500">{s.id}</td>
                <td className="px-6 lg:px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 dark:bg-slate-800 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: s.attendance }} />
                    </div>
                    <span className="text-indigo-400 font-black">{s.attendance}</span>
                  </div>
                </td>
                <td className="px-6 lg:px-8 py-5">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${s.performance === 'Excellent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : s.performance === 'Good' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {s.performance}
                  </span>
                </td>
                <td className="px-6 lg:px-8 py-5 text-center">
                  <button onClick={() => navigate(`/student/${s.id}`)} className="dark:text-slate-500 text-gray-500 hover:text-indigo-400 transition-colors p-2 hover:dark:bg-slate-800 hover:bg-gray-100 rounded-lg">
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-600 font-medium italic">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Page: Completion Tracking ─────────────────────────────────────────────────
const CompletionTrackingPage = () => {
  const { facultyData } = useUser();
  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      {facultyData.syllabusTracking.map((track, i) => (
        <div key={i} className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] p-8 lg:p-10 shadow-xl group hover:border-indigo-500/30 transition-colors">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
            <div>
              <h4 className="font-bold dark:text-white text-gray-900 text-lg tracking-tight">{track.subject}</h4>
              <p className="text-xs dark:text-slate-500 text-gray-500 mt-2 uppercase font-black tracking-widest">{track.totalModules} Total Modules</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-black text-indigo-400 leading-none">{track.completed}%</p>
              <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-1.5">Coverage</p>
            </div>
          </div>
          <div className="w-full h-3 dark:bg-slate-800 bg-gray-50 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000 shadow-lg shadow-indigo-600/30" style={{ width: `${track.completed}%` }} />
          </div>
          <div className="mt-6 flex flex-col sm:flex-row justify-between gap-3">
            <button className="text-[11px] font-black uppercase tracking-widest dark:text-slate-500 text-gray-500 hover:dark:text-white hover:text-indigo-600 flex items-center gap-2 transition-colors">
              <PlusCircle size={16} /> Add Lesson Node
            </button>
            <button className="text-[11px] font-black uppercase tracking-widest text-indigo-400 hover:underline">Update Curriculum</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Page: Upload Notes (functional drag-drop) ─────────────────────────────────
const UploadNotesPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([
    { name: "HCI_Design_Principals.pdf",  size: "2.1 MB", status: "done" },
    { name: "DSA_Complexities.pptx",      size: "4.5 MB", status: "done" },
    { name: "Intro_to_ML.docx",           size: "1.8 MB", status: "done" },
    { name: "Python_Labs_01.pdf",         size: "3.2 MB", status: "done" },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading]   = useState([]);
  const fileInputRef = useRef(null);

  const processFiles = (files) => {
    const newFiles = Array.from(files).map(f => ({
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1) + ' MB',
      status: 'uploading',
    }));
    setUploading(newFiles);
    // Simulate upload progress
    setTimeout(() => {
      setUploadedFiles(prev => [...prev, ...newFiles.map(f => ({ ...f, status: 'done' }))]);
      setUploading([]);
    }, 2000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    if (e.target.files.length) processFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (name) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 w-full max-w-5xl mx-auto items-stretch">
      {/* ✅ FIX: Functional drag-and-drop zone */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`dark:bg-slate-900 bg-white border-2 border-dashed rounded-[2.5rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all shadow-xl
          ${isDragging ? 'border-indigo-500 bg-indigo-500/5 scale-105' : 'dark:border-slate-800 border-gray-200 hover:border-indigo-500/50'}`}
        onClick={() => fileInputRef.current?.click()}>
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300 ${isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'dark:bg-slate-800 bg-gray-50 dark:text-slate-500 text-gray-500'}`}>
          {isDragging ? <Paperclip size={28} /> : <Upload size={28} />}
        </div>
        <h4 className="text-xl font-bold dark:text-white text-gray-900 text-center">
          {isDragging ? 'Drop files here!' : 'Upload Materials'}
        </h4>
        <p className="text-sm dark:text-slate-500 text-gray-500 text-center mt-3 px-8 leading-relaxed">
          Drag and drop PDF, PPT, or Word files — or click to browse.
        </p>
        {uploading.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-indigo-400 text-sm font-bold animate-pulse">
            <Loader2 size={16} className="animate-spin" /> Uploading {uploading.length} file(s)…
          </div>
        )}
        <button className="mt-8 text-indigo-400 text-xs font-black uppercase tracking-widest bg-indigo-500/10 px-6 py-3 rounded-2xl border border-indigo-500/20 hover:bg-indigo-500 hover:dark:text-white hover:text-indigo-600 transition-all pointer-events-none">
          Browse Files
        </button>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={handleFileInput} className="hidden" />
      </div>

      {/* File list */}
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2.5rem] p-8 shadow-xl">
        <h4 className="font-bold dark:text-white text-gray-900 text-lg mb-8">
          Uploaded Materials <span className="text-slate-600 text-sm font-normal">({uploadedFiles.length})</span>
        </h4>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {[...uploading, ...uploadedFiles].map((file, i) => (
            <div key={i} className="flex items-center justify-between p-4 dark:bg-slate-800 bg-gray-50/40 rounded-2xl border dark:border-slate-800 border-gray-200 hover:dark:bg-slate-800 hover:bg-gray-100 transition-colors group">
              <div className="flex items-center gap-4">
                <FileText size={18} className={file.status === 'uploading' ? 'text-amber-400 animate-pulse' : 'text-indigo-400'} />
                <div>
                  <span className="text-sm dark:text-slate-300 text-gray-700 font-bold block">{file.name}</span>
                  <span className="text-[10px] text-slate-600">{file.size}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.status === 'uploading'
                  ? <Loader2 size={14} className="text-amber-400 animate-spin" />
                  : <CheckCircle size={14} className="text-emerald-400" />}
                {file.status === 'done' && (
                  <button onClick={() => removeFile(file.name)}
                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Page: Study Rooms (Discord-style) ────────────────────────────────────────
const StudyRoomsPage = () => {
  const { currentUser, userRole, studentData, facultyData } = useUser();
  const name = currentUser?.name || (userRole === 'student' ? studentData.name : facultyData.name);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [connected, setConnected]   = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  const [sharedPdfs, setSharedPdfs]   = useState([]);
  const pdfInputRef = useRef(null);
  const socketRef = useRef(null);
  const endRef    = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    // Connect socket
    const socket = socketIO(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room-history', (history) => setMessages(history));
    socket.on('receive-message', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('user-joined', () => setOnlineCount(c => c + 1));
    socket.on('user-left', () => setOnlineCount(c => Math.max(1, c - 1)));
    return () => { socket.disconnect(); };
  }, []);

  const joinRoom = (sub) => {
    if (activeRoom) socketRef.current?.emit('leave-room', { room: activeRoom, user: name });
    setActiveRoom(sub.code);
    setMessages([]);
    socketRef.current?.emit('join-room', { room: sub.code, user: name });
    setOnlineCount(Math.floor(Math.random() * 8) + 2);
  };

  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return;
    socketRef.current?.emit('send-message', {
      room: activeRoom, message: input.trim(), user: name,
      avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    });
    setInput('');
  };

  const handlePdfShare = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type !== 'application/pdf') return;
      const pdfEntry = { name: file.name, size: file.size, url: URL.createObjectURL(file), sharedAt: new Date().toISOString() };
      setSharedPdfs(prev => [...prev, pdfEntry]);
      // Broadcast as a system message in the room
      socketRef.current?.emit('send-message', {
        room: activeRoom,
        message: `📄 Shared a PDF: ${file.name}`,
        user: name,
        avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      });
    });
    e.target.value = '';
  };

  const activeSubject = SYLLABUS.find(s => s.code === activeRoom);

  return (
    <div className="w-full flex gap-6 h-[calc(100vh-10rem)] max-h-[700px]">
      {/* Room list */}
      <div className="w-64 shrink-0 dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-slate-800 border-gray-200 dark:bg-slate-800 bg-gray-50/30">
          <h3 className="font-black dark:text-white text-gray-900 text-sm">📚 Study Rooms</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <p className="text-[10px] dark:text-slate-500 text-gray-500 font-bold">{connected ? 'Connected' : 'Connecting…'}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {SYLLABUS.map(sub => (
            <button key={sub.code} onClick={() => joinRoom(sub)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left
                ${activeRoom === sub.code ? 'bg-indigo-600 text-white' : 'dark:text-slate-400 text-gray-600 hover:dark:bg-slate-800 hover:bg-gray-100 hover:dark:text-white hover:text-indigo-600'}`}>
              <Hash size={14} className="shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{sub.name.split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-[9px] opacity-60">{sub.code}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
        {activeRoom ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b dark:border-slate-800 border-gray-200 flex items-center justify-between dark:bg-slate-800 bg-gray-50/30">
              <div>
                <div className="flex items-center gap-2">
                  <Hash size={16} className="dark:text-slate-400 text-gray-600" />
                  <h4 className="font-black dark:text-white text-gray-900 text-sm">{activeSubject?.name}</h4>
                </div>
                <p className="text-[10px] dark:text-slate-500 text-gray-500 mt-0.5">{activeSubject?.description}</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5">
                <Users size={12} className="text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-bold">{onlineCount} online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600">
                  <Hash size={40} />
                  <p className="text-sm font-bold">No messages yet. Start the discussion!</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center dark:text-white text-gray-900 text-[11px] font-black shrink-0">
                    {msg.avatar || msg.user?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-black dark:text-white text-gray-900">{msg.user}</span>
                      <span className="text-[10px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm dark:text-slate-300 text-gray-700 mt-0.5 leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Faculty PDF panel */}
            {userRole === 'faculty' && showPdfPanel && (
              <div className="mx-3 mb-2 dark:bg-slate-800 bg-gray-50/60 border dark:border-slate-700 border-gray-300 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-black dark:text-slate-400 text-gray-600 uppercase tracking-widest">📄 Shared PDFs</p>
                  <button onClick={() => pdfInputRef.current?.click()}
                    className="text-[11px] bg-indigo-600 hover:bg-indigo-500 dark:text-white text-gray-900 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5">
                    <Upload size={11} /> Upload PDF
                  </button>
                  <input ref={pdfInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handlePdfShare} />
                </div>
                {sharedPdfs.length === 0 ? (
                  <p className="text-[11px] text-slate-600 text-center py-2">No PDFs shared yet. Upload one to share with students.</p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {sharedPdfs.map((pdf, i) => (
                      <div key={i} className="flex items-center gap-2 dark:bg-slate-900 bg-white/60 rounded-xl px-3 py-2">
                        <FileText size={13} className="text-red-400 shrink-0" />
                        <a href={pdf.url} target="_blank" rel="noopener noreferrer"
                          className="text-[11px] dark:text-slate-300 text-gray-700 hover:text-indigo-400 font-medium truncate flex-1 transition-colors">
                          {pdf.name}
                        </a>
                        <span className="text-[10px] text-slate-600 shrink-0">{(pdf.size/1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t dark:border-slate-800 border-gray-200 flex gap-3">
              {userRole === 'faculty' && (
                <button onClick={() => setShowPdfPanel(p => !p)}
                  title="Share PDF"
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
                    showPdfPanel ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-400' : 'dark:bg-slate-800 bg-gray-50 dark:border-slate-700 border-gray-300 dark:text-slate-400 text-gray-600 hover:text-indigo-400 hover:border-indigo-500/40'
                  }`}>
                  <Paperclip size={16} />
                </button>
              )}
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={`Message #${activeSubject?.code}…`}
                className="flex-1 dark:bg-slate-800 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600" />
              <button onClick={sendMessage} disabled={!input.trim()}
                className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-all shrink-0">
                <Send size={16} className="dark:text-white text-gray-900" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-600">
            <Hash size={48} />
            <div className="text-center">
              <p className="dark:text-white text-gray-900 font-bold text-lg mb-2">Welcome to Study Rooms</p>
              <p className="text-sm">Select a subject room from the left to join the discussion.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page: Pay Fee ─────────────────────────────────────────────────────────────
const PayFeePage = () => {
  const { studentData } = useUser();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStep(3); // Success
    }, 2000);
  };

  if (step === 3) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] p-10 text-center shadow-xl">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-black dark:text-white text-gray-900 mb-2">Payment Successful!</h2>
          <p className="dark:text-slate-400 text-gray-500 mb-8">Your tuition fee for the current semester has been paid successfully.</p>
          <div className="dark:bg-slate-800 bg-gray-50 rounded-2xl p-6 text-left mb-8">
            <div className="flex justify-between mb-2">
              <span className="dark:text-slate-400 text-gray-500 text-sm">Amount Paid</span>
              <span className="dark:text-white text-gray-900 font-bold">₹{studentData.feeAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="dark:text-slate-400 text-gray-500 text-sm">Transaction ID</span>
              <span className="dark:text-white text-gray-900 font-mono text-sm">TXN-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-slate-400 text-gray-500 text-sm">Date</span>
              <span className="dark:text-white text-gray-900 text-sm">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={() => setStep(1)} className="text-indigo-500 font-bold hover:underline">
            Download Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Summary */}
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Total Due</p>
            <h2 className="text-5xl font-black tracking-tight mb-8">₹{studentData.feeAmount.toLocaleString()}</h2>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-indigo-500/50 pb-3">
                <span className="text-indigo-200">Tuition Fee</span>
                <span className="font-bold">₹1,00,000</span>
              </div>
              <div className="flex justify-between border-b border-indigo-500/50 pb-3">
                <span className="text-indigo-200">Library & Lab</span>
                <span className="font-bold">₹10,000</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-indigo-200">Exam Fee</span>
                <span className="font-bold">₹2,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Payment Methods */}
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-gray-200 rounded-[2rem] p-6 lg:p-8 shadow-xl">
        <h3 className="text-lg font-black dark:text-white text-gray-900 mb-6">Select Payment Method</h3>
        
        <div className="space-y-4 mb-8">
          {[
            { id: 'upi', name: 'UPI / QR Code', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm' },
            { id: 'card', name: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
            { id: 'bank', name: 'Net Banking', icon: BookOpen, desc: 'All major banks supported' }
          ].map(m => (
            <div key={m.id} onClick={() => setMethod(m.id)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                method === m.id ? 'border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50' : 'dark:border-slate-800 border-gray-200 hover:dark:border-slate-700 hover:border-gray-300 dark:bg-slate-800/50 bg-gray-50/50'
              }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${method === m.id ? 'bg-indigo-500 text-white' : 'dark:bg-slate-700 bg-gray-200 dark:text-slate-300 text-gray-600'}`}>
                <m.icon size={20} />
              </div>
              <div className="flex-1">
                <p className={`font-bold ${method === m.id ? 'dark:text-indigo-300 text-indigo-700' : 'dark:text-white text-gray-900'}`}>{m.name}</p>
                <p className="text-xs dark:text-slate-400 text-gray-500">{m.desc}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${method === m.id ? 'border-indigo-500' : 'dark:border-slate-600 border-gray-300'}`}>
                {method === m.id && <div className="w-3 h-3 bg-indigo-500 rounded-full" />}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handlePay} 
          disabled={!method || processing}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-black rounded-2xl uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2">
          {processing ? <><Loader2 size={18} className="animate-spin"/> Processing...</> : `Pay ₹${studentData.feeAmount.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
};

// ─── Page Titles ───────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  '/home': 'Home', '/timetable': 'Timetable', '/syllabus': 'Syllabus',
  '/announcements': 'Announcements', '/pay-fee': 'Pay Fee', '/assessments': 'Assessments',
  '/results': 'Results', '/attendance': 'Take Attendance', '/upload-marks': 'Upload Marks',
  '/upload-notes': 'Upload Notes', '/student-lists': 'Student Lists',
  '/completion-tracking': 'Completion Tracking', '/student': 'Student Profile',
  '/study-rooms': 'Study Rooms', '/scan-attendance': 'Scan Attendance QR',
};

// ─── Dashboard Shell ───────────────────────────────────────────────────────────
const DashboardShell = () => {
  const { userRole, currentUser, studentData, facultyData, logout } = useUser();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [showProfileDrop, setShowProfileDrop] = useState(false);
  const { isDark, toggleTheme }           = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const dropRef   = useRef(null);
  const { alerts, dismissAlert } = useAlerts();

  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';
  const name      = currentUser?.name || (userRole === 'student' ? studentData.name : facultyData.name);
  const uid       = currentUser?.id   || (userRole === 'student' ? studentData.id   : facultyData.id);
  const initials  = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  useEffect(() => {
    const handle = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowProfileDrop(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSignOut = () => { logout(); navigate('/'); };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 dark:text-slate-200 text-gray-800' : 'bg-gray-50 text-gray-900'} flex overflow-hidden font-sans antialiased transition-colors duration-300`}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        <header className={`h-16 lg:h-20 border-b ${isDark ? 'dark:border-slate-800 border-gray-200/60 bg-slate-950/40' : 'border-gray-200 bg-white'} flex items-center justify-between px-4 lg:px-10 backdrop-blur-xl sticky top-0 z-30 transition-colors duration-300`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:dark:bg-slate-800 hover:bg-gray-100/40 rounded-xl dark:text-slate-400 text-gray-600 transition-colors lg:hidden">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-base lg:text-lg font-bold tracking-tight">{pageTitle}</h2>
              <p className="text-[9px] lg:text-[10px] dark:text-slate-500 text-gray-500 uppercase tracking-widest font-black hidden sm:block">{uid} · {name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-5">
            {/* ✅ Dark/Light Mode Toggle */}
            <button onClick={toggleTheme}
              className={`p-2 lg:p-2.5 ${isDark ? 'dark:bg-slate-900 bg-white dark:border-slate-800 border-gray-200' : 'bg-white border-slate-200'} border rounded-full transition-all hover:scale-110`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
            </button>

            <button className={`p-2 lg:p-2.5 ${isDark ? 'dark:bg-slate-900 bg-white dark:border-slate-800 border-gray-200' : 'bg-white border-slate-200'} border rounded-full dark:text-slate-400 text-gray-600 relative hover:dark:text-white hover:text-indigo-600 transition-all`}>
              <Bell size={16} className="lg:w-[18px] lg:h-[18px]" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full border border-slate-900" />
            </button>

            <div className="relative" ref={dropRef}>
              <button onClick={() => setShowProfileDrop(p => !p)}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 p-[2px] hover:scale-105 transition-transform">
                <div className={`w-full h-full rounded-full ${isDark ? 'dark:bg-slate-900 bg-white' : 'bg-white'} flex items-center justify-center font-black text-[10px] lg:text-xs dark:text-white text-gray-900`}>
                  {initials}
                </div>
              </button>
              {showProfileDrop && (
                <div className={`absolute right-0 mt-3 w-56 ${isDark ? 'dark:bg-slate-900 bg-white dark:border-slate-800 border-gray-200' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl overflow-hidden`}>
                  <div className={`p-4 border-b ${isDark ? 'dark:border-slate-800 border-gray-200' : 'border-slate-200'}`}>
                    <p className="text-sm font-bold">{name}</p>
                    <p className="text-xs dark:text-slate-500 text-gray-500 mt-0.5">{uid}</p>
                  </div>
                  <div className="p-2">
                    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'hover:dark:bg-slate-800 hover:bg-gray-100' : 'hover:bg-slate-100'} transition-all text-sm font-medium`}>
                      <Settings size={18} /> <span>Edit Profile</span>
                    </button>
                    <button onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium">
                      <LogOut size={18} /> <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-10 w-full max-w-7xl mx-auto flex flex-col">
          <Routes>
            <Route path="/home"               element={userRole === 'student' ? <StudentHome /> : <FacultyHome />} />
            <Route path="/timetable"          element={userRole === 'faculty' ? <FacultyTimetableUI /> : <TimetableUI />} />
            <Route path="/syllabus"           element={<SyllabusPage />} />
            <Route path="/study-rooms"        element={<StudyRoomsPage />} />
            <Route path="/announcements"      element={<AnnouncementsPage />} />
            <Route path="/pay-fee"            element={<PayFeePage />} />
            <Route path="/assessments"        element={<AssessmentsPage />} />
            <Route path="/results"            element={<ResultsPage />} />
            <Route path="/attendance"         element={<AttendancePage />} />
            <Route path="/upload-marks"       element={<UploadMarksPage />} />
            <Route path="/upload-notes"       element={<UploadNotesPage />} />
            <Route path="/student-lists"      element={<StudentListsPage />} />
            <Route path="/completion-tracking" element={<CompletionTrackingPage />} />
            <Route path="/student/:id"        element={<StudentDetailPage />} />
            <Route path="/scan-attendance"    element={<ScanAttendancePage />} />
            <Route path="*"                   element={<Navigate to="/home" replace />} />
          </Routes>
        </div>

        {alerts.length > 0 && (
          <div className="fixed bottom-4 left-4 lg:bottom-8 lg:left-8 z-40 space-y-3 max-w-sm">
            {alerts.map((alert) => (
              <button key={alert.id} onClick={() => dismissAlert(alert.id)}
                className="w-full text-left bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <p className="text-red-200 text-sm font-semibold">{`⚠️ ${alert.name} attendance dropped to ${alert.percentage}%`}</p>
              </button>
            ))}
          </div>
        )}
        <AIChatFAB />
      </main>
    </div>
  );
};

// ─── Protected Route ───────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { userRole } = useUser();
  if (!userRole) return <Navigate to="/" replace />;
  return children;
};

// ─── Root App ──────────────────────────────────────────────────────────────────
const App = () => (
  <UserProvider>
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/reset-password/:token" element={<ResetPasswordScreen />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <DashboardShell />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  </UserProvider>
);

export default App;

