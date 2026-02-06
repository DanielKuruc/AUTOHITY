import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EditableImageGalleryProps {
  images: string[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
  onImagesChange?: (images: string[]) => void;
  isEditing?: boolean;
}

export function EditableImageGallery({ 
  images, 
  visible, 
  initialIndex, 
  onClose, 
  onImagesChange,
  isEditing = false 
}: EditableImageGalleryProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [localImages, setLocalImages] = useState(images);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    setCurrentIndex(index);
  };

  const handleDeleteImage = (index: number) => {
    if (!isEditing) return;

    Alert.alert(
      'Smazat fotografii',
      'Opravdu chcete smazat tuto fotografii?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: () => {
            const newImages = localImages.filter((_, i) => i !== index);
            setLocalImages(newImages);
            onImagesChange?.(newImages);
            if (currentIndex >= newImages.length && currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
            }
          },
        },
      ]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIndices.length === 0) return;

    Alert.alert(
      'Smazat fotografie',
      `Opravdu chcete smazat ${selectedIndices.length} fotografií?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: () => {
            const newImages = localImages.filter((_, i) => !selectedIndices.includes(i));
            setLocalImages(newImages);
            onImagesChange?.(newImages);
            setSelectedIndices([]);
          },
        },
      ]
    );
  };

  const toggleSelection = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < localImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const renderImage = ({ item }: { item: string; index?: number }) => (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: item }}
        style={styles.fullImage}
        resizeMode="contain"
      />
    </View>
  );

  const isCurrentImageSelected = selectedIndices.includes(currentIndex);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {localImages.length}
          </Text>
          <View style={styles.headerRight}>
            {isEditing && localImages.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isCurrentImageSelected && styles.selectButtonActive,
                ]}
                onPress={() => toggleSelection(currentIndex)}
              >
                <Ionicons
                  name={isCurrentImageSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Image Carousel */}
        <FlatList
          data={localImages}
          renderItem={renderImage}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          scrollEnabled={!isEditing || selectedIndices.length === 0}
        />

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={goToPrevious}
          >
            <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {currentIndex < localImages.length - 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={goToNext}
          >
            <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Delete Button (Editing Mode) */}
        {isEditing && localImages.length > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteImage(currentIndex)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}

        {/* Dots Indicator */}
        <View style={[styles.dotsContainer, { paddingBottom: insets.bottom + 20 }]}>
          {localImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Bulk Delete Footer */}
        {isEditing && selectedIndices.length > 0 && (
          <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
            <Text style={styles.footerText}>
              {selectedIndices.length} vybrána
            </Text>
            <TouchableOpacity
              style={styles.deleteAllButton}
              onPress={handleDeleteSelected}
            >
              <Ionicons name="trash" size={18} color="#FFFFFF" />
              <Text style={styles.deleteAllButtonText}>Smazat vše</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.4)',
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  actionButton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    gap: 8,
  },
  deleteAllButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
