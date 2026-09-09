import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, useAuth, useClerk, useSignIn, useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { bootstrapProfile } from '../services/profile';

const guestValue = { configured: false, isLoaded: true, isSignedIn: false, accountId: '', user: null, getToken: async () => '', signIn: () => {}, signInWithGoogle: async () => {}, manageAccount: () => {}, signOut: () => {} };
const AuthContext = createContext(guestValue);
const configuredPublishableKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || '';
const publishableKey = process.env.NODE_ENV === 'production' && !configuredPublishableKey.startsWith('pk_live_') ? '' : configuredPublishableKey;

function captureReferralCode() {
  try {
    const code = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase() || '';
    if (/^[A-Z0-9]{6,20}$/.test(code)) window.sessionStorage.setItem('edg-referral-code', code);
  } catch {}
}

function ClerkAuthBridge({ children }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const [accountId, setAccountId] = useState('');
  useEffect(() => {
    if (!isLoaded || !isSignedIn) { setAccountId(''); return undefined; }
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        const result = await bootstrapProfile(token || '', pendingReferralCode());
        if (active) {
          setAccountId(result.profile.accountId);
          clearPendingReferralCode();
        }
      } catch { if (active) setAccountId(''); }
    })();
    return () => { active = false; };
  }, [getToken, isLoaded, isSignedIn]);
  const value = useMemo(() => ({
    configured: true,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    accountId,
    user,
    getToken: async () => (await getToken()) || '',
    signIn: () => clerk.openSignIn({}),
    signInWithGoogle: async () => {
      if (!isSignInLoaded || !signIn) throw new Error('Secure sign-in is still loading. Please try again.');
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/profile`,
      });
    },
    manageAccount: () => clerk.openUserProfile({}),
    signOut: () => clerk.signOut({ redirectUrl: '/' }),
  }), [accountId, clerk, getToken, isLoaded, isSignInLoaded, isSignedIn, signIn, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function EdgAuthProvider({ children }) {
  const navigate = useNavigate();
  useEffect(() => { captureReferralCode(); }, []);
  if (!publishableKey) return <AuthContext.Provider value={guestValue}>{children}</AuthContext.Provider>;
  return (
    <ClerkProvider publishableKey={publishableKey} routerPush={(to) => navigate(to)} routerReplace={(to) => navigate(to, { replace: true })}>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

export function useEdgAuth() {
  return useContext(AuthContext);
}

export function pendingReferralCode() {
  try { return window.sessionStorage.getItem('edg-referral-code') || ''; }
  catch { return ''; }
}

export function clearPendingReferralCode() {
  try { window.sessionStorage.removeItem('edg-referral-code'); }
  catch {}
}
