import React, { useEffect, useState } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/react';
import { Link } from 'react-router-dom';

const CALLBACK_TIMEOUT_MS = 15000;

export default function SsoCallback() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTimedOut(true);
      console.error(JSON.stringify({
        level: 'error',
        message: 'Authentication callback timed out',
        route: '/sso-callback',
        hasQuery: Boolean(window.location.search),
        hasHash: Boolean(window.location.hash),
      }));
    }, CALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <main className="route-loading" role="status" aria-live="polite">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/profile"
        signUpFallbackRedirectUrl="/profile"
      />
      {!timedOut ? (
        <><span />Completing secure sign-in…</>
      ) : (
        <div className="route-loading-recovery" role="alert">
          <h1>Sign-in did not finish</h1>
          <p>The secure callback expired or was opened without a valid sign-in response.</p>
          <Link to="/profile" replace>Return to profile and try again</Link>
        </div>
      )}
    </main>
  );
}
