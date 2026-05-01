import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession && isMounted) {
          setSession(currentSession);
          await fetchUserProfile(currentSession.user.id);
        } else if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        if (isMounted) setLoading(false);
      }
    }

    async function fetchUserProfile(userId) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          // If we fail to fetch from DB, try metadata
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata) {
            setRole(user.user_metadata.role);
            setUserProfile({
              display_name: user.user_metadata.display_name || user.email,
              role: user.user_metadata.role,
              student_id: user.user_metadata.student_id
            });
          }
        } else {
          setRole(data.role);
          setUserProfile(data);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setRole(null);
          setUserProfile(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setLoading(true);
          await fetchUserProfile(session.user.id);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, role, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
