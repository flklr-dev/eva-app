import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
  fullWidth?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = true,
  onPress,
  style,
  disabled = false,
}) => {
  const baseStyle: ViewStyle = {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: '#F1F8E9',
      borderWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    secondary: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#f3f4f6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    text: {
      backgroundColor: 'transparent',
      height: 'auto',
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
  };

  const widthStyle: ViewStyle = fullWidth ? { width: '100%' } : { paddingHorizontal: 32 };

  return (
    <TouchableOpacity
      style={[baseStyle, variantStyles[variant], widthStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.95}
    >
      <Text style={[styles.text, variant === 'text' ? styles.textVariant : styles.buttonText]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  textVariant: {
    fontWeight: '400',
    color: '#6B7280',
  },
});

