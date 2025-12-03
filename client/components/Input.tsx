import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  error?: string;
}

export const Input: React.FC<InputProps> = ({ error, style, ...rest }) => (
  <View style={styles.container}>
    <TextInput
      style={[styles.input, !!error && styles.inputError, style]}
      placeholderTextColor="#b4bbc5"
      {...rest}
    />
    {!!error && (
      <Text style={styles.error}>{error}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
    maxWidth: 320,
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    height: 58,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
