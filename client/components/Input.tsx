import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Platform, useWindowDimensions } from 'react-native';

interface InputProps extends TextInputProps {
  error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(({ error, style, ...rest }, ref) => (
  <ResponsiveInput ref={ref} error={error} style={style} {...rest} />
));

Input.displayName = 'Input';

const ResponsiveInput = React.forwardRef<TextInput, InputProps>(({ error, style, ...rest }, ref) => {
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isMedium = width < 400;

  const dynamicInput = {
    height: isSmall ? 52 : isMedium ? 56 : 58,
    paddingHorizontal: isSmall ? 24 : 32,
    borderRadius: isSmall ? 26 : 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 1,
        shadowColor: 'transparent',
      },
      default: {},
    }),
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={ref}
        style={[styles.input, dynamicInput, !!error && styles.inputError, style]}
        placeholderTextColor="#b4bbc5"
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

ResponsiveInput.displayName = 'ResponsiveInput';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 4,
    maxWidth: 320,
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    height: 58,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#AAB0B7',
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 32,
    paddingVertical: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    paddingLeft: 32,
    paddingTop: 4,
  },
});
