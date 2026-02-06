import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { Purchase, PurchaseState, CarCondition, ClientType } from '@/constants/types';
import { apiService } from '@/services/apiService';
import * as ImagePicker from 'expo-image-picker';

export default function FotoVadyScreen() {
  const { addPurchase } = usePurchases();
  const { photoGridColumns } = useTabletLayout();
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

  const openCamera = async (target: 'vehicle' | 'defect') => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Oprávnění vyžadováno', 'Pro fotografování je potřeba přístup ke kameře');
      return;
    }

    // Foto vady - BEZ editace (originální poměr), úvodní - S editací
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Žádný crop dialog
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (target === 'vehicle') handleAddVehicleImage(uri);
      else handleAddDefectImage(uri);
    }
  };

  const openGallery = async (target: 'vehicle' | 'defect', limit: number = 20) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Oprávnění vyžadováno', 'Pro výběr fotek je potřeba přístup ke galerii');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      if (target === 'vehicle') setVehicleImages(prev => [...prev, ...uris]);
      else setDefectImages(prev => [...prev, ...uris]);
    }
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

      const createRes = await apiService.createPurchase(newPurchase);
      const purchaseId = String(createRes?.id || createRes?.data?.id);
      if (!purchaseId) throw new Error('Chybí ID nového výkupu z API');

      if (vehicleImages.length > 0) {
        try {
          const res = await apiService.uploadPhotos(purchaseId, vehicleImages);
          console.log('[NewPurchase] Vehicle upload OK:', res);
        } catch (e) {
          console.warn('[NewPurchase] Upload vehicle images failed:', e);
        }
      }

      if (defectImages.length > 0) {
        try {
          const res = await apiService.uploadDefectPhotos(purchaseId, defectImages);
          console.log('[NewPurchase] Defect upload OK:', res);
        } catch (e) {
          console.warn('[NewPurchase] Upload defect images failed:', e);
        }
      }

      addPurchase({ ...newPurchase, id: purchaseId });

      Alert.alert(
        'Úspěch',
        'Výkup byl úspěšně vytvořen a fotky nahrány',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('[FotoVady] Create or upload error:', error);
      Alert.alert('Chyba', 'Nepodařilo se vytvořit výkup nebo nahrát fotky');
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
        <Text style={styles.headerTitle}>Foto</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section 1: Foto vozidla */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto vozidla</Text>
          <Text style={styles.sectionDescription}>
            Zachyťte exteriér, interiér a všechny detaily vozidla
          </Text>
          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.actionInline} onPress={() => openCamera('vehicle')}>
              <Ionicons name="camera" size={20} color="#007AFF" />
              <Text style={styles.actionInlineText}>Vyfotit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionInline} onPress={() => openGallery('vehicle', 20)}>
              <Ionicons name="images" size={20} color="#007AFF" />
              <Text style={styles.actionInlineText}>Vybrat</Text>
            </TouchableOpacity>
          </View>
          {vehicleImages.length > 0 && (
            <View style={[styles.thumbGrid, { columnCount: photoGridColumns }]}>
              {vehicleImages.map((u, i) => (
                <View 
                  key={`v-${i}`} 
                  style={[styles.thumbItem, { width: `${100 / photoGridColumns}%` }]}
                >
                  <Image source={{ uri: u }} style={styles.thumbImg} />
                  <TouchableOpacity 
                    style={styles.removeBtn} 
                    onPress={() => handleRemoveVehicleImage(i)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 2: Foto vady */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto vady</Text>
          <Text style={styles.sectionDescription}>
            Zdokumentujte škrábance, promáčknutí, rez nebo jiné problémy
          </Text>
          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.actionInline} onPress={() => openCamera('defect')}>
              <Ionicons name="camera" size={20} color="#FF3B30" />
              <Text style={[styles.actionInlineText, { color: '#FF3B30' }]}>Vyfotit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionInline} onPress={() => openGallery('defect', 20)}>
              <Ionicons name="images" size={20} color="#FF3B30" />
              <Text style={[styles.actionInlineText, { color: '#FF3B30' }]}>Vybrat</Text>
            </TouchableOpacity>
          </View>
          {defectImages.length > 0 && (
            <View style={[styles.thumbGrid, { columnCount: photoGridColumns }]}>
              {defectImages.map((u, i) => (
                <View 
                  key={`d-${i}`} 
                  style={[styles.thumbItem, { width: `${100 / photoGridColumns}%` }]}
                >
                  <Image source={{ uri: u }} style={styles.thumbImg} />
                  <TouchableOpacity 
                    style={styles.removeBtn} 
                    onPress={() => handleRemoveDefectImage(i)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
  rowButtons: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  actionInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionInlineText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbItem: { aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative', paddingHorizontal: 4 },
  thumbImg: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
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