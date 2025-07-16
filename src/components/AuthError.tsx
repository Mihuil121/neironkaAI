import React from 'react';

export default function AuthError({ error }: { error: string }) {
  if (!error) return null;
  return <div className="auth-error">{error}</div>;
} 