import { QuickActionButton } from '../types/quickActions';
import { COLORS } from './theme';

/**
 * Quick Action buttons configuration
 */
export const ACTION_BUTTONS: QuickActionButton[] = [
  { 
    key: 'SOS', 
    label: 'SOS', 
    iconName: null, 
    color: COLORS.TEXT_PRIMARY, 
    background: COLORS.BACKGROUND_LIGHT_GREEN, 
    isText: true 
  },
  { 
    key: 'LOCATION', 
    label: 'Share Location', 
    iconName: 'map-marker', 
    iconNameActive: 'map-marker', 
    color: COLORS.TEXT_PRIMARY, 
    background: COLORS.BACKGROUND_LIGHT_GREEN 
  },
  { 
    key: 'HOME', 
    label: "I'm Home", 
    iconName: 'home-variant', 
    iconNameActive: 'home-variant', 
    color: COLORS.TEXT_PRIMARY, 
    background: COLORS.BACKGROUND_LIGHT_GREEN 
  },
  { 
    key: 'MESSAGE', 
    label: 'Message', 
    iconName: 'email', 
    iconNameActive: 'email', 
    color: COLORS.TEXT_PRIMARY, 
    background: COLORS.BACKGROUND_LIGHT_GREEN 
  },
];

