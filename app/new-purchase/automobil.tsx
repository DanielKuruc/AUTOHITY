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
import {
  VEHICLE_MAKES,
  VEHICLE_MODELS,
} from '@/constants/vehicleOptions';

const MOTOROVA_VARIANTA = ['---Výběr---', '1.0 TSI', '1.4 TFSI', '1.6 TDI', '2.0 TDI', '2.0 TFSI', '3.0 TDI'];
const PREVODOVKA = ['---Výběr---', 'Manuální', 'Automatická', 'CVT', 'DSG'];
const KAROSERIE = ['---Výběr---', 'Sedan', 'Hatchback', 'Kombi', 'SUV', 'Coupe', 'Cabrio'];
const POHON = ['---Výběr---', 'Přední', 'Zadní', '4x4', 'AWD'];

export default function AutomobilScreen() {
  const [formData, setFormData] = useState({
    znacka: '---Výběr---',
    model: '---Výběr---',
    spz: '',
    motorovaVarianta: '---Výběr---',
    km: '',
    stk: '18.09.2025',
    vykon: '',
    prevodovka: '---Výběr---',
    karoserie: '---Výběr---',
    pohon: '---Výběr---',
    kolaAI: false,
    doProvozu: '18.09.2025',
    dovoz: false,
    prvniMajitel: false,
    servisniKnizka: false,
    bezpecnostniSrouby: false,
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    router.push('/new-purchase/stav-soucasti');
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

  const getAvailableModels = () => {
    if (!formData.znacka || formData.znacka === '---Výběr---') return ['---Výběr---'];
    const models = VEHICLE_MODELS[formData.znacka] || [];
    return ['---Výběr---', ...models];
  };

  const handleMakeChange = (znacka: string) => {
    updateField('znacka', znacka);
    if (znacka === '---Výběr---') {
      updateField('model', '---Výběr---');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F2F2F7" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Automobil</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informace o vozidle</Text>

          <SelectionPicker
            label="Značka"
            value={formData.znacka}
            options={['---Výběr---', ...VEHICLE_MAKES]}
            onSelect={handleMakeChange}
            placeholder="---Výběr---"
          />
          <SelectionPicker
            label="Model"
            value={formData.model}
            options={getAvailableModels()}
            onSelect={(value) => updateField('model', value)}
            placeholder="---Výběr---"
          />

          {renderInputField(
            'SPZ', 
            formData.spz, 
            (text) => updateField('spz', text),
            { placeholder: '' }
          )}

          <SelectionPicker
            label="Motorová varianta"
            value={formData.motorovaVarianta}
            options={MOTOROVA_VARIANTA}
            onSelect={(value) => updateField('motorovaVarianta', value)}
            placeholder="---Výběr---"
          />

          {renderInputField(
            'Km', 
            formData.km, 
            (text) => updateField('km', text),
            { placeholder: '', keyboardType: 'numeric' }
          )}

          {renderInputField(
            'STK', 
            formData.stk, 
            (text) => updateField('stk', text),
            { placeholder: '18.09.2025' }
          )}

          {renderInputField(
            'Výkon (kW)', 
            formData.vykon, 
            (text) => updateField('vykon', text),
            { placeholder: '', keyboardType: 'numeric' }
          )}

          <SelectionPicker
            label="Převodovka"
            value={formData.prevodovka}
            options={PREVODOVKA}
            onSelect={(value) => updateField('prevodovka', value)}
            placeholder="---Výběr---"
          />

          <SelectionPicker
            label="Karoserie"
            value={formData.karoserie}
            options={KAROSERIE}
            onSelect={(value) => updateField('karoserie', value)}
            placeholder="---Výběr---"
          />

          <SelectionPicker
            label="Pohon"
            value={formData.pohon}
            options={POHON}
            onSelect={(value) => updateField('pohon', value)}
            placeholder="---Výběr---"
          />

          {renderToggleField(
            'Kola AI',
            formData.kolaAI,
            (value) => updateField('kolaAI', value)
          )}

          {renderInputField(
            'Do provozu', 
            formData.doProvozu, 
            (text) => updateField('doProvozu', text),
            { placeholder: '18.09.2025' }
          )}

          {renderToggleField(
            'Dovoz',
            formData.dovoz,
            (value) => updateField('dovoz', value)
          )}

          {renderToggleField(
            'První majitel',
            formData.prvniMajitel,
            (value) => updateField('prvniMajitel', value)
          )}

          {renderToggleField(
            'Servisní knížka',
            formData.servisniKnizka,
            (value) => updateField('servisniKnizka', value)
          )}

          {renderToggleField(
            'Bezpečnostní šrouby',
            formData.bezpecnostniSrouby,
            (value) => updateField('bezpecnostniSrouby', value)
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Další: Stav součástí</Text>
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