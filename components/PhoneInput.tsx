import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

const COUNTRY_CODES = [
  { code: '+420', country: 'CZ', flag: '🇨🇿', name: 'Česká republika' },
  { code: '+421', country: 'SK', flag: '🇸🇰', name: 'Slovensko' },
  { code: '+43', country: 'AT', flag: '🇦🇹', name: 'Rakousko' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Německo' },
  { code: '+48', country: 'PL', flag: '🇵🇱', name: 'Polsko' },
  { code: '+36', country: 'HU', flag: '🇭🇺', name: 'Maďarsko' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Nizozemsko' },
  { code: '+32', country: 'BE', flag: '🇧🇪', name: 'Belgie' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'Francie' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Itálie' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'Velká Británie' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Španělsko' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Švýcarsko' },
  { code: '+380', country: 'UA', flag: '🇺🇦', name: 'Ukrajina' },
  { code: '+40', country: 'RO', flag: '🇷🇴', name: 'Rumunsko' },
];

interface PhoneInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: boolean;
}

export function PhoneInput({ label, value, onChangeText, placeholder, error = false }: PhoneInputProps) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  
  // Parse current value to extract prefix and number
  const parsePhone = (phone: string) => {
    for (const country of COUNTRY_CODES) {
      if (phone.startsWith(country.code)) {
        return {
          prefix: country,
          number: phone.slice(country.code.length).trim(),
        };
      }
    }
    // Default to Czech
    return {
      prefix: COUNTRY_CODES[0],
      number: phone.replace(/^\+\d+\s*/, ''),
    };
  };

  const { prefix, number } = parsePhone(value);
  const isEmpty = !value || value.trim() === '' || value === prefix.code;
  const borderColor = isEmpty ? '#E30613' : (error ? '#FF3B30' : theme.border);

  const handlePrefixSelect = (country: typeof COUNTRY_CODES[0]) => {
    const newValue = number ? `${country.code} ${number}` : country.code;
    onChangeText(newValue);
    setShowPicker(false);
  };

  const handleNumberChange = (text: string) => {
    // Remove any non-numeric characters except spaces
    const cleanNumber = text.replace(/[^\d\s]/g, '');
    const newValue = cleanNumber ? `${prefix.code} ${cleanNumber}` : prefix.code;
    onChangeText(newValue);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderColor }]}>
        {/* Prefix selector */}
        <TouchableOpacity 
          style={[styles.prefixButton, { borderRightColor: theme.border }]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.flag}>{prefix.flag}</Text>
          <Text style={[styles.prefixCode, { color: theme.text }]}>{prefix.code}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textTertiary} />
        </TouchableOpacity>

        {/* Phone number input */}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={number}
          onChangeText={handleNumberChange}
          placeholder={placeholder || 'xxx xxx xxx'}
          placeholderTextColor={theme.textTertiary}
          keyboardType="phone-pad"
          returnKeyType="done"
        />
      </View>

      {/* Country picker modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Vyberte předvolbu</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    { borderBottomColor: theme.borderLight },
                    item.code === prefix.code && { backgroundColor: theme.accentLight }
                  ]}
                  onPress={() => handlePrefixSelect(item)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={[styles.countryName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.countryCode, { color: theme.textSecondary }]}>{item.code}</Text>
                  </View>
                  {item.code === prefix.code && (
                    <Ionicons name="checkmark" size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.countryList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prefixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    gap: 6,
  },
  flag: {
    fontSize: 18,
  },
  prefixCode: {
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  countryCode: {
    fontSize: 13,
    marginTop: 2,
  },
});