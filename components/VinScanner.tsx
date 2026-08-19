import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { extractVINFromText, normalizeVinInput } from '@/utils/vinExtraction';
import { showAlert } from '@/utils/alert';

interface OcrModule {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
}

let ocrModule: OcrModule | null = null;
let ocrLoadAttempted = false;

/**
 * expo-text-extractor je nativní modul - v Expo Go neexistuje a jeho
 * `requireNativeModule` vyhodí výjimku už při importu. Kdyby se importoval
 * staticky, spadla by celá appka při startu (VinScanner se táhne přes
 * NewPurchaseModal až do záložky Výkupy). Proto ho načítáme až na vyžádání
 * a selhání tolerujeme - bez dev buildu se prostě zadá VIN ručně.
 */
function getOcr(): OcrModule | null {
  if (!ocrLoadAttempted) {
    ocrLoadAttempted = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- statický import by v Expo Go shodil celou appku
      ocrModule = require('expo-text-extractor');
    } catch {
      ocrModule = null;
    }
  }
  return ocrModule;
}

interface VinScannerProps {
  visible: boolean;
  onClose: () => void;
  onVinDetected: (vin: string) => void;
}

export function VinScanner({ visible, onClose, onVinDetected }: VinScannerProps) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualVin, setManualVin] = useState('');
  const [ocrFailed, setOcrFailed] = useState(false);
  const cameraRef = useRef<any>(null);

  /**
   * Pustí OCR na obrázek a předvyplní nalezený VIN k potvrzení.
   * Uživatel výsledek vždy vidí a může ho opravit - OCR se u ražených
   * a špinavých štítků občas seknout může.
   */
  const runOcr = async (uri: string) => {
    setCapturedImage(uri);
    setOcrFailed(false);

    const ocr = getOcr();
    if (!ocr?.isSupported) {
      setIsProcessing(false);
      setShowManualInput(true);
      setOcrFailed(true);
      return;
    }

    setIsProcessing(true);
    try {
      const lines = await ocr.extractTextFromImage(uri);
      const vin = extractVINFromText(lines);
      if (vin) {
        setManualVin(vin);
      } else {
        setOcrFailed(true);
      }
    } catch (error) {
      setOcrFailed(true);
    } finally {
      setIsProcessing(false);
      setShowManualInput(true);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      await runOcr(photo.uri);
    } catch (error) {
      showAlert('Chyba', 'Nepodařilo se pořídit fotografii');
      setIsProcessing(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await runOcr(result.assets[0].uri);
    }
  };

  const handleManualEntry = () => {
    setShowManualInput(true);
  };

  const handleConfirmVin = () => {
    const cleanVin = normalizeVinInput(manualVin);

    if (cleanVin.length !== 17) {
      showAlert('Chyba', 'VIN musí mít přesně 17 znaků');
      return;
    }

    onVinDetected(cleanVin);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCapturedImage(null);
    setShowManualInput(false);
    setManualVin('');
    setOcrFailed(false);
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.permissionText, { color: theme.text }]}>
              Pro skenování VIN je potřeba přístup ke kameře
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: theme.accent }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Povolit kameru</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeTextButton} onPress={onClose}>
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>Zavřít</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Skenovat VIN</Text>
          <TouchableOpacity onPress={handleManualEntry} style={styles.headerButton}>
            <Ionicons name="keypad" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        {Platform.OS !== 'web' ? (
          <View style={styles.cameraContainer}>
            {capturedImage ? (
              <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
            ) : (
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
              >
                <View style={styles.overlay}>
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                  </View>
                  <Text style={styles.instructionText}>
                    Zaměřte VIN štítek do rámečku
                  </Text>
                </View>
              </CameraView>
            )}

            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Čtu VIN z fotky...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.webFallback, { backgroundColor: theme.background }]}>
            <Ionicons name="camera-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.webFallbackText, { color: theme.textSecondary }]}>
              Kamera není dostupná na webu
            </Text>
            <TouchableOpacity
              style={[styles.webManualButton, { backgroundColor: theme.accent }]}
              onPress={handleManualEntry}
            >
              <Text style={styles.webManualButtonText}>Zadat VIN ručně</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={[styles.controls, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: theme.inputBackground }]}
            onPress={handlePickImage}
          >
            <Ionicons name="images" size={24} color={theme.text} />
            <Text style={[styles.controlButtonText, { color: theme.text }]}>Galerie</Text>
          </TouchableOpacity>

          {Platform.OS !== 'web' && !capturedImage && (
            <TouchableOpacity
              style={[styles.captureButton, { backgroundColor: theme.accent }]}
              onPress={handleCapture}
              disabled={isProcessing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          )}

          {capturedImage && (
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.inputBackground }]}
              onPress={handleReset}
            >
              <Ionicons name="refresh" size={24} color={theme.text} />
              <Text style={[styles.controlButtonText, { color: theme.text }]}>Znovu</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: theme.inputBackground }]}
            onPress={handleManualEntry}
          >
            <Ionicons name="create" size={24} color={theme.text} />
            <Text style={[styles.controlButtonText, { color: theme.text }]}>Ručně</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Input Modal */}
        <Modal
          visible={showManualInput}
          transparent
          animationType="fade"
          onRequestClose={() => setShowManualInput(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {!capturedImage
                  ? 'Zadejte VIN'
                  : ocrFailed
                    ? 'Přepište VIN z fotky'
                    : 'Zkontrolujte VIN'}
              </Text>

              {capturedImage && (
                <Image source={{ uri: capturedImage }} style={styles.modalImage} />
              )}

              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {capturedImage && !ocrFailed
                  ? 'Načteno z fotky - ověřte správnost'
                  : capturedImage && ocrFailed
                    ? 'VIN se nepodařilo přečíst, zadejte ho ručně'
                    : 'Zadejte 17-místný VIN kód'}
              </Text>

              <TextInput
                style={[styles.vinInput, {
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  borderColor: capturedImage && !ocrFailed ? theme.accent : theme.border,
                }]}
                value={manualVin}
                onChangeText={setManualVin}
                // Záměrně ne ukázkový VIN - v šedé barvě vypadal jako načtená
                // hodnota a nebylo poznat, že je pole prázdné
                placeholder="–––––––––––––––––"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={17}
              />

              <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                {normalizeVinInput(manualVin).length}/17 znaků
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.inputBackground }]}
                  onPress={() => setShowManualInput(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>Zrušit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.confirmButton,
                    { backgroundColor: theme.accent },
                    normalizeVinInput(manualVin).length !== 17 && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirmVin}
                  disabled={normalizeVinInput(manualVin).length !== 17}
                >
                  <Text style={styles.confirmButtonText}>Potvrdit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  capturedImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 300,
    height: 100,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#e30613',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  webFallbackText: {
    fontSize: 16,
  },
  webManualButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  webManualButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 70,
    gap: 4,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeTextButton: {
    marginTop: 16,
  },
  closeText: {
    fontSize: 16,
  },
  // Manual Input Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  vinInput: {
    width: '100%',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
  },
  charCount: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {},
  confirmButton: {},
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});