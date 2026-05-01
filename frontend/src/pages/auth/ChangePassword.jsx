import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function ChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Successfully updated, redirect to dashboard
      navigate('/me/attendance', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void bg-[image:var(--glow-cosmic)] flex flex-col items-center justify-center p-4 font-body text-primary">
      <div className="bg-surface bg-[image:var(--card-gradient)] rounded-2xl shadow-[var(--shadow-card)] p-8 md:p-12 w-full max-w-[440px] border border-border-subtle">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-full bg-warning-bg flex items-center justify-center mx-auto mb-4 text-warning-fg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 className="text-display-sm mb-2">Change Password</h1>
          <p className="text-secondary text-body-sm">
            Please set a new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-label text-secondary mb-2">NEW PASSWORD</label>
            <input 
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••" 
              className={`w-full bg-surface-inset border ${error ? 'border-danger-border' : 'border-border-default'} rounded-md px-4 py-3 text-primary text-[14px] focus:border-accent-glow focus:shadow-focus focus:outline-none transition-all`}
            />
          </div>

          <div>
            <label className="block text-label text-secondary mb-2">CONFIRM PASSWORD</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" 
              className={`w-full bg-surface-inset border ${error ? 'border-danger-border' : 'border-border-default'} rounded-md px-4 py-3 text-primary text-[14px] focus:border-accent-glow focus:shadow-focus focus:outline-none transition-all`}
            />
          </div>

          {error && (
            <p className="text-caption text-danger-fg text-center">{error}</p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-inverse rounded-md px-5 py-3 font-medium text-[14px] hover:bg-[#E5E5E7] transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Updating...' : 'Update & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
