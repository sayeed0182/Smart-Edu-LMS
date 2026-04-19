import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Calendar, BarChart3, CreditCard, ClipboardCheck, ShieldCheck,
  CheckCircle2, FileSpreadsheet, Upload, Users, LogOut, X,
  Megaphone, BookOpen, MessageSquare,
} from 'lucide-react';
import { useUser } from '../Context/UserContext';

const SidebarBtn = ({ icon: Icon, label, to, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `w-full flex items-center gap-4 px-4 py-3 md:py-4 rounded-[1.25rem] transition-all duration-300 mb-1.5 group
      ${isActive
        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-105'
        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
      }`}
  >
    {({ isActive }) => (
      <>
        <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`} />
        <span className="font-bold text-[13px] tracking-tight">{label}</span>
      </>
    )}
  </NavLink>
);

const Sidebar = ({ isOpen, onClose }) => {
  const { userRole, logout } = useUser();
  const navigate = useNavigate();

  const handleSignOut = () => { logout(); navigate('/'); onClose?.(); };
  const linkProps = { onClick: () => { if (window.innerWidth < 1024) onClose?.(); } };

  return (
    <aside className={`bg-slate-900 border-r border-slate-800 transition-all duration-300
        fixed lg:static inset-y-0 left-0 z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-64 flex flex-col`}>

      {/* Logo */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-white">SMART-EDU</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors lg:hidden">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 mt-4 overflow-y-auto">
        <SidebarBtn icon={BarChart3}     label="Home"         to="/home"         {...linkProps} />
        <SidebarBtn icon={Calendar}      label="Timetable"    to="/timetable"    {...linkProps} />
        <SidebarBtn icon={BookOpen}      label="Syllabus"     to="/syllabus"     {...linkProps} />
        <SidebarBtn icon={MessageSquare} label="Study Rooms"  to="/study-rooms"  {...linkProps} />
        <SidebarBtn icon={Megaphone}     label="Announcements" to="/announcements" {...linkProps} />

        {userRole === 'student' && (
          <>
            <SidebarBtn icon={CheckCircle2}  label="Scan Attendance" to="/scan-attendance" {...linkProps} />
            <SidebarBtn icon={CreditCard}    label="Pay Fee"     to="/pay-fee"     {...linkProps} />
            <SidebarBtn icon={ClipboardCheck} label="Assessments" to="/assessments" {...linkProps} />
            <SidebarBtn icon={ShieldCheck}   label="Results"     to="/results"     {...linkProps} />
          </>
        )}

        {userRole === 'faculty' && (
          <>
            <div className="h-px bg-slate-800 mx-4 my-4 opacity-50" />
            <p className="text-[10px] uppercase font-black text-slate-600 ml-4 mb-2 tracking-widest">Faculty Controls</p>
            <SidebarBtn icon={CheckCircle2}   label="Take Attendance"    to="/attendance"          {...linkProps} />
            <SidebarBtn icon={FileSpreadsheet} label="Upload Marks"      to="/upload-marks"        {...linkProps} />
            <SidebarBtn icon={Upload}          label="Upload Notes"      to="/upload-notes"        {...linkProps} />
            <SidebarBtn icon={Users}           label="Student Lists"     to="/student-lists"       {...linkProps} />
            <SidebarBtn icon={BarChart3}       label="Completion Track"  to="/completion-tracking" {...linkProps} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm">
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
