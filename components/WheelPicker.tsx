import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

// Predefined options for engine picker
const ENGINE_SIZES = [
  '0.6', '0.7', '0.8', '0.9', 
  '1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9',
  '2.0', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9',
  '3.0', '3.2', '3.5', '3.6', '3.8',
  '4.0', '4.2', '4.4', '4.6', '4.8',
  '5.0', '5.2', '5.5', '5.7',
  '6.0'
];
const FUEL_TYPES = ['Benzín', 'Diesel', 'LPG', 'CNG', 'Hybrid', 'Elektro'];

interface WheelPickerProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}

export function WheelPicker({
  label,
  value,
  onSelect,
  placeholder = 'Vyberte možnost...',
  error = false,
}: WheelPickerProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse current value to get engine size and fuel type
  const parseValue = (val: string) => {
    if (!val || val === '---Výběr---') return { size: '1.5', fuel: 'Benzín' };
    const size = ENGINE_SIZES.find(s => val.includes(s)) || '1.5';
    const fuel = FUEL_TYPES.find(f => val.toLowerCase().includes(f.toLowerCase())) || 
                 (val.toLowerCase().includes('tdi') || val.toLowerCase().includes('diesel') ? 'Diesel' : 
                  val.toLowerCase().includes('tsi') || val.toLowerCase().includes('tfsi') ? 'Benzín' : 'Benzín');
    return { size, fuel };
  };

  const { size: initialSize, fuel: initialFuel } = parseValue(value);
  const [selectedSize, setSelectedSize] = useState(initialSize);
  const [selectedFuel, setSelectedFuel] = useState(initialFuel);

  const sizeListRef = useRef<FlatList>(null);
  const fuelListRef = useRef<FlatList>(null);

  const displayValue = value && value !== '---Výběr---' ? value : '';
  const isEmpty = !value || value === '---Výběr---';
  const borderColor = isEmpty ? '#E30613' : (error ? '#FF3B30' : theme.border);

  useEffect(() => {
    if (modalVisible) {
      const { size, fuel } = parseValue(value);
      setSelectedSize(size);
      setSelectedFuel(fuel);

      const sizeIndex = ENGINE_SIZES.indexOf(size);
      const fuelIndex = FUEL_TYPES.indexOf(fuel);

      setTimeout(() => {
        if (sizeIndex >= 0 && sizeListRef.current) {
          sizeListRef.current.scrollToIndex({
            index: sizeIndex,
            animated: false,
            viewPosition: 0.5,
          });
        }
        if (fuelIndex >= 0 && fuelListRef.current) {
          fuelListRef.current.scrollToIndex({
            index: fuelIndex,
            animated: false,
            viewPosition: 0.5,
          });
        }
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalVisible]);

  const handleConfirm = () => {
    const combinedValue = `${selectedSize} ${selectedFuel}`;
    onSelect(combinedValue);
    setModalVisible(false);
  };

  const handleSizeScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, ENGINE_SIZES.length - 1));
    if (ENGINE_SIZES[clampedIndex]) {
      setSelectedSize(ENGINE_SIZES[clampedIndex]);
    }
  };

  const handleFuelScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, FUEL_TYPES.length - 1));
    if (FUEL_TYPES[clampedIndex]) {
      setSelectedFuel(FUEL_TYPES[clampedIndex]);
    }
  };

  const renderSizeItem = ({ item, index }: { item: string; index: number }) => {
    const isSelected = selectedSize === item;
    return (
      <TouchableOpacity
        style={styles.wheelItem}
        onPress={() => {
          setSelectedSize(item);
          sizeListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
        }}
      >
        <Text
          style={[
            styles.wheelItemText,
            { color: isSelected ? theme.text : theme.textTertiary },
            isSelected && styles.wheelItemTextSelected,
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFuelItem = ({ item, index }: { item: string; index: number }) => {
    const isSelected = selectedFuel === item;
    return (
      <TouchableOpacity
        style={styles.wheelItem}
        onPress={() => {
          setSelectedFuel(item);
          fuelListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
        }}
      >
        <Text
          style={[
            styles.wheelItemText,
            { color: isSelected ? theme.text : theme.textTertiary },
            isSelected && styles.wheelItemTextSelected,
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };
  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: theme.inputBackground, borderColor }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectorText, { color: displayValue ? theme.text : theme.textTertiary }]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.accent} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>

            {/* Column Labels */}
            <View style={styles.columnLabels}>
              <Text style={[styles.columnLabel, { color: theme.textSecondary }]}>Objem</Text>
              <Text style={[styles.columnLabel, { color: theme.textSecondary }]}>Palivo</Text>
            </View>

            {/* Two Column Wheel Picker */}
            <View style={[styles.wheelContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              {/* Selection Indicator */}
              <View style={[styles.selectionIndicator, { borderColor: theme.border }]} />

              <View style={styles.columnsContainer}>
                {/* Engine Size Column */}
                <View style={styles.column}>
                  <FlatList
                    ref={sizeListRef}
                    data={ENGINE_SIZES}
                    renderItem={renderSizeItem}
                    keyExtractor={(item) => `size-${item}`}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={handleSizeScroll}
                    getItemLayout={getItemLayout}
                    contentContainerStyle={{
                      paddingVertical: ITEM_HEIGHT * 2,
                    }}
                    onScrollToIndexFailed={() => {}}
                  />
                </View>

                {/* Fuel Type Column */}
                <View style={styles.column}>
                  <FlatList
                    ref={fuelListRef}
                    data={FUEL_TYPES}
                    renderItem={renderFuelItem}
                    keyExtractor={(item) => `fuel-${item}`}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onMomentumScrollEnd={handleFuelScroll}
                    getItemLayout={getItemLayout}
                    contentContainerStyle={{
                      paddingVertical: ITEM_HEIGHT * 2,
                    }}
                    onScrollToIndexFailed={() => {}}
                  />
                </View>
              </View>
            </View>

            {/* Footer Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.inputBackground }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.accent }]}
                onPress={handleConfirm}
              >
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Potvrdit</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  columnLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  columnLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  wheelContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
    pointerEvents: 'none',
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 18,
  },
  wheelItemTextSelected: {
    fontWeight: '600',
    fontSize: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});