"use client";

import React, { createContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  User, 
  Auth,
  Unsubscribe
} from "firebase/auth";
import { auth } from "../firebase/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only set up auth listener if auth is available
    if (!auth) {
      setLoading(false);
      return () => {};
    }

    const unsubscribe: Unsubscribe = (auth as Auth).onAuthStateChanged((user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // If auth is not available, just log a message
    if (!auth) {
      console.log("Firebase Auth is not configured. Sign in not available.");
      return;
    }
    
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth as Auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signOutUser = async () => {
    // If auth is not available, just log a message
    if (!auth) {
      console.log("Firebase Auth is not configured. Sign out not available.");
      return;
    }
    
    try {
      await firebaseSignOut(auth as Auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
