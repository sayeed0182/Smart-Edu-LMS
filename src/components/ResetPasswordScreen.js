import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../Context/UserContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

const ResetPasswordScreen = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const { login } = useUser();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await axios.post(`${API_BASE}/auth/reset-password/${token}`, {
        password,
      });

      const { token: authToken, user } = response.data;
      localStorage.setItem('edusmartToken', authToken);
      login(user);
      navigate('/home');
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reset password.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-5"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-1">Enter a new password for your EduSmart account.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
            placeholder="At least 6 characters"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
            placeholder="Re-enter password"
          />
        </div>

        {status.message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-bold py-3 rounded-xl"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-3 rounded-xl"
        >
          Back to Login
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordScreen;

