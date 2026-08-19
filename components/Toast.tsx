import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useToast, Toast as ToastType } from '@/contexts/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOAST_COLORS = {
  success: { bg: '#34C759', icon: 'checkmark-circle', text: '#FFFFFF' },
  error: { bg: '#FF3B30', icon: 'close-circle', text: '#FFFFFF' },
  warning: { bg: '#FF9500', icon: 'warning', text: '#FFFFFF' },
  info: { bg: '#007AFF', icon: 'information-circle', text: '#FFFFFF' },
};

export function ToastContainer() {
  const { toasts, hideToast } = useToast();
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[styles.container, { paddingBottom: insets.bottom + 12 }]} 
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => hideToast(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const { theme } = useTheme();
  const config = TOAST_COLORS[toast.type];

  return (
    <View style={styles.toastWrapper} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.toast, { backgroundColor: config.bg }]}
        onPress={onDismiss}
        activeOpacity={0.8}
      >
        <Ionicons name={config.icon as any} size={20} color={config.text} />
        <Text style={[styles.message, { color: config.text }]} numberOfLines={2}>
          {toast.message}
        </Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={20} color={config.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  toastWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});