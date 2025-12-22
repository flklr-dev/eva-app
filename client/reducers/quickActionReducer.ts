import { QuickActionMode } from '../types/quickActions';

/**
 * State interface for Quick Actions
 */
export interface QuickActionState {
  activeMode: QuickActionMode;
  sosState: {
    isHolding: boolean;
    isSent: boolean;
  };
  locationState: {
    shareMyLocation: boolean;
    shareWithEveryone: boolean;
  };
}

/**
 * Action types for Quick Action reducer
 */
export type QuickActionAction =
  | { type: 'ACTIVATE_MODE'; payload: QuickActionMode }
  | { type: 'DEACTIVATE_MODE' }
  | { type: 'SET_SOS_HOLDING'; payload: boolean }
  | { type: 'SET_SOS_SENT'; payload: boolean }
  | { type: 'RESET_SOS_STATE' }
  | { type: 'SET_SHARE_MY_LOCATION'; payload: boolean }
  | { type: 'SET_SHARE_WITH_EVERYONE'; payload: boolean };

/**
 * Initial state for Quick Actions
 */
export const initialQuickActionState: QuickActionState = {
  activeMode: null,
  sosState: {
    isHolding: false,
    isSent: false,
  },
  locationState: {
    shareMyLocation: true,
    shareWithEveryone: false, // Default OFF - will be implemented later
  },
};

/**
 * Reducer for Quick Action state management
 * Handles all mode switching, SOS state, location settings, and home notification
 */
export const quickActionReducer = (
  state: QuickActionState,
  action: QuickActionAction
): QuickActionState => {
  switch (action.type) {
    case 'ACTIVATE_MODE':
      // If activating the same mode, deactivate it (toggle behavior)
      if (state.activeMode === action.payload) {
        return {
          ...state,
          activeMode: null,
          // Reset SOS state when deactivating SOS mode
          sosState:
            action.payload === 'SOS'
              ? { isHolding: false, isSent: false }
              : state.sosState,
        };
      }
      // Activate new mode and reset SOS state if switching from SOS
      return {
        ...state,
        activeMode: action.payload,
        sosState:
          state.activeMode === 'SOS'
            ? { isHolding: false, isSent: false }
            : state.sosState,
      };

    case 'DEACTIVATE_MODE':
      return {
        ...state,
        activeMode: null,
        sosState: { isHolding: false, isSent: false },
      };

    case 'SET_SOS_HOLDING':
      return {
        ...state,
        sosState: {
          ...state.sosState,
          isHolding: action.payload,
        },
      };

    case 'SET_SOS_SENT':
      return {
        ...state,
        sosState: {
          ...state.sosState,
          isSent: action.payload,
        },
      };

    case 'RESET_SOS_STATE':
      return {
        ...state,
        sosState: {
          isHolding: false,
          isSent: false,
        },
      };

    case 'SET_SHARE_MY_LOCATION':
      return {
        ...state,
        locationState: {
          ...state.locationState,
          shareMyLocation: action.payload,
        },
      };

    case 'SET_SHARE_WITH_EVERYONE':
      return {
        ...state,
        locationState: {
          ...state.locationState,
          shareWithEveryone: action.payload,
        },
      };

    default:
      return state;
  }
};

