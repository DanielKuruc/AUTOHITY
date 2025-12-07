import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  includeTime?: boolean;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Vyberte datum',
  includeTime = false,
}: DatePickerFieldProps) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);

  // Parse existing value
  React.useEffect(() => {
    if (value) {
      const datePart = value.split(' ')[0];
      const timePart = value.split(' ')[1];
      const parts = datePart.split('.');
      if (parts.length === 3) {
        setSelectedDay(parseInt(parts[0], 10) || new Date().getDate());
        setSelectedMonth((parseInt(parts[1], 10) || 1) - 1);
        setSelectedYear(parseInt(parts[2], 10) || new Date().getFullYear());
      }
      if (timePart && includeTime) {
        const timeParts = timePart.split(':');
        setSelectedHour(parseInt(timeParts[0], 10) || 12);
        setSelectedMinute(parseInt(timeParts[1], 10) || 0);
      }
    }
  }, []);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];
  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 10 + i);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
    let dateStr = `${pad(selectedDay)}.${pad(selectedMonth + 1)}.${selectedYear}`;
    if (includeTime) {
      dateStr += ` ${pad(selectedHour)}:${pad(selectedMinute)}`;
    }
    onChange(dateStr);
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.inputText, { color: value ? theme.text : theme.textTertiary }]}>
          {value || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={theme.accent} />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowPicker(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Vyberte datum</Text>

            <View style={styles.pickerRow}>
              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Den</Text>
                <ScrollView style={[styles.scrollPicker, { backgroundColor: theme.inputBackground }]} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        selectedDay === day && { backgroundColor: theme.accent }
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: selectedDay === day ? '#FFFFFF' : theme.text }
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={[styles.pickerColumn, { flex: 1.5 }]}>
                <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Měsíc</Text>
                <ScrollView style={[styles.scrollPicker, { backgroundColor: theme.inputBackground }]} showsVerticalScrollIndicator={false}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.pickerItem,
                        selectedMonth === index && { backgroundColor: theme.accent }
                      ]}
                      onPress={() => setSelectedMonth(index)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: selectedMonth === index ? '#FFFFFF' : theme.text }
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Rok</Text>
                <ScrollView style={[styles.scrollPicker, { backgroundColor: theme.inputBackground }]} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        selectedYear === year && { backgroundColor: theme.accent }
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        { color: selectedYear === year ? '#FFFFFF' : theme.text }
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {includeTime && (
              <View style={styles.timeRow}>
                {/* Hour Picker */}
                <View style={styles.timeColumn}>
                  <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Hodina</Text>
                  <ScrollView style={[styles.scrollPickerSmall, { backgroundColor: theme.inputBackground }]} showsVerticalScrollIndicator={false}>
                    {hours.map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.pickerItem,
                          selectedHour === hour && { backgroundColor: theme.accent }
                        ]}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          { color: selectedHour === hour ? '#FFFFFF' : theme.text }
                        ]}>
                          {hour < 10 ? `0${hour}` : hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>

                {/* Minute Picker */}
                <View style={styles.timeColumn}>
                  <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Minuta</Text>
                  <ScrollView style={[styles.scrollPickerSmall, { backgroundColor: theme.inputBackground }]} showsVerticalScrollIndicator={false}>
                    {minutes.filter(m => m % 5 === 0).map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.pickerItem,
                          selectedMinute === minute && { backgroundColor: theme.accent }
                        ]}
                        onPress={() => setSelectedMinute(minute)}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          { color: selectedMinute === minute ? '#FFFFFF' : theme.text }
                        ]}>
                          {minute < 10 ? `0${minute}` : minute}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.inputBackground }]} 
                onPress={() => setShowPicker(false)}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputText: {
    fontSize: 16,
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
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
  },
  scrollPicker: {
    height: 150,
    borderRadius: 10,
  },
  scrollPickerSmall: {
    height: 120,
    borderRadius: 10,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  pickerItemText: {
    fontSize: 14,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 10,
  },
  timeColumn: {
    width: 80,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
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