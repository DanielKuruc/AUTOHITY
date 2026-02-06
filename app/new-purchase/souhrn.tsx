import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Switch,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SelectionPicker } from '@/components/SelectionPicker';

const ODKUD_ZNA = ['---Výběr---', 'Billboardy', 'Doporučení', 'Internet', 'Jiné', 'Rádio', 'Reklama', 'Sociální sítě', 'Vrací se'];

export default function SouhrnScreen() {
  const [formData, setFormData] = useState({
    vin: '',
    vinProveren: false,
    cenaVykupu: '',
    protiucet: false,
    predCenaProdeje: '',
    odkudZna: '---Výběr---',
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    router.push('/new-purchase/foto-vady');
  };

  const handleBack = () => {
    router.back();
  };

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      keyboardType?: 'default' | 'numeric';
      required?: boolean;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {options?.required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder}
        placeholderTextColor="#8E8E93"
        keyboardType={options?.keyboardType || 'default'}
        returnKeyType="done"
      />
    </View>
  );

  const renderPriceField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      required?: boolean;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {options?.required && <Text style={styles.required}>*</Text>}
      </Text>
      <View style={styles.priceInputContainer}>
        <TextInput
          style={styles.priceInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={options?.placeholder || ''}
          placeholderTextColor="#8E8E93"
          keyboardType="numeric"
          returnKeyType="done"
        />
        <View style={styles.currencyContainer}>
          <Ionicons name="chevron-up" size={12} color="#8E8E93" />
          <Ionicons name="chevron-down" size={12} color="#8E8E93" />
        </View>
      </View>
    </View>
  );

  const renderToggleField = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.toggleContainer}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F2F2F7" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Souhrn</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shrnutí vozidla</Text>

          {renderInputField(
            'VIN',
            formData.vin,
            (text) => updateField('vin', text),
            { placeholder: '' }
          )}

          {renderToggleField(
            'VIN prověřen',
            formData.vinProveren,
            (value) => updateField('vinProveren', value)
          )}
          {renderPriceField(
            'Cena výkupu',
            formData.cenaVykupu,
            (text) => updateField('cenaVykupu', text),
            { placeholder: '' }
          )}

          {renderToggleField(
            'Protiúčet',
            formData.protiucet,
            (value) => updateField('protiucet', value)
          )}

          {renderPriceField(
            'Před. cena prodeje',
            formData.predCenaProdeje,
            (text) => updateField('predCenaProdeje', text),
            { placeholder: '' }
          )}

          <SelectionPicker
            label="Odkud zná"
            value={formData.odkudZna}
            options={ODKUD_ZNA}
            onSelect={(value) => updateField('odkudZna', value)}
            placeholder="---Výběr---"
          />
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Další: Foto vady</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  textInput: {
    fontSize: 17,
    color: '#1A1A1A',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  priceInput: {
    fontSize: 17,
    color: '#1A1A1A',
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  currencyContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  toggleLabel: {
    fontSize: 17,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
});