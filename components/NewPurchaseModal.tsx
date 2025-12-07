import React, { useState } from 'react';
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
}

export function NewPurchaseModal({ 
  visible, 
  onClose, 
  onCreatePurchase,
  onCreateEmpty 
}: NewPurchaseModalProps) {
  const { theme } = useTheme();
  const [vin, setVin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [ico, setIco] = useState('');
  const [vinLoading, setVinLoading] = useState(false);
  const [icoLoading, setIcoLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleDataResponse | null>(null);
  const [companyData, setCompanyData] = useState<AresCompanyData | null>(null);
  const [vinError, setVinError] = useState('');
  const [icoError, setIcoError] = useState('');
  const [showVinScanner, setShowVinScanner] = useState(false);

  const resetForm = () => {
    setVin('');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setIsCompany(false);
    setIco('');
    setVehicleData(null);
    setCompanyData(null);
    setVinError('');
    setIcoError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFetchVin = async () => {
    const validation = validateVin(vin);
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
      console.log('[NewPurchaseModal] Načítám VIN:', vin);
      const data = await fetchVehicleDataByVin(vin);
      setVehicleData(data);
      console.log('[NewPurchaseModal] Načtená data:', data);
    } catch (error: any) {
      console.error('[NewPurchaseModal] Chyba při načítání VIN:', error);

      // Zobrazit uživatelsky přívětivou chybovou hlášku
      let errorMessage = error.message || 'Nepodařilo se načíst data';

      // Pokud je to CORS/síťová chyba na webu
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
      // Automaticky vyplnit název firmy
      if (data.nazev) {
        setCompanyName(data.nazev);
      }
      console.log('[NewPurchaseModal] ARES data:', data);
    } catch (error: any) {
      setIcoError(error.message || 'Nepodařilo se načíst data');
      setCompanyData(null);
    } finally {
      setIcoLoading(false);
    }
  };
  const isFormValid = () => {
    if (vin.length !== 17) return false;
    if (isCompany) {
      if (!companyName.trim()) return false;
      if (!ico.trim()) return false;
      if (icoError) return false;
    } else {
      if (!firstName.trim()) return false;
      if (!lastName.trim()) return false;
    }
    if (vinError) return false;
    return true;
  };

  const handleCreate = () => {
    if (!isFormValid()) return;
    onCreatePurchase({
      vin,
      vehicleData: vehicleData || undefined,
      firstName: isCompany ? '' : firstName,
      lastName: isCompany ? '' : lastName,
      isCompany,
      companyName: isCompany ? companyName : undefined,
      ico: isCompany ? ico : undefined,
      companyData: isCompany ? (companyData || undefined) : undefined,
    });
    resetForm();
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
    // Automaticky načíst data po skenování
    if (detectedVin.length === 17) {
      setTimeout(() => handleFetchVin(), 100);
    }
  };

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
            {/* VIN Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>VIN *</Text>
              <View style={styles.vinRow}>
                <TextInput
                  style={[styles.vinInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }, vinError && styles.inputError]}
                  value={vin}
                  onChangeText={(text) => {
                    setVin(text.toUpperCase());
                    setVinError('');
                    setVehicleData(null);
                  }}
                  placeholder="Zadejte 17-místný VIN"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                  maxLength={17}
                />
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: theme.accent }]}
                  onPress={() => setShowVinScanner(true)}
                >
                  <Ionicons name="scan" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.vinButton,
                    { backgroundColor: theme.accent },
                    (vinLoading || vin.length < 17) && styles.vinButtonDisabled
                  ]}
                  onPress={handleFetchVin}
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
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Zadejte název firmy"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                {/* IČO (only for company) */}
                {isCompany && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.text }]}>IČO *</Text>
                    <View style={styles.vinRow}>
                      <TextInput
                        style={[styles.vinInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }, icoError && styles.inputError]}
                        value={ico}
                        onChangeText={(text) => {
                          setIco(text.replace(/\D/g, ''));
                          setIcoError('');
                          setCompanyData(null);
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
                )}
              </>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.text }]}>Jméno *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Zadejte jméno"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.text }]}>Příjmení *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Zadejte příjmení"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: '#34C759' }, !isFormValid() && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!isFormValid()}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Založit výkup</Text>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  icoButton: {
  },
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