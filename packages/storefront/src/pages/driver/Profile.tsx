import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function DriverProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    if (!token) { navigate('/driver/login'); return; }
    fetch(`${API_BASE}/api/driver/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401 || res.status === 403) { localStorage.removeItem('driver_token'); navigate('/driver/login'); return null; }
        return res.json();
      })
      .then((data) => { if (data?.success) setProfile(data.data); })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="text-gray-500 text-sm font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Profile</h1>
      </header>
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="text-lg font-semibold text-gray-900">{profile.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900">{profile.phone || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <span className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full font-medium">{profile.role}</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">Profile unavailable</p>
        )}
      </div>
    </div>
  );
}
