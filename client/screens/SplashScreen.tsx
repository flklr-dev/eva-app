import React from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, Image, useWindowDimensions } from 'react-native';
import { Button } from '../components/Button';

const backgroundImage = require('../assets/background.png');
const evaLogo = require('../assets/eva-logo.webp');
const { width, height } = Dimensions.get('window');

type Props = {
  onNavigate: (screen: string) => void;
};

export const SplashScreen: React.FC<Props> = ({ onNavigate }) => {
  const { width: winW } = useWindowDimensions();
  const isSmall = winW < 360;
  const logoSize = isSmall ? 260 : 350;

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }} imageStyle={{ resizeMode: 'cover' }}>
      
      <View style={styles.container}>
        {/* Top Section - App Name */}
        <View style={styles.topBranding}>
          <Text style={styles.brand}>EVA</Text>
        </View>

        {/* Middle Section - Shield Logo */}
        <View style={styles.shieldContainer}>
          <Image source={evaLogo} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
        </View>

        {/* Lower Section - Text and Button */}
        <View style={styles.bottomContent}>
          <Text style={styles.heroTitle}>Feel Safe.{"\n"}Stay Connected.</Text>
          <Text style={styles.heroDesc}>Compact protection for every moment.</Text>
          <View style={styles.buttonContainer}>
            <Button onPress={() => onNavigate('LOGIN')}>Next</Button>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 0,
  },
  topBranding: {
    width: '100%',
    alignItems: 'center',
    marginTop: height * 0.08,
  },
  brand: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 2,
    opacity: 1,
    fontFamily: 'Helvetica',
  },
  shieldContainer: {
    position: 'absolute',
    top: height * 0.22,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  shieldIcon: {
    // Shield image from assets
  },
  bottomContent: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: 32,
    paddingBottom: 0,
    position: 'absolute',
    bottom: height * 0.10,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#111827',
    textAlign: 'left',
    marginBottom: 12,
    lineHeight: 40,
    fontFamily: 'Helvetica',
  },
  heroDesc: {
    fontSize: 14,
    fontWeight: '300',
    color: '#111827',
    textAlign: 'left',
    marginBottom: 32,
    fontFamily: 'Helvetica',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },

});
