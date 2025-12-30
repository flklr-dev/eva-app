import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { getActivities } from '../services/activityService';
import { Activity } from '../types/activity';
import { setOnActivityRefresh } from '../services/webSocketService';

interface ActivityContextType {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refreshActivities: () => Promise<void>;
  loadMoreActivities: () => Promise<void>;
  hasMore: boolean;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
};

interface ActivityProviderProps {
  children: React.ReactNode;
}

const DEFAULT_LIMIT = 50;

export const ActivityProvider: React.FC<ActivityProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const isRefreshingRef = useRef(false);

  /**
   * Fetch activities from API
   */
  const fetchActivities = useCallback(async (reset: boolean = false) => {
    if (!token || !isAuthenticated || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offsetRef.current;
      const fetchedActivities = await getActivities(token, DEFAULT_LIMIT, currentOffset);

      if (reset) {
        setActivities(fetchedActivities);
        offsetRef.current = fetchedActivities.length;
      } else {
        setActivities(prev => [...prev, ...fetchedActivities]);
        offsetRef.current += fetchedActivities.length;
      }

      // Check if there are more activities
      setHasMore(fetchedActivities.length === DEFAULT_LIMIT);
    } catch (err: any) {
      console.error('[ActivityContext] Error fetching activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [token, isAuthenticated]);

  /**
   * Refresh activities (reset and fetch from beginning)
   */
  const refreshActivities = useCallback(async () => {
    offsetRef.current = 0;
    await fetchActivities(true);
  }, [fetchActivities]);

  /**
   * Load more activities (pagination)
   */
  const loadMoreActivities = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchActivities(false);
    }
  }, [fetchActivities, loading, hasMore]);

  /**
   * Handle WebSocket events for real-time updates
   */
  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Register callback to refresh activities when WebSocket events are received
    const unsubscribe = setOnActivityRefresh(() => {
      console.log('[ActivityContext] WebSocket event received, refreshing activities');
      refreshActivities();
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, token, refreshActivities]);

  /**
   * Initial load and refresh on app focus
   */
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshActivities();
    }
  }, [isAuthenticated, token]);

  /**
   * Refresh activities when app comes to foreground
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && token) {
        console.log('[ActivityContext] App became active, refreshing activities');
        refreshActivities();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, token, refreshActivities]);

  const value: ActivityContextType = {
    activities,
    loading,
    error,
    refreshActivities,
    loadMoreActivities,
    hasMore,
  };

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
};

