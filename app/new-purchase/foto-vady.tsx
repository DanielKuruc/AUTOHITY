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
  const [interiorImages, setInteriorImages] = useState<string[]>([]);
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

  const handleAddInteriorImage = (imageUri: string) => {
    setInteriorImages(prev => [...prev, imageUri]);
  };

  const handleRemoveInteriorImage = (index: number) => {
    setInteriorImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Combine all images
      const allImages = [
        ...vehicleImages,
        ...defectImages,
        ...interiorImages
      ];

      // Create mock purchase with all collected data
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        clientName: 'Vzorový klient', // This would come from collected data
        clientType: ClientType.PERSONAL,
        spz: 'BA123AB', // This would come from collected data
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseState: PurchaseState.NEW,
        employeeId: '1',
        carDetails: {
          id: Date.now().toString(),
          make: 'BMW', // This would come from collected data
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
        images: allImages
      };

      addPurchase(newPurchase);

      Alert.alert(
        'Úspěch',
        'Výkup byl úspěšně vytvořen',
        [{ text: 'OK', onPress: () => router.dismissAll() }]
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

  const getTotalImageCount = () => {
    return vehicleImages.length + defectImages.length + interiorImages.length;
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
        <Text style={styles.headerTitle}>Foto vady</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Přehled fotografií</Text>
          <View style={styles.summaryRow}>
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.summaryText}>
              {getTotalImageCount()} fotografií pořízeno
            </Text>
          </View>
        </View>

        {/* Vehicle Exterior Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exteriér vozidla</Text>
          <Text style={styles.sectionDescription}>
            Zachyťte celkový stav exteriéru, úhly a obecný vzhled
          </Text>
          <CameraCapture
            images={vehicleImages}
            onAddImage={handleAddVehicleImage}
            onRemoveImage={handleRemoveVehicleImage}
          />
        </View>

        {/* Defects and Damage Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vady a poškození</Text>
          <Text style={styles.sectionDescription}>
            Zdokumentujte škrábance, promáčknutí, rez nebo jiné problémy
          </Text>
          <CameraCapture
            images={defectImages}
            onAddImage={handleAddDefectImage}
            onRemoveImage={handleRemoveDefectImage}
          />
        </View>

        {/* Interior Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stav interiéru</Text>
          <Text style={styles.sectionDescription}>
            Zachyťte sedadla, palubní desku, ovládací prvky a opotřebení interiéru
          </Text>
          <CameraCapture
            images={interiorImages}
            onAddImage={handleAddInteriorImage}
            onRemoveImage={handleRemoveInteriorImage}
          />
        </View>

        {/* Photo Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pokyny pro fotografování</Text>
          <View style={styles.guidelinesList}>
            {[
              'Pořizujte jasné, dobře osvětlené fotografie',
              'Zachyťte více úhlů pro každou oblast',
              'Zaměřte se na jakékoli poškození nebo vady',
              'Přiložte detailní záběry problematických oblastí',
              'Zajistěte, aby fotografie nebyly rozmazané',
              'Zdokumentujte všechny významné funkce'
            ].map((guideline, index) => (
              <View key={index} style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.guidelineText}>{guideline}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.completeButton, loading && styles.completeButtonDisabled]} 
          onPress={handleComplete}
          disabled={loading}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.completeButtonText}>
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
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  summaryText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    marginLeft: 8,
  },
  guidelinesList: {
    paddingHorizontal: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 8,
    flex: 1,
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  completeButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
});