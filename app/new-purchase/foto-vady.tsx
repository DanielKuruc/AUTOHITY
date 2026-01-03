import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraCapture } from '@/components/CameraCapture';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Purchase, PurchaseState, CarCondition, ClientType } from '@/constants/types';

export default function FotoVadyScreen() {
  const { addPurchase } = usePurchases();
  const [vehicleImages, setVehicleImages] = useState<string[]>([]);
  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddVehicleImage = (imageUri: string) => {
    setVehicleImages(prev => [...prev, imageUri]);
  };

  const handleRemoveVehicleImage = (index: number) => {
    setVehicleImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDefectImage = (imageUri: string) => {
    setDefectImages(prev => [...prev, imageUri]);
  };

  const handleRemoveDefectImage = (index: number) => {
    setDefectImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        clientName: 'Vzorový klient',
        clientType: ClientType.PERSONAL,
        spz: 'BA123AB',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseState: PurchaseState.NEW,
        employeeId: '1',
        carDetails: {
          id: Date.now().toString(),
          make: 'BMW',
          model: '3 Series',
          year: 2020,
          color: 'Černá',
          mileage: 45000,
          fuelType: 'Benzín',
          engineSize: '2.0L',
          transmission: 'Automatická',
          condition: CarCondition.USED
        },
        notes: 'Výkup vytvořený prostřednictvím nového vícekrokového formuláře',
        totalAmount: 25000,
        images: vehicleImages.length > 0 ? vehicleImages : undefined,
        defectImages: defectImages.length > 0 ? defectImages : undefined
      };

      addPurchase(newPurchase);

      Alert.alert(
        'Úspěch',
        'Výkup byl úspěšně vytvořen',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se vytvořit výkup');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F2F2F7" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Foto vady</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section 1: Foto vozidla */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto vozidla</Text>
          <Text style={styles.sectionDescription}>
            Zachyťte exteriér, interiér a všechny detaily vozidla
          </Text>
          <View style={{ height: 100, backgroundColor: '#F2F2F7', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Nahrávání fotek - dočasně skryto</Text>
          </View>
        </View>

        {/* Section 2: Foto vady */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto vady</Text>
          <Text style={styles.sectionDescription}>
            Zdokumentujte škrábance, promáčknutí, rez nebo jiné problémy
          </Text>
          <View style={{ height: 100, backgroundColor: '#F2F2F7', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Nahrávání fotek - dočasně skryto</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.completeBtn, loading && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          <Text style={styles.completeBtnText}>
            {loading ? 'Vytváří se...' : 'Dokončit výkup'}
          </Text>
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
  header: {
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
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  completeBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtnDisabled: {
    opacity: 0.6,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});