import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SpzInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/**
 * Formats Czech license plate (SPZ)
 * Standard format: 1A2 3456 (region code + space + numbers)
 * Older format: ABC 12-34
 */
export const formatSpz = (input: string): string => {
  // Remove all non-alphanumeric characters and convert to uppercase
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (cleaned.length <= 3) {
    return cleaned;
  }
  
  // Insert space after first 3 characters (region code)
  const regionCode = cleaned.slice(0, 3);
  const rest = cleaned.slice(3, 7); // Max 4 more characters
  
  return `${regionCode} ${rest}`.trim();
};

/**
 * Validates Czech SPZ format
 * Returns true if valid, false otherwise
 */
export const validateSpz = (spz: string): boolean => {
  // Remove spaces and check
  const cleaned = spz.replace(/\s/g, '').toUpperCase();
  
  // Czech SPZ: 3 characters (1 number + 1 letter + 1 number) + 4 numbers
  // Example: 1A2 3456
  // Or older format with letters
  
  // Minimum 5 characters, maximum 7
  if (cleaned.length < 5 || cleaned.length > 7) {
    return false;
  }
  
  // Must contain at least one letter and one number
  const hasLetter = /[A-Z]/.test(cleaned);
  const hasNumber = /[0-9]/.test(cleaned);
  
  return hasLetter && hasNumber;
};

export function SpzInput({ label, value, onChangeText, placeholder }: SpzInputProps) {
  const { theme } = useTheme();

  const handleChange = (text: string) => {
    const formatted = formatSpz(text);
    onChangeText(formatted);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      )}
      <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder || '1A2 3456'}
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8} // 7 chars + 1 space
          returnKeyType="done"
        />
        <View style={[styles.flagBadge, { backgroundColor: '#003399' }]}>
          <Text style={styles.flagText}>CZ</Text>
          <Text style={styles.euStars}>🇪🇺</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Display-only formatted SPZ with Czech flag badge
 */
export function formatSpzDisplay(spz?: string): string | null {
  if (!spz) return null;
  return formatSpz(spz);
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  flagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  flagText: {
    color: '#FFCC00',
    fontSize: 11,
    fontWeight: '700',
  },
  euStars: {
    fontSize: 10,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'monospace',
    paddingHorizontal: 16,
    paddingVertical: 14,
    letterSpacing: 2,
  },
});
