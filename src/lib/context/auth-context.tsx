'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase/client';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isWaiter: boolean;
  isKitchen: boolean;
  isCustomer: boolean;
  signInAnon: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  linkEmailAccount: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure profile document exists in Firestore
  const syncProfile = async (user: FirebaseUser, extraName?: string): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      setProfile(data);
      return data;
    }

    // New profile creation with default CUSTOMER role
    const now = Date.now();
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: extraName || user.displayName || (user.isAnonymous ? 'Guest Customer' : 'Customer'),
      photoURL: user.photoURL,
      role: 'CUSTOMER',
      accountType: user.isAnonymous ? 'anonymous' : 'registered',
      assignedRestaurantIds: [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    await setDoc(userRef, newProfile);
    setProfile(newProfile);
    return newProfile;
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          await syncProfile(user);

          // Realtime listener for force logout & role changes
          const userRef = doc(db, 'users', user.uid);
          unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              // Check force logout
              if (data.forceLogoutAt && data.forceLogoutAt > (data.lastLoginAt || 0)) {
                fbSignOut(auth);
                setProfile(null);
                setFirebaseUser(null);
                return;
              }
              setProfile(data);
            }
          });
        } catch (err) {
          console.error('Error syncing user profile:', err);
        }
      } else {
        setProfile(null);
        if (unsubscribeDoc) unsubscribeDoc();
      }

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const signInAnon = async () => {
    const cred = await signInAnonymously(auth);
    await syncProfile(cred.user);
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncProfile(cred.user);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await syncProfile(cred.user);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await syncProfile(cred.user, name);
    try {
      await sendEmailVerification(cred.user);
    } catch (e) {
      console.warn('Could not send verification email immediately:', e);
    }
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const linkEmailAccount = async (email: string, pass: string) => {
    if (!auth.currentUser) throw new Error('No active user to link');
    const credential = EmailAuthProvider.credential(email, pass);
    const result = await linkWithCredential(auth.currentUser, credential);
    // Update profile to registered
    const userRef = doc(db, 'users', result.user.uid);
    await updateDoc(userRef, {
      email: result.user.email,
      accountType: 'registered',
      updatedAt: Date.now(),
    });
    await syncProfile(result.user);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setFirebaseUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      await syncProfile(firebaseUser);
    }
  };

  const role: UserRole = profile?.role || 'CUSTOMER';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user: firebaseUser,
        profile,
        loading,
        isAdmin: role === 'ADMIN',
        isWaiter: role === 'WAITER',
        isKitchen: role === 'KITCHEN',
        isCustomer: role === 'CUSTOMER',
        signInAnon,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendVerificationEmail,
        resetPassword,
        linkEmailAccount,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
