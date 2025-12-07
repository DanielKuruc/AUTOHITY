import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Purchase } from '@/constants/types';

export default function EditPurchaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { getPurchaseById, updatePurchase } = usePurchases();

  const purchase = getPurchaseById(id || '');

  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [spz, setSpz] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [customerPrice, setCustomerPrice] = useState('');
  const [offeredPrice, setOfferedPrice] = useState('');
  const [expectedSalePrice, setExpectedSalePrice] = useState('');
  const [isVatPayer, setIsVatPayer] = useState(false);
  const [isCounterAccount, setIsCounterAccount] = useState(false);
  const [vinVerified, setVinVerified] = useState(false);
  const [sourceKnowledge, setSourceKnowledge] = useState('');
  const [notes, setNotes] = useState('');
  const [mileage, setMileage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (purchase) {
      setClientName(purchase.clientName || '');
      setPhone(purchase.phone || '');
      setStreet(purchase.street || '');
      setCity(purchase.city || '');
      setPostalCode(purchase.postalCode || '');
      setSpz(purchase.spz || '');
      setTotalAmount(purchase.totalAmount?.toString() || '');
      setCustomerPrice(purchase.customerPrice?.toString() || '');
      setOfferedPrice(purchase.offeredPrice?.toString() || '');
      setExpectedSalePrice(purchase.expectedSalePrice?.toString() || '');
      setIsVatPayer(purchase.isVatPayer || false);
      setIsCounterAccount(purchase.isCounterAccount || false);
      setVinVerified(purchase.vinVerified || false);
      setSourceKnowledge(purchase.sourceKnowledge || '');
      setNotes(purchase.notes || '');
      setMileage(purchase.carDetails?.mileage?.toString() || '');
    }
  }, [purchase]);

  if (!purchase) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.notFoundTitle, { color: theme.text }]}>Výkup nenalezen</Text>
          <TouchableOpacity 
            style={[styles.backButtonLarge, { backgroundColor: theme.accent }]} 
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonLargeText}>Zpět</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Neuložené změny',
        'Máte neuložené změny. Opravdu chcete odejít?',
        [
          { text: 'Zůstat', style: 'cancel' },
          { text: 'Odejít', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    const updates: Partial<Purchase> = {
      clientName,
      phone,
      street,
      city,
      postalCode,
      spz: spz.toUpperCase(),
      totalAmount: totalAmount ? parseInt(totalAmount, 10) : undefined,
      customerPrice: customerPrice ? parseInt(customerPrice, 10) : undefined,
      offeredPrice: offeredPrice ? parseInt(offeredPrice, 10) : undefined,
      expectedSalePrice: expectedSalePrice ? parseInt(expectedSalePrice, 10) : undefined,
      isVatPayer,
      isCounterAccount,
      vinVerified,
      sourceKnowledge,
      notes,
      carDetails: purchase.carDetails ? {
        ...purchase.carDetails,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
      } : undefined,
    };

    updatePurchase(purchase.id, updates);
    setHasUnsavedChanges(false);
    Alert.alert('Uloženo', 'Změny byly úspěšně uloženy.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const handleChange = (setter: (val: string) => void) => (value: string) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  const handleBoolChange = (setter: (val: boolean) => void) => (value: boolean) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  const renderInput = (
    label: string, 
    value: string, 
    onChange: (val: string) => void,
    options?: { 
      placeholder?: string; 
      keyboardType?: 'default' | 'numeric' | 'phone-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
      multiline?: boolean;
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border },
          options?.multiline && styles.multilineInput
        ]}
        value={value}
        onChangeText={handleChange(onChange)}
        placeholder={options?.placeholder || ''}
        placeholderTextColor={theme.textTertiary}
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize={options?.autoCapitalize || 'sentences'}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 4 : 1}
      />
    </View>
  );

  const renderSwitch = (label: string, value: boolean, onChange: (val: boolean) => void) => (
    <View style={[styles.switchRow, { borderBottomColor: theme.borderLight }]}>
      <Text style={[styles.switchLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={handleBoolChange(onChange)}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.inputBackground }]} onPress={handleBack}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Upravit výkup</Text>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.accent }]} 
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Uložit</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car-sport" size={20} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Vozidlo</Text>
            </View>
            
            {purchase.carDetails && (
              <View style={[styles.vehicleInfo, { backgroundColor: theme.accentLight }]}>
                <Text style={[styles.vehicleName, { color: theme.accent }]}>
                  {purchase.carDetails.make} {purchase.carDetails.model} ({purchase.carDetails.year})
                </Text>
                <Text style={[styles.vehicleVin, { color: theme.textSecondary }]}>
                  VIN: {purchase.carDetails.vin || 'Nezadáno'}
                </Text>
              </View>
            )}

            {renderInput('SPZ', spz, setSpz, { autoCapitalize: 'characters', placeholder: 'BA123AB' })}
            {renderInput('Kilometry', mileage, setMileage, { keyboardType: 'numeric', placeholder: '85000' })}
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Klient</Text>
            </View>

            {renderInput('Jméno klienta', clientName, setClientName, { placeholder: 'Jan Novák' })}
            {renderInput('Telefon', phone, setPhone, { keyboardType: 'phone-pad', placeholder: '+420 777 123 456' })}
            {renderInput('Ulice', street, setStreet, { placeholder: 'Hlavní 15' })}
            {renderInput('Město', city, setCity, { placeholder: 'Praha' })}
            {renderInput('PSČ', postalCode, setPostalCode, { keyboardType: 'numeric', placeholder: '11000' })}
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash" size={20} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Ceny</Text>
            </View>

            {renderInput('Cena výkupu (Kč)', totalAmount, setTotalAmount, { keyboardType: 'numeric', placeholder: '485000' })}
            {renderInput('Cena zákazník (Kč)', customerPrice, setCustomerPrice, { keyboardType: 'numeric', placeholder: '520000' })}
            {renderInput('Cena nabídnuta (Kč)', offeredPrice, setOfferedPrice, { keyboardType: 'numeric', placeholder: '485000' })}
            {renderInput('Předp. cena prodeje (Kč)', expectedSalePrice, setExpectedSalePrice, { keyboardType: 'numeric', placeholder: '549000' })}
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={20} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Nastavení</Text>
            </View>

            {renderSwitch('Plátce DPH', isVatPayer, setIsVatPayer)}
            {renderSwitch('Protiúčet', isCounterAccount, setIsCounterAccount)}
            {renderSwitch('VIN prověřen', vinVerified, setVinVerified)}
            
            {renderInput('Odkud zná', sourceKnowledge, setSourceKnowledge, { placeholder: 'Internet, doporučení...' })}
          </View>

          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Poznámky</Text>
            </View>

            {renderInput('Poznámky', notes, setNotes, { multiline: true, placeholder: 'Zadejte poznámky k výkupu...' })}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  headerButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  saveButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20 
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  content: { flex: 1 },
  notFoundContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  notFoundTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 24 },
  backButtonLarge: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  backButtonLargeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  section: { 
    marginHorizontal: 16, 
    marginTop: 16, 
    borderRadius: 16, 
    padding: 16 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    marginBottom: 16 
  },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  vehicleInfo: { 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 16 
  },
  vehicleName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  vehicleVin: { fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { 
    fontSize: 16, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderRadius: 10, 
    borderWidth: 1 
  },
  multilineInput: { 
    minHeight: 100, 
    textAlignVertical: 'top' 
  },
  switchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  switchLabel: { fontSize: 16 },
  bottomSpacer: { height: 40 },
});
