// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { User, Session, AuthError } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error getting session:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const translateAuthError = (error: AuthError): string => {
    const errorMessage = error.message.toLowerCase();

    // Messages d'erreur Supabase traduits en français
    if (errorMessage.includes('invalid login credentials')) {
      return 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
    }
    if (errorMessage.includes('email not confirmed')) {
      return "Votre email n'a pas été confirmé. Veuillez vérifier votre boîte de réception.";
    }
    if (errorMessage.includes('user not found')) {
      return 'Aucun compte trouvé avec cet email.';
    }
    if (
      errorMessage.includes('email already registered') ||
      errorMessage.includes('user already registered')
    ) {
      return 'Un compte existe déjà avec cet email.';
    }
    if (errorMessage.includes('password')) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Problème de connexion. Veuillez vérifier votre connexion internet.';
    }
    if (errorMessage.includes('rate limit')) {
      return 'Trop de tentatives. Veuillez réessayer plus tard.';
    }
    if (errorMessage.includes('invalid email')) {
      return "L'adresse email n'est pas valide.";
    }

    // Message générique par défaut
    return 'Une erreur est survenue. Veuillez réessayer.';
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { data: null, error: { ...error, message: translateAuthError(error) } };
    }

    return { data, error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { data: null, error: { ...error, message: translateAuthError(error) } };
    }

    return { data, error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
