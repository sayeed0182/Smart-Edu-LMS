import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, BookOpen, BarChart3, ClipboardCheck,
  TrendingUp, TrendingDown, Award, AlertCircle, Download,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from 'recharts';
import { useUser } from '../Context/UserContext';
import * as XLSX from 'xlsx';

const calcTotal = (s) =>
  (s.ca1 || 0) + (s.ca2 || 0) + (s.ca3 || 0) + (s.midterm || 0) + (s.endterm || 0);

// Derive per-subject marks from marksData for a given student
const SUBJECT_NAMES = [
  'Human Computer Interaction',
  'Data Structures & Algorithms',
  'AI & Machine Learning',
  'Python Programming',
  'Computer Networks',
];

// Fake per-subject radar data derived from overall marks score
const buildRadarData = (marks) => {
  const total = calcTotal(marks);
  const pct = Math.round((total / 210) * 100);
  return SUBJECT_NAMES.map((subject, i) => ({
    subject: subject.split(' ')[0],
    score: Math.min(100, Math.max(40, pct + (i % 2 === 0 ? 8 : -6) + i * 2)),
  }));
};

// Fake attendance trend derived from overall attendance string
const buildAttendanceTrend = (attendancePct) => {
  const base = parseInt(attendancePct, 10) || 80;
  return ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((month, i) => ({
    month,
    attendance: Math.min(100, Math.max(50, base + (i % 3 === 0 ? -6 : 4) + i)),
  }));
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'text-indigo-400' }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-5 flex flex-col gap-3">
    <Icon size={18} className={color} />
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-600 mt-1">{sub}</p>}
    </div>
  </div>
);

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { facultyData } = useUser();

  const student = useMemo(
    () => facultyData.managedStudents.find((s) => s.id === id),
    [id, facultyData.managedStudents]
  );

  const marks = useMemo(
    () => facultyData.marksData.find((m) => m.id === id),
    [id, facultyData.marksData]
  );

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-slate-400 text-lg font-bold">Student not found.</p>
        <button
          onClick={() => navigate('/student-lists')}
          className="flex items-center gap-2 text-indigo-400 hover:underline text-sm font-bold"
        >
          <ArrowLeft size={16} /> Back to Student Lists
        </button>
      </div>
    );
  }

  const total = marks ? calcTotal(marks) : null;
  const totalPct = total !== null ? Math.round((total / 210) * 100) : null;
  const attendanceTrend = buildAttendanceTrend(student.attendance);
  const radarData = marks ? buildRadarData(marks) : null;

  const attendanceNum = parseInt(student.attendance, 10) || 0;
  const isAtRisk = attendanceNum < 80 || (totalPct !== null && totalPct < 50);

  const performanceColor =
    student.performance === 'Excellent'
      ? 'text-emerald-400'
      : student.performance === 'Good'
      ? 'text-indigo-400'
      : 'text-amber-400';

  const exportStudentReport = () => {
    const info = [
      ['Student ID', student.id],
      ['Name', student.name],
      ['Email', student.email],
      ['Attendance', student.attendance],
      ['Performance', student.performance],
    ];
    if (marks) {
      info.push(
        ['CA1 (/20)', marks.ca1],
        ['CA2 (/20)', marks.ca2],
        ['CA3 (/20)', marks.ca3],
        ['Midterm (/50)', marks.midterm],
        ['Endterm (/100)', marks.endterm],
        ['Total (/210)', total]
      );
    }
    const ws = XLSX.utils.aoa_to_sheet(info);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Report');
    XLSX.writeFile(wb, `${student.id}_report.xlsx`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back */}
      <button
        onClick={() => navigate('/student-lists')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
      >
        <ArrowLeft size={16} /> Back to Student Lists
      </button>

      {/* Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
            {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{student.name}</h2>
            <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">{student.id}</p>
            <div className="flex items-center gap-2 mt-3">
              <Mail size={14} className="text-slate-500" />
              <a
                href={`mailto:${student.email}`}
                className="text-indigo-400 text-sm hover:underline"
              >
                {student.email}
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-3">
          <span
            className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border
              ${student.performance === 'Excellent'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : student.performance === 'Good'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
          >
            {student.performance}
          </span>
          {isAtRisk && (
            <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5">
              <AlertCircle size={12} /> At Risk
            </span>
          )}
          <button
            onClick={exportStudentReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-xs font-black uppercase tracking-widest transition-colors"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardCheck}
          label="Attendance"
          value={student.attendance}
          sub={attendanceNum >= 80 ? 'On track' : 'Below minimum'}
          color={attendanceNum >= 80 ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatCard
          icon={BarChart3}
          label="Performance"
          value={student.performance}
          color={performanceColor}
        />
        {marks && (
          <>
            <StatCard
              icon={Award}
              label="Total Marks"
              value={`${total}/210`}
              sub={`${totalPct}% overall`}
              color={totalPct >= 60 ? 'text-indigo-400' : 'text-amber-400'}
            />
            <StatCard
              icon={BookOpen}
              label="Endterm"
              value={`${marks.endterm}/100`}
              sub="Final exam score"
              color="text-indigo-400"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-white">Attendance Trend</h4>
            {attendanceNum >= parseInt(attendanceTrend[attendanceTrend.length - 2]?.attendance || 0, 10) ? (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <TrendingUp size={14} /> Improving
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
                <TrendingDown size={14} /> Declining
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Radar */}
        {radarData && (
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
            <h4 className="font-bold text-white mb-6">Subject Performance</h4>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Marks Breakdown */}
      {marks && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 bg-slate-800/20">
            <h4 className="font-bold text-white text-lg">Marks Breakdown</h4>
            <p className="text-xs text-slate-500 mt-1">Current semester assessment scores</p>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'CA 1', value: marks.ca1, max: 20 },
              { label: 'CA 2', value: marks.ca2, max: 20 },
              { label: 'CA 3', value: marks.ca3, max: 20 },
              { label: 'Midterm', value: marks.midterm, max: 50 },
              { label: 'Endterm', value: marks.endterm, max: 100 },
            ].map(({ label, value, max }) => {
              const pct = Math.round((value / max) * 100);
              return (
                <div key={label} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                    <p className="text-[10px] text-slate-600">/{max}</p>
                  </div>
                  <p className="text-2xl font-black text-white">{value}</p>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 font-bold">{pct}%</p>
                </div>
              );
            })}
          </div>
          {/* Total row */}
          <div className="px-6 pb-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between">
              <p className="font-black text-sm uppercase tracking-widest text-indigo-300">Total Score</p>
              <div className="text-right">
                <p className="text-3xl font-black text-indigo-400">{total}</p>
                <p className="text-[10px] text-slate-500 mt-1">out of 210 · {totalPct}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl">
        <h4 className="font-bold text-white mb-5">Quick Actions</h4>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:${student.email}?subject=Academic Update - ${student.name}`}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
          >
            <Mail size={15} /> Send Email
          </a>
          <button
            onClick={exportStudentReport}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download size={15} /> Export Excel Report
          </button>
          <button
            onClick={() => navigate('/upload-marks')}
            className="flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
          >
            <BarChart3 size={15} /> Edit Marks
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailPage;
