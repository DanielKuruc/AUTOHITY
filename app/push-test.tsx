import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/apiService';

/**
 * TEST SCREEN FOR PUSH NOTIFICATIONS
 * 
 * Use this to test:
 * - In-app notifications
 * - Backend push API
 * - Manual notification creation
 * 
 * Remove this screen in production!
 */

export default function PushTestScreen() {
  const { theme } = useTheme();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const [title, setTitle] = useState('🚗 Nový výkup');
  const [body, setBody] = useState('Vozidlo ABC 1234 - Jan Novák');
  const [userId, setUserId] = useState(user?.id.toString() || '');
  const [loading, setLoading] = useState(false);

  const testInAppNotification = (type: 'info' | 'success' | 'warning' | 'error' | 'push') => {
    addNotification({
      title: title || 'Test',
      body: body || 'Test notification',
      type,
      data: { timestamp: Date.now() },
    });
  };

  const sendPushToBackend = async (sendToAll: boolean = false) => {
    try {
      setLoading(true);
      const payload: any = {
        title,
        body,
        data: {
          type: 'test_notification',
          timestamp: Date.now(),
        },
      };

      if (!sendToAll && userId) {
        payload.user_id = parseInt(userId);
      }

      console.log('[PushTest] Sending to backend:', payload);

      const response = await apiService.post('/send_push.php', payload);

      console.log('[PushTest] Response:', response);

      // Also show in-app notification to simulate
      if (response.tokens_sent === 0) {
        addNotification({
          title: '📬 Simulace Push',
          body: `Push byl odeslán na ${response.total_tokens} zařízení (0 úspěšně)\n\n${body}`,
          type: 'info',
        });
      } else {
        addNotification({
          title: '✅ Push Odeslán',
          body: `${response.tokens_sent}/${response.total_tokens} zařízení úspěšně\n\n${body}`,
          type: 'success',
        });
      }

      Alert.alert(
        'Úspěch',
        `Push odeslán\n\nZařízení: ${response.tokens_sent}/${response.total_tokens}\nSelhání: ${response.failures}`
      );
    } catch (error) {
      console.error('[PushTest] Error:', error);
      addNotification({
        title: '❌ Chyba',
        body: 'Nepodařilo se odeslat push na backend',
        type: 'error',
      });
      Alert.alert('Chyba', 'Nepodařilo se odeslat push: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            <Ionicons name="warning" size={20} color="#FF9500" /> Test Push Notifikací
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Tato stránka je pouze pro vývoj. V produkci ji odstraňte!
          </Text>
        </View>

        {/* Input fields */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Obsah notifikace</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Nadpis</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
              placeholder="Nadpis notifikace"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Obsah</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
              placeholder="Obsah notifikace"
              placeholderTextColor={theme.textTertiary}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>User ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
              placeholder="Ponechte prázdné pro všechny uživatele"
              placeholderTextColor={theme.textTertiary}
              value={userId}
              onChangeText={setUserId}
              keyboardType="number-pad"
            />
            {user?.id && (
              <Text style={[styles.helperText, { color: theme.textTertiary }]}>
                Aktuální uživatel: {user.id}
              </Text>
            )}
          </View>
        </View>

        {/* In-app notifications */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>In-App Notifikace (lokální)</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#34C759' }]}
            onPress={() => testInAppNotification('success')}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Success</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF3B30' }]}
            onPress={() => testInAppNotification('error')}
          >
            <Ionicons name="close-circle" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Error</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FF9500' }]}
            onPress={() => testInAppNotification('warning')}
          >
            <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Warning</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={() => testInAppNotification('push')}
          >
            <Ionicons name="notifications" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Push</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.textTertiary }]}
            onPress={() => testInAppNotification('info')}
          >
            <Ionicons name="information-circle" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Info</Text>
          </TouchableOpacity>
        </View>

        {/* Backend push */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Backend Push (Expo API)</Text>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: theme.accent, opacity: loading ? 0.5 : 1 }]}
            onPress={() => sendPushToBackend(false)}
            disabled={loading}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {loading ? 'Odesílám...' : `Odeslat konkrétnímu uživateli (${userId || 'všichni'})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: '#FF9500', opacity: loading ? 0.5 : 1 }]}
            onPress={() => sendPushToBackend(true)}
            disabled={loading}
          >
            <Ionicons name="megaphone" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {loading ? 'Odesílám...' : 'Odeslat všem'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.helperText, { color: theme.textSecondary, marginTop: 12 }]}>
            ℹ️ Odesílá na PHP backend, který poté pošle push přes Expo API na fyzická zařízení.
            {'\n\n'}
            Na simulátoru: lokální notifikace přes in-app centrum
            {'\n'}Na fyzickém zařízení: pravá push notifikace + in-app centrum
          </Text>
        </View>

        {/* Info */}
        <View style={[styles.card, { backgroundColor: theme.card, borderLeftColor: '#34C759', borderLeftWidth: 4 }]}>
          <Text style={[styles.infoTitle, { color: '#34C759' }]}>ℹ️ Jak to funguje</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: '600' }}>1. In-App Notifikace:</Text>
            {'\n'}Zobrazují se okamžitě v aplikaci bez ohledu na zařízení
            {'\n\n'}
            <Text style={{ fontWeight: '600' }}>2. Push via Backend:</Text>
            {'\n'}• Odesílá se na PHP endpoint
            {'\n'}• Na simulátoru se zobrazí jako in-app notifikace
            {'\n'}• Na fyzickém zařízení se odešle přes Expo Push API
            {'\n\n'}
            <Text style={{ fontWeight: '600' }}>3. Notifikační centrum:</Text>
            {'\n'}Všechny notifikace jsou vidět v tabu "Notifikace"
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});