import React, { useState, useEffect } from 'react';
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
import CounterAccountPicker from '@/components/CounterAccountPicker';
import { Base44Car } from '@/services/base44Api';
import {
  VEHICLE_MAKES,
  VEHICLE_MODELS,
} from '@/constants/vehicleOptions';
import { DatePickerField } from '@/components/DatePickerField';
import { getStkIndicator } from '@/services/stkService';
import { usePurchases } from '@/contexts/PurchaseContext';

const MOTOROVA_VARIANTA = ['---Výběr---', '1.0 TSI', '1.4 TFSI', '1.6 TDI', '2.0 TDI', '2.0 TFSI', '3.0 TDI'];
const PREVODOVKA = ['---Výběr---', 'Manuální', 'Automatická', 'CVT', 'DSG'];
const POHON = ['---Výběr---', 'Přední', 'Zadní', '4x4', 'AWD'];
const PALIVO = ['---Výběr---', 'Benzín', 'Nafta', 'Hybrid', 'Elektro', 'LPG', 'CNG'];

export default function AutomobilScreen() {
  const { automobilData } = usePurchases();
  const [formData, setFormData] = useState({
    znacka: '---Výběr---',
    model: '---Výběr---',
    spz: '',
    motorovaVarianta: '---Výběr---',
    km: '',
    stk: '',
    vykon: '',
    barva: '',
    vin: '',
    prevodovka: '---Výběr---',
    palivo: '---Výběr---',
    pohon: '---Výběr---',
    doProvozu: '',
    pocetVlastniku: '',
    pocetProvozovatelu: '',
    dovoz: false,
    prvniMajitel: false,
    servisniKnizka: false,
    cebia: false,
    caVertical: false,
    protiucet: false,
  });

  const [showCounterPicker, setShowCounterPicker] = useState(false);
  const [counterCar, setCounterCar] = useState<Base44Car | null>(null);

  // Initialize formData from context automobilData when it changes
  useEffect(() => {
    if (automobilData) {
      console.log('[AutomobilScreen] Initializing from context:', automobilData);
      setFormData(prev => ({
        ...prev,
        znacka: automobilData.znacka || prev.znacka,
        model: automobilData.model || prev.model,
        spz: automobilData.spz || prev.spz,
        motorovaVarianta: automobilData.motorovaVarianta || prev.motorovaVarianta,
        km: automobilData.km || prev.km,
        stk: automobilData.stk || prev.stk,
        vykon: automobilData.vykon || prev.vykon,
        barva: automobilData.barva || prev.barva,
        vin: automobilData.vin || prev.vin,
        prevodovka: automobilData.prevodovka || prev.prevodovka,
        palivo: automobilData.palivo || prev.palivo,
        pohon: automobilData.pohon || prev.pohon,
        doProvozu: automobilData.doProvozu || prev.doProvozu,
        pocetVlastniku: automobilData.pocetVlastniku || prev.pocetVlastniku,
        pocetProvozovatelu: automobilData.pocetProvozovatelu || prev.pocetProvozovatelu,
        dovoz: automobilData.dovoz || prev.dovoz,
        prvniMajitel: automobilData.prvniMajitel || prev.prvniMajitel,
        servisniKnizka: automobilData.servisniKnizka || prev.servisniKnizka,
        cebia: automobilData.cebia || prev.cebia,
        caVertical: automobilData.caVertical || prev.caVertical,
        protiucet: automobilData.protiucet || prev.protiucet,
      }));
    }
  }, [automobilData]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Auto-set "První majitel" when "Počet vlastníků" = 1
      if (field === 'pocetVlastniku') {
        const num = parseInt(value as string);
        if (!isNaN(num) && num === 1) {
          newData.prvniMajitel = true;
        }
      }
      return newData;
    });
    if (field === 'protiucet') {
      const enabled = Boolean(value);
      if (enabled) setShowCounterPicker(true);
      if (!enabled) setCounterCar(null);
    }
  };

  const handleNext = () => {
    router.push('/new-purchase/stav-soucasti');
  };

  const handleBack = () => {
    router.back();
  };

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

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      keyboardType?: 'default' | 'numeric';
      required?: boolean;
      showWarning?: boolean;
      showStkIndicator?: boolean;
    }
  ) => {
    const numValue = parseInt(value);
    const showWarning = options?.showWarning && !isNaN(numValue) && numValue >= 4;
    const isEmpty = !value || value.trim() === '';
    const borderColor = isEmpty ? '#E30613' : '#E5E5E7';

    const stkIndicator = options?.showStkIndicator ? getStkIndicator(value) : null;

    return (
      <View style={styles.inputContainer}>
        <View style={styles.labelContainer}>
          <Text style={styles.inputLabel}>
            {label} {options?.required && <Text style={styles.required}>*</Text>}
          </Text>
          {stkIndicator && (
            <Ionicons 
              name={stkIndicator.icon} 
              size={20} 
              color={stkIndicator.color} 
            />
          )}
        </View>
        <TextInput
          style={[styles.textInput, { borderColor }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={options?.placeholder}
          placeholderTextColor="#8E8E93"
          keyboardType={options?.keyboardType || 'default'}
          returnKeyType="done"
        />
        {showWarning && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={14} color="#FF9500" />
            <Text style={styles.warningText}>Vozidlo s více vlastníky/provozovateli</Text>
          </View>
        )}
      </View>
    );
  };

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
            error={formData.znacka === '---Výběr---'}
          />
          <SelectionPicker
            label="Model"
            value={formData.model}
            options={getAvailableModels()}
            onSelect={(value) => updateField('model', value)}
            placeholder="---Výběr---"
            error={formData.model === '---Výběr---'}
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
            error={formData.motorovaVarianta === '---Výběr---'}
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
            { placeholder: 'dd.mm.yyyy', showStkIndicator: true }
          )}

          {renderInputField(
            'Výkon (kW)',
            formData.vykon,
            (text) => updateField('vykon', text),
            { placeholder: '', keyboardType: 'numeric' }
          )}

          {renderInputField(
            'Barva',
            formData.barva,
            (text) => updateField('barva', text),
            { placeholder: '' }
          )}

          {renderInputField(
            'VIN',
            formData.vin,
            (text) => updateField('vin', text),
            { placeholder: '' }
          )}

          <SelectionPicker
            label="Převodovka"
            value={formData.prevodovka}
            options={PREVODOVKA}
            onSelect={(value) => updateField('prevodovka', value)}
            placeholder="---Výběr---"
            error={formData.prevodovka === '---Výběr---'}
          />

          <SelectionPicker
            label="Palivo"
            value={formData.palivo}
            options={PALIVO}
            onSelect={(value) => updateField('palivo', value)}
            placeholder="---Výběr---"
            error={formData.palivo === '---Výběr---'}
          />

          <SelectionPicker
            label="Pohon"
            value={formData.pohon}
            options={POHON}
            onSelect={(value) => updateField('pohon', value)}
            placeholder="---Výběr---"
            error={formData.pohon === '---Výběr---'}
          />

          {renderInputField(
            'Do provozu',
            formData.doProvozu,
            (text) => updateField('doProvozu', text),
            { placeholder: 'dd.mm.yyyy' }
          )}

          {renderInputField(
            'Počet vlastníků',
            formData.pocetVlastniku,
            (text) => updateField('pocetVlastniku', text),
            { placeholder: '', keyboardType: 'numeric', showWarning: true }
          )}

          {renderInputField(
            'Počet provozovatelů',
            formData.pocetProvozovatelu,
            (text) => updateField('pocetProvozovatelu', text),
            { placeholder: '', keyboardType: 'numeric', showWarning: true }
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
            'Protiúčet',
            formData.protiucet,
            (value) => updateField('protiucet', value)
          )}

          <Text style={styles.vinSectionTitle}>VIN prověřeno</Text>

          {renderToggleField(
            'Cebia',
            formData.cebia,
            (value) => updateField('cebia', value)
          )}

          {renderToggleField(
            'CaVertical',
            formData.caVertical,
            (value) => updateField('caVertical', value)
          )}

          {counterCar && (
            <View style={{ marginTop: 12, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E5E7', borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Vybraný protiúčet</Text>
              <Text style={{ fontSize: 15 }}>{counterCar.make} {counterCar.model}</Text>
              {!!counterCar.variant && <Text style={{ color: '#6B7280', marginTop: 2 }}>{counterCar.variant}</Text>}
              {!!counterCar.price && <Text style={{ marginTop: 4 }}>{counterCar.price.toLocaleString('cs-CZ')} Kč</Text>}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity onPress={() => setShowCounterPicker(true)} style={{ backgroundColor: '#e30613', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Změnit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setCounterCar(null); updateField('protiucet', false); }} style={{ backgroundColor: '#F8F8F8', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E7' }}>
                  <Text style={{ fontWeight: '600' }}>Odebrat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Další: Stav součástí</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <CounterAccountPicker
        visible={showCounterPicker}
        onClose={() => setShowCounterPicker(false)}
        onSelect={(car) => { setCounterCar(car); updateField('protiucet', true); }}
      />
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
  vinSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '500',
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