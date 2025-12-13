import { useReducer, useCallback } from 'react';
import {
  quickActionReducer,
  initialQuickActionState,
  QuickActionState,
} from '../reducers/quickActionReducer';
import { QuickActionMode } from '../types/quickActions';

/**
 * Custom hook for managing Quick Action modes and state
 * Provides centralized state management using a reducer pattern
 */
export const useQuickActionMode = () => {
  const [state, dispatch] = useReducer(quickActionReducer, initialQuickActionState);

  // Mode management
  const activateMode = useCallback((mode: QuickActionMode) => {
    dispatch({ type: 'ACTIVATE_MODE', payload: mode });
  }, []);

  const deactivateMode = useCallback(() => {
    dispatch({ type: 'DEACTIVATE_MODE' });
  }, []);

  // SOS state management
  const setSOSHolding = useCallback((isHolding: boolean) => {
    dispatch({ type: 'SET_SOS_HOLDING', payload: isHolding });
  }, []);

  const setSOSSent = useCallback((isSent: boolean) => {
    dispatch({ type: 'SET_SOS_SENT', payload: isSent });
  }, []);

  const resetSOSState = useCallback(() => {
    dispatch({ type: 'RESET_SOS_STATE' });
  }, []);

  // Location state management
  const setShareMyLocation = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SHARE_MY_LOCATION', payload: value });
  }, []);

  const setShareWithEveryone = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SHARE_WITH_EVERYONE', payload: value });
  }, []);


  // Convenience getters
  const isSOSMode = state.activeMode === 'SOS';
  const isLocationMode = state.activeMode === 'LOCATION';
  const isMessageMode = state.activeMode === 'MESSAGE';

  return {
    // State
    state,
    activeMode: state.activeMode,
    isSOSMode,
    isLocationMode,
    isMessageMode,
    isHoldingSOS: state.sosState.isHolding,
    sosSent: state.sosState.isSent,
    shareMyLocation: state.locationState.shareMyLocation,
    shareWithEveryone: state.locationState.shareWithEveryone,

    // Actions
    activateMode,
    deactivateMode,
    setSOSHolding,
    setSOSSent,
    resetSOSState,
    setShareMyLocation,
    setShareWithEveryone,
  };
};

