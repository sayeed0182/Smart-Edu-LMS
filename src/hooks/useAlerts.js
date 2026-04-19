// src/hooks/useAlerts.js
// ✅ FIX: Socket now only connects when userRole is set (user is logged in).
//         Previously it connected unconditionally on every mount, causing
//         console errors and unnecessary connections on the login screen.

import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '../Context/UserContext';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://127.0.0.1:5000';

const canSeeAlert = ({ alert, userRole, currentUser, studentData, facultyData }) => {
  if (!alert) return false;

  if (userRole === 'student') {
    return (
      alert.studentMongoId === String(currentUser?.studentId || '') ||
      alert.studentMongoId === String(currentUser?.id        || '') ||
      alert.studentId      === String(studentData?.id        || '')
    );
  }

  if (userRole === 'faculty') {
    const managedIds = (facultyData?.managedStudents || []).map((s) => String(s.id));
    // If no managed list, show all alerts (default/demo mode)
    if (managedIds.length === 0) return true;
    return managedIds.includes(String(alert.studentId || ''));
  }

  return true;
};

export const useAlerts = () => {
  const { userRole, currentUser, studentData, facultyData } = useUser();
  const [alerts,    setAlerts]  = useState([]);
  const timersRef               = useRef(new Map());

  useEffect(() => {
    // ✅ FIX: only open socket when authenticated
    if (!userRole) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    const onLowAttendance = (payload) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setAlerts((prev) => [...prev, { ...payload, id }]);

      const timer = setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        timersRef.current.delete(id);
      }, 5000);

      timersRef.current.set(id, timer);
    };

    socket.on('low-attendance-alert', onLowAttendance);

    return () => {
      socket.off('low-attendance-alert', onLowAttendance);
      socket.disconnect();
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [userRole]); // ← re-runs when login/logout occurs

  const visibleAlerts = useMemo(
    () =>
      alerts.filter((alert) =>
        canSeeAlert({ alert, userRole, currentUser, studentData, facultyData })
      ),
    [alerts, currentUser, facultyData, studentData, userRole]
  );

  const dismissAlert = (id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return { alerts: visibleAlerts, dismissAlert };
};

export default useAlerts;