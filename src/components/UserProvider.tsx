'use client'

import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

/**
 * Holds the server-resolved Supabase user so client components (SiteHeader,
 * etc.) can read it instantly on first render without an extra getUser() call.
 * The value is initialised from the server in layout.tsx and kept reactive via
 * onAuthStateChange subscriptions in consuming components.
 */
const UserContext = createContext<User | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): User | null {
  return useContext(UserContext);
}
