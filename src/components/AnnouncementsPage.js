import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';
import { useUser } from '../Context/UserContext';

const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5001/api`;

const timeAgo = (timestamp) => {
  const created = new Date(timestamp).getTime();
  const diffMs = Date.now() - created;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const excerpt = (text = '', max = 180) => (text.length > max ? `${text.slice(0, max)}...` : text);

const AnnouncementsPage = () => {
  const { userRole, currentUser } = useUser();
  const isFaculty = userRole === 'faculty';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', priority: 'normal' });

  const token = localStorage.getItem('edusmartToken');

  const departmentQuery = useMemo(() => {
    if (!currentUser?.department) return '';
    return `?department=${encodeURIComponent(currentUser.department)}`;
  }, [currentUser?.department]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/announcements${departmentQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(response.data?.data || []);
    } catch (err) {
      setBanner({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load announcements.',
      });
    } finally {
      setLoading(false);
    }
  }, [departmentQuery, token]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const postAnnouncement = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;

    setSubmitting(true);
    setBanner(null);

    try {
      await axios.post(
        `${API_BASE}/announcements`,
        {
          title: form.title.trim(),
          body: form.body.trim(),
          priority: form.priority,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setForm({ title: '', body: '', priority: 'normal' });
      setBanner({ type: 'success', text: 'Announcement posted.' });
      await fetchAnnouncements();
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.message || 'Unable to post announcement.' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAnnouncement = async (announcementId) => {
    try {
      await axios.delete(`${API_BASE}/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanner({ type: 'success', text: 'Announcement deleted.' });
      await fetchAnnouncements();
    } catch (err) {
      setBanner({ type: 'error', text: err.response?.data?.message || 'Unable to delete announcement.' });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {isFaculty && (
        <form onSubmit={postAnnouncement} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-white text-lg font-bold">Post Announcement</h3>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            placeholder="Announcement body"
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <select
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="normal">normal</option>
              <option value="urgent">urgent</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl"
            >
              {submitting ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>
      )}

      {banner && (
        <div
          className={`border rounded-2xl px-4 py-3 text-sm font-semibold ${
            banner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h3 className="text-white text-lg font-bold mb-5">Announcements</h3>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-slate-500 text-sm">No announcements available.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => {
              const isOwn = String(item.postedBy?._id || '') === String(currentUser?.id || '');
              return (
                <article
                  key={item._id}
                  className={`bg-slate-950 border border-slate-800 rounded-2xl p-5 ${
                    item.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-white font-bold text-base">{item.title}</h4>
                      <p className="text-slate-300 text-sm mt-2 leading-relaxed">{excerpt(item.body)}</p>
                    </div>
                    {isFaculty && isOwn && (
                      <button
                        type="button"
                        onClick={() => deleteAnnouncement(item._id)}
                        className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800"
                        title="Delete announcement"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 text-xs text-slate-500 flex flex-wrap items-center gap-3 uppercase tracking-wider font-bold">
                    <span>{item.postedBy?.name || 'Faculty'}</span>
                    <span>{timeAgo(item.createdAt)}</span>
                    <span className={item.priority === 'urgent' ? 'text-red-400' : 'text-slate-500'}>{item.priority}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;

