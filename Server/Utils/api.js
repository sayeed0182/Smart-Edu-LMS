// src/services/api.js — Drop this file into your React project's src/services/ folder
import axios from 'axios';

// ─── Base Axios Instance ──────────────────────────────────────────────────────
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach JWT token automatically ─────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edusmartToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 (token expired) ────────────────────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('edusmartToken');
      localStorage.removeItem('edusmartUser');
      window.location.href = '/login'; // Redirect to login
    }
    return Promise.reject(error);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// AUTH SERVICES
// ═════════════════════════════════════════════════════════════════════════════
export const authService = {
  // Login — saves token to localStorage on success
  login: async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('edusmartToken', data.token);
      localStorage.setItem('edusmartUser', JSON.stringify(data.user));
    }
    return data;
  },

  // Register new user
  register: async (userData) => {
    const { data } = await API.post('/auth/register', userData);
    if (data.token) {
      localStorage.setItem('edusmartToken', data.token);
      localStorage.setItem('edusmartUser', JSON.stringify(data.user));
    }
    return data;
  },

  // Logout — clears local storage
  logout: () => {
    localStorage.removeItem('edusmartToken');
    localStorage.removeItem('edusmartUser');
  },

  // Get current user from localStorage (no API call needed)
  getCurrentUser: () => {
    const user = localStorage.getItem('edusmartUser');
    return user ? JSON.parse(user) : null;
  },

  // Verify token is still valid
  getMe: async () => {
    const { data } = await API.get('/auth/me');
    return data;
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// STUDENT SERVICES
// ═════════════════════════════════════════════════════════════════════════════
export const studentService = {
  // Get all students (Faculty) or own profile (Student)
  getAll: async (filters = {}) => {
    const { data } = await API.get('/students', { params: filters });
    return data;
  },

  // Get a single student by MongoDB ID
  getById: async (id) => {
    const { data } = await API.get(`/students/${id}`);
    return data;
  },

  // Create a new student (Faculty only)
  create: async (studentData) => {
    const { data } = await API.post('/students', studentData);
    return data;
  },

  // Update marks for a student (Faculty only)
  updateMarks: async (studentId, marksData) => {
    const { data } = await API.put(`/students/${studentId}/marks`, marksData);
    return data;
  },

  // Delete a student (Faculty only)
  delete: async (id) => {
    const { data } = await API.delete(`/students/${id}`);
    return data;
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// ATTENDANCE SERVICES
// ═════════════════════════════════════════════════════════════════════════════
export const attendanceService = {
  // Mark attendance using QR code data
  verifyQR: async (qrData, studentMongoId = null) => {
    const { data } = await API.post('/attendance/verify-qr', { qrData, studentMongoId });
    return data;
  },

  // Get attendance records for a student
  getRecords: async (studentId, subject = null) => {
    const params = subject ? { subject } : {};
    const { data } = await API.get(`/attendance/${studentId}`, { params });
    return data;
  },

  // Generate QR session (Faculty only)
  generateSession: async (subject, durationMinutes = 10) => {
    const { data } = await API.post('/attendance/generate-session', { subject, durationMinutes });
    return data;
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// AI SERVICES
// ═════════════════════════════════════════════════════════════════════════════
export const aiService = {
  // Send a chat message to EduBot
  chat: async (prompt, context = null) => {
    const { data } = await API.post('/ai/chat', { prompt, context });
    return data;
  },

  // Analyze a student's performance
  analyzePerformance: async (studentData) => {
    const { data } = await API.post('/ai/analyze-performance', { studentData });
    return data;
  },
};

export default API;
