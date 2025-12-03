import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../components/Button';
import { BottomNavBar, BottomTab } from '../components/BottomNavBar';
import { useAuth } from '../context/AuthContext';

const backgroundImage = require('../assets/background.png');
const { width, height } = Dimensions.get('window');

const TABS: BottomTab[] = [
  { key: 'LOCATION', label: 'Location', icon: 'home', iconFilled: 'home' },
  { key: 'FRIENDS', label: 'Friends', icon: 'people-outline', iconFilled: 'people' },
  { key: 'ACTIVITY', label: 'Activity', icon: 'notifications-outline', iconFilled: 'notifications' },
  { key: 'DEVICE', label: 'Device', icon: 'bluetooth-outline', iconFilled: 'bluetooth' },
  { key: 'PROFILE', label: 'Profile', icon: 'person-outline', iconFilled: 'person' },
];

const PlaceholderTab: React.FC<{ name: string }> = ({ name }) => (
  <View style={styles.placeholderTab}>
    <View style={styles.placeholderIcon}><Text style={{ fontSize: 28 }}>🚧</Text></View>
    <Text style={styles.placeholderTitle}>{name}</Text>
    <Text style={styles.placeholderDesc}>This feature will be available in the full version.</Text>
  </View>
);

const LocationTab: React.FC = () => {
  return (
    <View style={styles.locationTab}>
      <Text style={styles.locationTitle}>Hello!</Text>
      <Text style={styles.locationDesc}>We will soon release the full version of the app within a few weeks</Text>
      
      <Button style={styles.notifyButton}>
        Notify Me
      </Button>
    </View>
  );
};

const ProfileTab: React.FC = () => {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.profileTab}>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>
      </View>

      <View style={styles.profileActions}>
        <Button 
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging Out...' : 'Logout'}
        </Button>
      </View>
    </View>
  );
};

export const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('LOCATION');

  const renderContent = () => {
    switch (activeTab) {
      case 'LOCATION': return <LocationTab />;
      case 'FRIENDS': return <PlaceholderTab name="Friends" />;
      case 'ACTIVITY': return <PlaceholderTab name="Activity" />;
      case 'DEVICE': return <PlaceholderTab name="Device" />;
      case 'PROFILE': return <ProfileTab />;
      default: return <LocationTab />;
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }} imageStyle={{ resizeMode: 'cover' }}>
        <SafeAreaView style={{ flex: 1 }}>

      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>EVA</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>{renderContent()}</View>

        {/* Bottom Navigation */}
        <BottomNavBar
          tabs={TABS}
          activeKey={activeTab}
          onTabPress={setActiveTab}
        />
      </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
  },
  brand: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 2,
    opacity: 1,
    fontFamily: 'Helvetica',
  },
  content: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    marginBottom: 0, // Remove bottom margin
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70, // Reduced height
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderColor: 'transparent',
    borderWidth: 0,
    paddingBottom: 0, // Remove padding
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // Align to bottom edge
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.02,
    shadowRadius: 20,
    elevation: 2,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 64,
  },
  navLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.3,
  },
  navLabelActive: {
    color: '#111827',
    opacity: 1,
  },
  placeholderTab: {
    flex:1, alignItems:'center', justifyContent:'center', padding:32, textAlign:'center',
  },
  placeholderIcon: {
    width: 64, height: 64, backgroundColor: '#F1F1F1', borderRadius: 32, alignItems:'center', justifyContent:'center', marginBottom: 18},
  placeholderTitle: { fontSize: 32, fontWeight: '300', color:'#111827' },
  placeholderDesc: { fontSize: 14, color:'#6B7280', marginTop: 8, textAlign:'center' },
  locationTab: { 
    flex:1, 
    alignItems:'flex-start', 
    justifyContent:'flex-start', 
    padding:32,
    paddingTop: height * 0.25, // Position higher on screen
    width: '100%',
  },
  locationTitle: { 
    fontSize: 40, 
    color:'#111827', 
    fontWeight:'300', 
    marginBottom: 12,
    textAlign: 'left',
  },
  locationDesc: { 
    color:'#6B7280', 
    fontSize: 14, 
    marginBottom: 32, 
    maxWidth: width * 0.8,
    textAlign: 'left',
  },
  notifyButton: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
    maxWidth: 320,
    alignSelf: 'center',
  },
  profileTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 32,
    paddingTop: height * 0.15,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#111827',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileActions: {
    width: '100%',
    marginBottom: 80,
  },
  logoutButton: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
});