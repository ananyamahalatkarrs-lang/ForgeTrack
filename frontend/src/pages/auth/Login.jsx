import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function Login() {
  const [isMentor, setIsMentor] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      // For mentors: use their real email directly.
      // For students: construct email from USN using a valid domain.
      const email = isMentor
        ? identifier.trim()
        : `${identifier.toLowerCase().trim()}@forgetrack.app`;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      // Successful sign-in
      if (!isMentor && password === identifier.trim()) {
        navigate('/change-password', { replace: true });
        return;
      }

      const role = data.user?.user_metadata?.role || (isMentor ? 'mentor' : 'student');
      navigate(from || (role === 'mentor' ? '/dashboard' : '/me/attendance'), { replace: true });

    } catch (err) {
      console.error('Login Error:', err);
      // Friendly message for rate limits
      if (err.message?.toLowerCase().includes('rate limit')) {
         setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (err.message?.toLowerCase().includes('invalid login credentials')) {
         setError('Invalid email/USN or password.');
      } else if (err.message?.toLowerCase().includes('email not confirmed')) {
         setError('Email not confirmed. Please disable "Confirm Email" in Supabase Auth settings.');
      } else {
         setError(err.message || 'Sign in failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void bg-[image:var(--glow-cosmic)] flex flex-col items-center justify-center p-4 font-body text-primary">
      <div className="mb-8 text-center">
        <h1 className="text-display-md mb-2">ForgeTrack</h1>
        <p className="text-secondary text-body-lg">Sign in to your account</p>
      </div>

      <div className="bg-surface bg-[image:var(--card-gradient)] rounded-2xl shadow-[var(--shadow-card)] p-8 md:p-12 w-full max-w-[440px] border border-border-subtle">

        {/* Role Toggle */}
        <div className="flex p-1 bg-surface-inset rounded-lg mb-8 border border-border-default">
          <button
            type="button"
            id="mentor-tab"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isMentor ? 'bg-surface-raised text-primary shadow-sm border border-border-subtle' : 'text-secondary hover:text-primary'}`}
            onClick={() => { setIsMentor(true); setIdentifier(''); setError(null); setInfo(null); }}
          >
            Mentor Login
          </button>
          <button
            type="button"
            id="student-tab"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isMentor ? 'bg-surface-raised text-primary shadow-sm border border-border-subtle' : 'text-secondary hover:text-primary'}`}
            onClick={() => { setIsMentor(false); setIdentifier(''); setError(null); setInfo(null); }}
          >
            Student Login
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-label text-secondary mb-2">
              {isMentor ? 'EMAIL ADDRESS' : 'USN'}
            </label>
            <input
              id="identifier-input"
              type={isMentor ? 'email' : 'text'}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isMentor ? 'you@gmail.com' : '4SH24CS001'}
              className={`w-full bg-surface-inset border ${error ? 'border-danger-border' : 'border-border-default'} rounded-md px-4 py-3 text-primary text-[14px] focus:border-accent-glow focus:shadow-focus focus:outline-none transition-all placeholder:text-tertiary`}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-label text-secondary">PASSWORD</label>
              {isMentor && (
                <a href="#" className="text-caption text-accent-glow hover:underline">Forgot password?</a>
              )}
            </div>
            <input
              id="password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full bg-surface-inset border ${error ? 'border-danger-border' : 'border-border-default'} rounded-md px-4 py-3 text-primary text-[14px] focus:border-accent-glow focus:shadow-focus focus:outline-none transition-all placeholder:text-tertiary`}
            />
            {!isMentor && (
              <p className="mt-2 text-caption text-tertiary">Default password is your USN</p>
            )}
          </div>

          {info && (
            <p className="text-caption text-accent-glow text-center animate-pulse">{info}</p>
          )}
          {error && (
            <p className="text-caption text-danger-fg text-center">{error}</p>
          )}

          <button
            id="signin-button"
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-inverse rounded-md px-5 py-3 font-medium text-[14px] hover:bg-[#E5E5E7] transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? (info ? '⏳ Setting up...' : 'Signing In...') : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
