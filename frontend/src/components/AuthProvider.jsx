import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../hooks/useAuth';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Initializing...");

  // Resolves a user's profile from the public.users table.
  // Falls back gracefully to auth metadata if the DB row doesn't exist yet.
  // Fast fallback: set role and profile from metadata immediately, then fetch DB profile in background
  const resolveProfile = useCallback(async (authUser) => {
    if (!authUser) return;

    // Fast fallback from metadata
    const metaRole = authUser.user_metadata?.role;
    const isStudent = authUser.email?.endsWith('@forgetrack.app');
    const fallbackRole = metaRole || (isStudent ? 'student' : 'mentor');
    const displayName = authUser.user_metadata?.display_name || authUser.email?.split('@')[0];

    setRole(fallbackRole);
    setUserProfile({
      id: authUser.id,
      email: authUser.email,
      role: fallbackRole,
      display_name: displayName,
    });
    setStatus("Ready (Metadata)");

    // Fetch DB profile in background and update if found
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        setRole(data.role);
        setUserProfile(data);
        setStatus("Ready");
      } else if (error) {
        console.warn("[AuthProvider] No DB profile found, using metadata fallback:", error?.message);
      }
    } catch (err) {
      console.error("[AuthProvider] resolveProfile error:", err);
      setStatus("Profile error");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Absolute failsafe: never stay on loading screen more than 6 seconds
    const failsafeTimer = setTimeout(() => {
      if (mounted) {
        console.warn("[AuthProvider] Failsafe triggered — forcing loading=false");
        setLoading(false);
        setStatus("Ready (Timeout)");
      }
    }, 6000);

    // Proactively check session to avoid waiting for the event listener if unauthenticated
    const checkInitialSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted && !currentSession) {
          setLoading(false);
          setStatus("Ready");
          clearTimeout(failsafeTimer);
        }
      } catch (e) {
        console.error("Session check error:", e);
      }
    };
    checkInitialSession();

    // Supabase fires onAuthStateChange immediately with the current session.
    // We use this as the SINGLE source of truth for initialization.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.log("[AuthProvider] Event:", event, currentSession?.user?.email ?? "no user");

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setRole(null);
          setUserProfile(null);
          setStatus("Signed out");
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (currentSession?.user) {
            setSession(currentSession);
            setStatus("Loading profile...");
            await resolveProfile(currentSession.user);
          } else {
            // No user in session — show login
            setSession(null);
            setRole(null);
            setUserProfile(null);
            setStatus("Ready");
          }
          setLoading(false);
          clearTimeout(failsafeTimer);
        } else {
          // Any other event (e.g. USER_UPDATED): just stop loading
          setLoading(false);
          clearTimeout(failsafeTimer);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
    };
  }, [resolveProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      setSession(null);
      setRole(null);
      setUserProfile(null);
      setStatus("Signed out");
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    role,
    userProfile,
    loading,
    status,
    signOut,
  }), [session, role, userProfile, loading, status, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
