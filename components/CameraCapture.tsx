import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface CameraCaptureProps {
  images: string[];
  onAddImage: (imageUri: string) => void;
  onAddImages?: (imageUris: string[]) => void; // New prop for multiple images
  onRemoveImage: (index: number) => void;
}

export function CameraCapture({ images, onAddImage, onAddImages, onRemoveImage }: CameraCaptureProps) {
  const { theme } = useTheme();
  const handleCameraPress = async () => {
    // On web, camera permission is handled differently
    if (Platform.OS === 'web') {
      Alert.alert(
        'Kamera není dostupná',
        'Funkce kamery není dostupná na webu. Použijte prosím "Vybrat z galerie".',
        [{ text: 'OK' }]
      );
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Oprávnění vyžadováno', 'Pro fotografování je potřeba přístup ke kameře');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onAddImage(result.assets[0].uri);
    }
  };

  // Single image selection
  const handleLibraryPress = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Oprávnění vyžadováno', 'Pro výběr fotek je potřeba přístup ke galerii');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onAddImage(result.assets[0].uri);
    }
  };

  // Multiple image selection
  const handleMultipleLibraryPress = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Oprávnění vyžadováno', 'Pro výběr fotek je potřeba přístup ke galerii');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20, // Max 20 photos at once
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map(asset => asset.uri);
      console.log(`[CameraCapture] Vybráno ${uris.length} fotek`);

      if (onAddImages) {
        onAddImages(uris);
      } else {
        // Fallback: add images one by one
        uris.forEach(uri => onAddImage(uri));
      }
    }
  };

  const renderPhotoGrid = () => {
    return (
      <View style={styles.photoGrid}>
        {images.map((imageUri, index) => (
          <View key={index} style={styles.photoItem}>
            <Image source={{ uri: imageUri }} style={[styles.photoThumbnail, { backgroundColor: theme.inputBackground }]} />
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: theme.card }]}
              onPress={() => onRemoveImage(index)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
            <View style={styles.photoIndex}>
              <Text style={styles.photoIndexText}>{index + 1}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Photos Section Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Fotografie ({images.length})</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Přidejte fotografie vozidla</Text>
      </View>

      {/* Photo Grid */}
      {images.length > 0 && renderPhotoGrid()}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.inputBackground }, Platform.OS === 'web' && styles.disabledButton]} 
          onPress={handleCameraPress}
          disabled={Platform.OS === 'web'}
        >
          <Ionicons 
            name="camera" 
            size={24} 
            color={Platform.OS === 'web' ? theme.textTertiary : theme.accent} 
          />
          <Text style={[styles.buttonText, { color: Platform.OS === 'web' ? theme.textTertiary : theme.accent }]}>
            {Platform.OS === 'web' ? 'Kamera (N/A)' : 'Kamera'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.inputBackground }]} onPress={handleLibraryPress}>
          <Ionicons name="image" size={24} color={theme.accent} />
          <Text style={[styles.buttonText, { color: theme.accent }]}>Galerie</Text>
        </TouchableOpacity>
      </View>

      {/* Multiple Selection Button */}
      <TouchableOpacity 
        style={[styles.multipleButton, { backgroundColor: theme.accent }]} 
        onPress={handleMultipleLibraryPress}
      >
        <Ionicons name="images" size={22} color="#FFFFFF" />
        <Text style={styles.multipleButtonText}>Hromadný výběr fotek</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>max 20</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  photoItem: {
    position: 'relative',
    width: (screenWidth - 48) / 3 - 8,
    aspectRatio: 1,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoIndexText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  multipleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  multipleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});