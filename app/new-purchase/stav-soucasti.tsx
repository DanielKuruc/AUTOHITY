import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface ComponentStatus {
  component: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
}

const VEHICLE_COMPONENTS = [
  'Motor',
  'Převodovka',
  'Brzdy',
  'Odpružení',
  'Pneumatiky',
  'Baterie',
  'Klimatizace',
  'Elektronika',
  'Interiér',
  'Lak karoserie',
  'Skla/okna',
  'Světla',
];

const STATUS_OPTIONS = [
  { key: 'excellent', label: 'Výborné', color: '#34C759', icon: 'checkmark-circle' },
  { key: 'good', label: 'Dobré', color: '#30D158', icon: 'checkmark-circle-outline' },
  { key: 'fair', label: 'Přijatelné', color: '#FF9500', icon: 'remove-circle' },
  { key: 'poor', label: 'Špatné', color: '#FF6B35', icon: 'close-circle-outline' },
  { key: 'damaged', label: 'Poškozené', color: '#FF3B30', icon: 'close-circle' },
];

export default function StavSoucastiScreen() {
  const [componentStatuses, setComponentStatuses] = useState<ComponentStatus[]>(
    VEHICLE_COMPONENTS.map(component => ({
      component,
      status: 'good' as const,
      notes: '',
    }))
  );

  const [generalNotes, setGeneralNotes] = useState('');

  const updateComponentStatus = (index: number, status: ComponentStatus['status']) => {
    setComponentStatuses(prev => prev.map((item, i) => 
      i === index ? { ...item, status } : item
    ));
  };

  const updateComponentNotes = (index: number, notes: string) => {
    setComponentStatuses(prev => prev.map((item, i) => 
      i === index ? { ...item, notes } : item
    ));
  };

  const handleNext = () => {
    router.push('/new-purchase/souhrn');
  };

  const handleBack = () => {
    router.back();
  };

  const getStatusOption = (status: ComponentStatus['status']) => {
    return STATUS_OPTIONS.find(option => option.key === status) || STATUS_OPTIONS[1];
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
        <Text style={styles.headerTitle}>Stav součástí</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hodnocení stavu součástí vozidla</Text>
          <Text style={styles.sectionDescription}>
            Vyhodnoťte stav každé součásti
          </Text>
          {componentStatuses.map((item, index) => (
            <View key={item.component} style={styles.componentContainer}>
              <View style={styles.componentHeader}>
                <Text style={styles.componentName}>{item.component}</Text>
                <View style={styles.statusSelector}>
                  {STATUS_OPTIONS.map((statusOption) => {
                    const isSelected = item.status === statusOption.key;
                    return (
                      <TouchableOpacity
                        key={statusOption.key}
                        style={[
                          styles.statusButton,
                          isSelected && { backgroundColor: statusOption.color }
                        ]}
                        onPress={() => updateComponentStatus(index, statusOption.key as ComponentStatus['status'])}
                      >
                        <Ionicons
                          name={statusOption.icon as any}
                          size={18}
                          color={isSelected ? '#FFFFFF' : statusOption.color}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.statusIndicator}>
                <View 
                  style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusOption(item.status).color }
                  ]}
                />
                <Text style={styles.statusText}>
                  {getStatusOption(item.status).label}
                </Text>
              </View>

              <TextInput
                style={styles.componentNotes}
                value={item.notes}
                onChangeText={(text) => updateComponentNotes(index, text)}
                placeholder="Další poznámky k této součásti..."
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={2}
              />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Obecné poznámky</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.multilineInput}
              value={generalNotes}
              onChangeText={setGeneralNotes}
              placeholder="Celkové poznámky a pozorování stavu vozidla..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Další: Souhrn</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
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
  },
  componentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  componentName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  statusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  componentNotes: {
    fontSize: 14,
    color: '#8E8E93',
    backgroundColor: '#F8F8F8',
    padding: 8,
    borderRadius: 6,
    minHeight: 36,
    textAlignVertical: 'top',
  },
  inputContainer: {
    paddingHorizontal: 16,
  },
  multilineInput: {
    fontSize: 17,
    color: '#1A1A1A',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
});