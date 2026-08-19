import React, { useState, useRef, useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VinScanner } from './VinScanner';
import { PhoneInput } from './PhoneInput';
import ClientHistoryModal from './ClientHistoryModal';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  fetchVehicleDataByVin, 
  validateVin, 
  hasApiKey,
  VehicleDataResponse 
} from '@/services/vehicleDataApi';
import {
  fetchCompanyByIco,
  validateIco,
  AresCompanyData,
} from '@/services/aresApi';

interface NewPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreatePurchase: (data: PurchaseInitData) => void;
  onCreateEmpty: () => void;
}

export interface PurchaseInitData {
  vin: string;
  vehicleData?: VehicleDataResponse;
  firstName: string;
  lastName: string;
  isCompany: boolean;
  companyName?: string;
  ico?: string;
  companyData?: AresCompanyData;
  phone?: string;
  clientId?: number; // ✅ ADDED: clientId from history
}

export function NewPurchaseModal({ 
  visible, 
  onClose, 
  onCreatePurchase,
  onCreateEmpty 
}: NewPurchaseModalProps) {
  const { theme } = useTheme();
  const [vin, setVin] = useState('');
  const [registered, setRegistered] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [ico, setIco] = useState('');
  const [phone, setPhone] = useState('');
  const [vinLoading, setVinLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  // ✅ Animation for registered toggle
  const fadeAnim = useSharedValue(1);
  const fadeAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
    };
  });
  const [icoLoading, setIcoLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleDataResponse | null>(null);
  const [companyData, setCompanyData] = useState<AresCompanyData | null>(null);
  const [vinError, setVinError] = useState('');
  const [icoError, setIcoError] = useState('');
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [isAutoFetchingVin, setIsAutoFetchingVin] = useState(false);
  const [isAutoFetchingIco, setIsAutoFetchingIco] = useState(false);
  const [showClientHistoryModal, setShowClientHistoryModal] = useState<'company' | 'person' | null>(null);
  // Use Ref instead of State for skipAutoFetch to avoid timing issues
  const skipAutoFetchRef = useRef(false);

  // ✅ EFFECT: Animate when registered toggle changes
  useEffect(() => {
    fadeAnim.value = withTiming(registered ? 1 : 0, { duration: 300 });
  }, [registered, fadeAnim]);

  const resetForm = () => {
    setVin('');
    setRegistered(true);
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setIsCompany(false);
    setIco('');
    setPhone('');
    setVehicleData(null);
    setCompanyData(null);
    setVinError('');
    setIcoError('');
    setShowClientHistoryModal(null);
    setSelectedClientId(null);
  };

  const handleClientSelect = (client: any) => {
    // DEBUG: Log client data
    console.log('NewPurchaseModal - Selected client:', {
      id: client.id, // ✅ Log clientId
      company_name: client.company_name,
      ico: client.ico,
      dic: client.dic,
      phone: client.phone,
      street: client.street,
      city: client.city,
      postal_code: client.postal_code,
    });

    // Set ref flag IMMEDIATELY (synchronous) - this prevents race conditions
    skipAutoFetchRef.current = true;

    // ✅ SAVE clientId from history
    setSelectedClientId(Number(client.id));

    if (isCompany) {
      setCompanyName(client.company_name || '');
      setIco(client.ico || '');
      setPhone(client.phone || '');
      setCompanyData({
        nazev: client.company_name || '',
        ico: client.ico || '',
        dic: client.dic || '',
        ulice: client.street || '', // ✅ Ulice zvlášť
        mesto: client.city || '', // ✅ Město zvlášť
        adresa: `${client.street || ''} ${client.city || ''}`.trim() || '',
        psc: client.postal_code || '',
        platceDPH: false,
      } as AresCompanyData);
      console.log('NewPurchaseModal - Set company data:', {
        nazev: client.company_name,
        dic: client.dic,
        ulice: client.street,
        mesto: client.city,
      });
    } else {
      setFirstName(client.first_name || '');
      setLastName(client.last_name || '');
      setPhone(client.phone || '');
    }
    setShowClientHistoryModal(null);

    // Reset flag after 100ms to allow manual fetch again
    setTimeout(() => {
      skipAutoFetchRef.current = false;
    }, 100);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // VIN lze předat parametrem - po skenu ho ještě nemusí mít stav propsaný
  const handleFetchVin = async (vinOverride?: string) => {
    const vinValue = vinOverride ?? vin;
    const validation = validateVin(vinValue);
    if (!validation.valid) {
      setVinError(validation.message || 'Neplatný VIN');
      return;
    }

    if (!hasApiKey()) {
      setVinError('API klíč není nastaven. Kontaktujte administrátora.');
      return;
    }

    setVinLoading(true);
    setVinError('');
    try {
      const data = await fetchVehicleDataByVin(vinValue);
      setVehicleData(data);
    } catch (error: any) {
      let errorMessage = error.message || 'Nepodařilo se načíst data';
      if (errorMessage.includes('Load failed') || errorMessage.includes('Network request failed')) {
        errorMessage = 'API není dostupné z webové verze. Použijte mobilní aplikaci.';
      }
      setVinError(errorMessage);
      setVehicleData(null);
    } finally {
      setVinLoading(false);
    }
  };

  const handleFetchIco = async () => {
    const validation = validateIco(ico);
    if (!validation.valid) {
      setIcoError(validation.message || 'Neplatné IČO');
      return;
    }

    setIcoLoading(true);
    setIcoError('');
    try {
      const data = await fetchCompanyByIco(ico);
      setCompanyData(data);
      if (data.nazev) {
        setCompanyName(data.nazev);
      }
    } catch (error: any) {
      setIcoError(error.message || 'Nepodařilo se načíst data');
      setCompanyData(null);
    } finally {
      setIcoLoading(false);
    }
  };

  const handleFetchVin_auto = async (vinValue: string) => {
    const validation = validateVin(vinValue);
    if (!validation.valid) return;

    setIsAutoFetchingVin(true);
    try {
      const data = await fetchVehicleDataByVin(vinValue);
      setVehicleData(data);
    } catch (error: any) {
      // Silently fail on auto-fetch
    } finally {
      setIsAutoFetchingVin(false);
    }
  };

  const isFormValid = () => {
    if (vin.length !== 17) return false;
    if (isCompany) {
      const hasCompanyInfo = companyName.trim() || (companyData && companyData.nazev);
      if (!hasCompanyInfo) return false;
      if (!ico.trim()) return false;
    } else {
      if (!firstName.trim()) return false;
      if (!lastName.trim()) return false;
    }
    return true;
  };

  const handleCreate = () => {
    if (!isFormValid()) return;
    const finalCompanyName = companyName.trim() || (companyData?.nazev || '');

    onCreatePurchase({
      vin,
      vehicleData: vehicleData || undefined,
      firstName: isCompany ? '' : firstName,
      lastName: isCompany ? '' : lastName,
      isCompany,
      companyName: isCompany ? finalCompanyName : undefined,
      ico: isCompany ? ico : undefined,
      companyData: isCompany ? (companyData || undefined) : undefined,
      phone: phone || undefined,
      clientId: selectedClientId || undefined, // ✅ SEND clientId if was selected from history
    });
    resetForm();
    setSelectedClientId(null); // ✅ Reset clientId after submission
  };

  const handleCreateEmpty = () => {
    onCreateEmpty();
    resetForm();
  };

  const handleVinDetected = (detectedVin: string) => {
    setVin(detectedVin);
    setVinError('');
    setVehicleData(null);
    setShowVinScanner(false);
    if (detectedVin.length === 17) {
      // VIN předáváme přímo - spoléhat na stav by znamenalo číst starou hodnotu
      handleFetchVin(detectedVin);
    }
  };

  // Auto-fetch ICO when complete
  React.useEffect(() => {
    // Check ref synchronously - skip if just selected from modal
    if (skipAutoFetchRef.current) {
      return;
    }

    const numericIco = ico.replace(/\D/g, '');

    if (numericIco.length === 8) {
      const validateAndFetch = async () => {
        const validation = validateIco(numericIco);
        if (!validation.valid) return;

        setIsAutoFetchingIco(true);
        try {
          const data = await fetchCompanyByIco(numericIco);
          setCompanyData(data);
          if (data.nazev) {
            setCompanyName(data.nazev);
          }
        } catch (error: any) {
          // Silently fail
        } finally {
          setIsAutoFetchingIco(false);
        }
      };
      validateAndFetch();
    } else {
      // Clear company data when ICO is incomplete
      setCompanyData(null);
    }
  }, [ico]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Nový výkup</Text>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.inputBackground }]} onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Registrováno Toggle - NAD VIN */}
            <View style={[styles.toggleSection, { borderBottomColor: theme.border }]}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>Registrováno</Text>
              <Switch
                value={registered}
                onValueChange={setRegistered}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* VIN Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>VIN *</Text>
              <View style={styles.vinRow}>
                <TextInput
                  style={[styles.vinInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: !vin.trim() ? '#FF3B30' : theme.border }, (!vin.trim() || vinError) && styles.inputError]}
                  value={vin}
                  onChangeText={(text) => {
                    const upperText = text.toUpperCase();
                    setVin(upperText);
                    setVinError('');
                    setVehicleData(null);
                    if (upperText.length === 17 && hasApiKey()) {
                      setTimeout(() => handleFetchVin_auto(upperText), 300);
                    }
                  }}
                  placeholder="Zadejte 17-místný VIN"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                  maxLength={17}
                />
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: theme.accent }, (isAutoFetchingVin) && styles.vinButtonDisabled]}
                  onPress={() => setShowVinScanner(true)}
                  disabled={isAutoFetchingVin}
                >
                  {isAutoFetchingVin ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="scan" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.vinButton,
                    { backgroundColor: theme.accent },
                    (vinLoading || vin.length < 17) && styles.vinButtonDisabled
                  ]}
                  onPress={() => handleFetchVin()}
                  disabled={vinLoading || vin.length < 17}
                >
                  {vinLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              {vinError ? (
                <Text style={[styles.errorText, { color: '#FF3B30' }]}>{vinError}</Text>
              ) : null}
              {vehicleData && (
                <View style={[styles.vehicleInfo, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={[styles.vehicleInfoText, { color: '#2E7D32' }]}>
                    {vehicleData.znacka} {vehicleData.model} ({vehicleData.rokVyroby})
                  </Text>
                </View>
              )}
            </View>

            {/* Client Type Toggle */}
            <View style={[styles.toggleSection, { borderBottomColor: theme.border }]}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>
                {isCompany ? 'Firma' : 'Soukromá osoba'}
              </Text>
              <Switch
                value={isCompany}
                onValueChange={(value) => {
                  setIsCompany(value);
                  setIcoError('');
                  setCompanyData(null);
                }}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Client Name Fields */}
            {isCompany ? (
              <>
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.text }]}>Název firmy *</Text>
                  <View style={styles.vinRow}>
                    <TextInput
                      style={[styles.vinInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: !companyName.trim() ? '#FF3B30' : theme.border }, !companyName.trim() && styles.inputError]}
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="Zadejte název firmy"
                      placeholderTextColor={theme.textTertiary}
                    />
                    <TouchableOpacity 
                      style={[styles.vinButton, { backgroundColor: theme.accent }]}
                      onPress={() => setShowClientHistoryModal('company')}
                    >
                      <Ionicons name="list" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* IČO (only for company) */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.text }]}>IČO *</Text>
                  <View style={styles.vinRow}>
                    <TextInput
                      style={[styles.vinInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: !ico.trim() ? '#FF3B30' : theme.border }, !ico.trim() && styles.inputError, icoError && styles.inputError]}
                      value={ico}
                      onChangeText={(text) => {
                        const numericText = text.replace(/\D/g, '');
                        setIco(numericText);
                        setIcoError('');
                      }}
                      placeholder="Zadejte 8-místné IČO"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="numeric"
                      maxLength={8}
                    />
                    <TouchableOpacity
                      style={[
                        styles.vinButton,
                        styles.icoButton,
                        (icoLoading || ico.length < 8) && styles.vinButtonDisabled,
                        { backgroundColor: theme.accent }
                      ]}
                      onPress={handleFetchIco}
                      disabled={icoLoading || ico.length < 8}
                    >
                      {icoLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="search" size={20} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {icoError ? (
                    <Text style={[styles.errorText, { color: '#FF3B30' }]}>{icoError}</Text>
                  ) : null}
                  {companyData && (
                    <View style={[styles.companyInfo, { backgroundColor: '#EEF2FF', borderLeftColor: '#5856D6' }]}>
                      <View style={styles.companyInfoHeader}>
                        <Ionicons name="business" size={16} color="#5856D6" />
                        <Text style={[styles.companyInfoTitle, { color: theme.text }]}>{companyData.nazev}</Text>
                      </View>
                      {companyData.adresa && (
                        <Text style={[styles.companyInfoText, { color: theme.textSecondary }]}>
                          {companyData.adresa}
                        </Text>
                      )}
                      {companyData.dic && (
                        <Text style={[styles.companyInfoText, { color: theme.textSecondary }]}>
                          DIČ: {companyData.dic}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.text }]}>Jméno *</Text>
                  <View style={styles.vinRow}>
                    <TextInput
                      style={[styles.vinInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: !firstName.trim() ? '#FF3B30' : theme.border }, !firstName.trim() && styles.inputError]}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Zadejte jméno"
                      placeholderTextColor={theme.textTertiary}
                    />
                    <TouchableOpacity 
                      style={[styles.vinButton, { backgroundColor: theme.accent }]}
                      onPress={() => setShowClientHistoryModal('person')}
                    >
                      <Ionicons name="list" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.text }]}>Příjmení *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: !lastName.trim() ? '#FF3B30' : theme.border }, !lastName.trim() && styles.inputError]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Zadejte příjmení"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </>
            )}

            {/* Phone Input - FOR BOTH COMPANY AND PERSON */}
            <View style={styles.section}>
              <PhoneInput
                label="Telefonní číslo"
                value={phone}
                onChangeText={setPhone}
                placeholder="+420 600 123 456"
              />
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: '#34C759' }, (!isFormValid() || isAutoFetchingVin || isAutoFetchingIco) && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!isFormValid() || isAutoFetchingVin || isAutoFetchingIco}
            >
              {isAutoFetchingVin || isAutoFetchingIco ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Načítám data...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Založit výkup</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateEmpty}>
              <Text style={[styles.emptyButtonText, { color: theme.textSecondary }]}>Vytvořit prázdný výkup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* VIN Scanner Modal */}
      <VinScanner
        visible={showVinScanner}
        onClose={() => setShowVinScanner(false)}
        onVinDetected={handleVinDetected}
      />

      {/* Client History Modal */}
      <ClientHistoryModal
        visible={showClientHistoryModal !== null}
        type={showClientHistoryModal || 'person'}
        onSelect={handleClientSelect}
        onClose={() => setShowClientHistoryModal(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  vinRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vinInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  vinButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icoButton: {},
  vinButtonDisabled: {
    opacity: 0.5,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  vehicleInfoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  companyInfo: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  companyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  companyInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  companyInfoText: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    gap: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});