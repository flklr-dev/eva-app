import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <View style={styles.root}>
      {/* Aurora Borealis Gradient Background */}
      <LinearGradient
        colors={["#caffcf", "#ffffff", "#f1f8fe"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative blur blobs */}
      <View style={[styles.blob, styles.blobGreen]} />
      <View style={[styles.blob, styles.blobBlue]} />
      <View style={[styles.blob, styles.blobYellow]} />
      <View style={styles.panel}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  panel: {
    width: '100%',
    minHeight: '100%',
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#b6e8b5',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
    padding: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.35,
  },
  blobGreen: {
    width: 220,
    height: 220,
    backgroundColor: '#d2fad2',
    top: -80,
    left: -70,
  },
  blobBlue: {
    width: 260,
    height: 260,
    backgroundColor: '#c4e3f6',
    bottom: 80,
    right: -70,
  },
  blobYellow: {
    width: 130,
    height: 130,
    backgroundColor: '#faf7d2',
    top: 320,
    left: 80,
  },
});
