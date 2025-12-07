import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface SelectionPickerProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function SelectionPicker({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Vyberte možnost...',
  required = false
}: SelectionPickerProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    setModalVisible(false);
  };

  const displayValue = value && value !== '---Výběr---' ? value : '';

  const renderOption = ({ item, index }: { item: string; index: number }) => {
    const isSelected = value === item;
    const isPlaceholder = item === '---Výběr---';
    return (
      <TouchableOpacity
        style={[
          styles.optionItem,
          { borderBottomColor: theme.border },
          isSelected && { backgroundColor: theme.accent + '15' },
          index === options.length - 1 && styles.lastOption
        ]}
        onPress={() => handleSelect(item)}
      >
        <Text style={[
          styles.optionText, 
          { color: isPlaceholder ? theme.textTertiary : theme.text },
          isSelected && { color: theme.accent, fontWeight: '600' }
        ]}>
          {item}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
        )}
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        style={[styles.selector, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
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
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.inputBackground }]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              renderItem={renderOption}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              bounces={false}
            />
          </View>
        </View>
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
  required: {
    color: '#FF3B30',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    minHeight: 200,
    borderRadius: 16,
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  optionsList: {
    maxHeight: 350,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
});