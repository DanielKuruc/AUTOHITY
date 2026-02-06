import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    const result = await login(userName, password);

    if (!result.success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      setError(result.error || 'Přihlášení se nezdařilo');
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('@/assets/images/autohity-logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>AUTOHITY</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Přihlaste se do svého účtu</Text>
          </View>

          {/* Form */}
          <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnimation }] }]}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Uživatelské jméno</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: error ? theme.error : theme.border }]}>
                <Ionicons name="person-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={userName}
                  onChangeText={(text) => {
                    setUserName(text);
                    setError('');
                  }}
                  placeholder="Zadejte uživatelské jméno"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Heslo</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: error ? theme.error : theme.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: theme.text }]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  placeholder="Zadejte heslo"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.accent }, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.loginButtonText}>Přihlásit se</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  logo: { width: '100%', height: '100%' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '500' },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  eyeButton: { padding: 8, marginRight: -8 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 4 },
  errorText: { fontSize: 14, fontWeight: '500' },
  loginButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 12, gap: 8, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});