'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { PrivyInterface, usePrivy } from '@privy-io/react-auth';
import useSWR from 'swr';

import { debugLog } from '@/lib/debug';
import { getUserData } from '@/server/actions/user';
import { NeurUser, PrismaUser, PrivyUser } from '@/types/db';

/**
 * Extended interface for NeurUser that includes Privy functionality
 * Omits 'user' and 'ready' from PrivyInterface to avoid conflicts
 */
type NeurUserInterface = Omit<PrivyInterface, 'user' | 'ready'> & {
  isLoading: boolean;
  user: NeurUser | null;
};

/**
 * Loads cached NeurUser data from localStorage
 * @returns {NeurUser | null} Cached user data or null if not found/invalid
 */
function loadFromCache(): NeurUser | null {
  try {
    const cached = localStorage.getItem('neur-user-data');
    if (cached) {
      debugLog('Loading user data from cache', cached, {
        module: 'useUser',
        level: 'info',
      });
      return JSON.parse(cached);
    }
    debugLog('No user data found in cache', null, {
      module: 'useUser',
      level: 'info',
    });
    return null;
  } catch (error) {
    debugLog('Failed to load cached user data', error, {
      module: 'useUser',
      level: 'error',
    });
    return null;
  }
}

/**
 * Saves NeurUser data to localStorage
 * @param {NeurUser | null} data User data to cache or null to clear cache
 */
function saveToCache(data: NeurUser | null) {
  try {
    if (data) {
      localStorage.setItem('neur-user-data', JSON.stringify(data));
      debugLog('User data saved to cache', data, {
        module: 'useUser',
        level: 'info',
      });
    } else {
      localStorage.removeItem('neur-user-data');
      debugLog('User data removed from cache', null, {
        module: 'useUser',
        level: 'info',
      });
    }
  } catch (error) {
    debugLog('Failed to update user cache', error, {
      module: 'useUser',
      level: 'error',
    });
  }
}

/**
 * Fetches NeurUser data from the server
 * @param {PrivyUser} privyUser The authenticated Privy user
 * @returns {Promise<NeurUser | null>} User data or null if fetch fails
 */
async function fetchNeurUserData(
  privyUser: PrivyUser,
): Promise<NeurUser | null> {
  try {
    const response = await getUserData();
    if (response?.data?.success && response?.data?.data) {
      const prismaUser: PrismaUser = response.data.data;
      debugLog('Retrieved PrismaUser data from server', prismaUser, {
        module: 'useUser',
        level: 'info',
      });
      return {
        ...prismaUser,
        privyUser: privyUser as PrivyUser,
      } as NeurUser;
    }
    debugLog(
      'Server returned unsuccessful user data response',
      response?.data?.error,
      {
        module: 'useUser',
        level: 'error',
      },
    );
    return null;
  } catch (error) {
    debugLog('Error fetching user data', error, {
      module: 'useUser',
      level: 'error',
    });
    return null;
  }
}

/**
 * Custom hook for managing NeurUser data fetching, caching, and synchronization
 * Combines Privy authentication with our user data management system
 * @returns {NeurUserInterface} Object containing user data, loading state, and Privy interface methods
 */
export function useUser(): NeurUserInterface {
  const { ready, user: privyUser, ...privyRest } = usePrivy();
  const [initialCachedUser, setInitialCachedUser] = useState<NeurUser | null>(
    null,
  );
  const router = useRouter();

  console.log(privyUser?.wallet, 'HHHHHHHHHHHHHHHHHHHHHHHH');

  // Load cached user data on component mount
  useEffect(() => {
    const cachedUser = loadFromCache();
    setInitialCachedUser(cachedUser);
  }, []);

  // Define SWR key based on Privy authentication state
  const swrKey = ready && privyUser?.id ? `user-${privyUser.id}` : null;
  debugLog('SWR Key', swrKey, { module: 'useUser' });

  /**
   * SWR fetcher function that combines server data with Privy user data
   * @returns {Promise<NeurUser | null>} Combined user data or null
   */
  const fetcher = useCallback(async (): Promise<NeurUser | null> => {
    if (!ready || !privyUser) {
      debugLog('Privy not ready or user not logged in', null, {
        module: 'useUser',
        level: 'info',
      });
      return null;
    }

    if (privyUser) {
      debugLog('Fetching NeurUser data from server', null, {
        module: 'useUser',
        level: 'info',
      });
      const neurUser = await fetchNeurUserData(privyUser as PrivyUser);
      debugLog('Merged NeurUser data', neurUser, {
        module: 'useUser',
        level: 'info',
      });
      return neurUser;
    }
    debugLog('No valid NeurUser data retrieved', null, {
      module: 'useUser',
      level: 'warn',
    });
    return null;
  }, [ready, privyUser]);

  // Use SWR for data fetching and state management
  const { data: neurUser, isValidating: swrLoading } = useSWR<NeurUser | null>(
    swrKey,
    fetcher,
    {
      fallbackData: initialCachedUser,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  debugLog('Current NeurUser data', neurUser, { module: 'useUser' });
  debugLog('SWR validation status', swrLoading, { module: 'useUser' });

  // Update cache when new user data is fetched
  useEffect(() => {
    if (neurUser) {
      saveToCache(neurUser);
    }
  }, [neurUser]);

  const isLoading = swrLoading && !initialCachedUser;
  debugLog('Loading state', { isLoading }, { module: 'useUser' });

  /**
   * Enhanced logout function that handles both Privy logout and local cache clearing
   * Includes navigation to refresh page and redirect to home
   */
  const extendedLogout = useCallback(async () => {
    debugLog('Initiating user logout...', null, {
      module: 'useUser',
      level: 'info',
    });

    router.push('/refresh');

    try {
      await privyRest.logout();
      saveToCache(null);
      debugLog('User logged out and cache cleared', null, {
        module: 'useUser',
        level: 'info',
      });
      router.replace('/');
    } catch (error) {
      debugLog('Error during logout process', error, {
        module: 'useUser',
        level: 'error',
      });
      router.replace('/');
    }
  }, [privyRest, router]);

  return {
    ...privyRest,
    isLoading: isLoading || neurUser == null,
    user: neurUser || null,
    logout: extendedLogout,
  };
}
