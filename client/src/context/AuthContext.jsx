import { createContext, useCallback, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../lib/supabaseClient.js';
import { apiFetch } from '../api/client.js';

export const AuthContext = createContext(null);

const initialState = { session: null, profile: null, loading: true };

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':   return { ...state, session: action.session, loading: false };
    case 'SET_PROFILE':   return { ...state, profile: action.profile };
    case 'CLEAR':         return { session: null, profile: null, loading: false };
    default:              return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchProfile = useCallback(async (token) => {
    try {
      const profile = await apiFetch('/profiles/me', { token });
      dispatch({ type: 'SET_PROFILE', profile });
    } catch {
      // profile fetch failure is non-fatal — session still valid
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_SESSION', session });
      if (session) fetchProfile(session.access_token);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_SESSION', session });
      if (session) fetchProfile(session.access_token);
      else dispatch({ type: 'CLEAR' });
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'CLEAR' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
