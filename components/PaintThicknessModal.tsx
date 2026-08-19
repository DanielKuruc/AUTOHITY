import { PaintThicknessReading, PaintZoneKey } from '@/constants/types';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

interface ZoneConfig {
  key: PaintZoneKey;
  label: string;
  top: number; // % from top of diagram box
  left: number; // % from left of diagram box
}

// Pevná velikost diagramu (stejná na iPhone i iPad) - poměr stran zachovává viewBox 400x240
const DIAGRAM_WIDTH = 380;
const DIAGRAM_HEIGHT = 228;

// Pozice odpovídají autu natočenému přídí doleva (nahoře = pravá strana, dole = levá strana)
const ZONES: ZoneConfig[] = [
  { key: 'fenderFrontRight', label: 'Pravý přední blatník', top: 12, left: 15 },
  { key: 'doorFrontRight', label: 'Pravé přední dveře', top: 4, left: 39 },
  { key: 'doorRearRight', label: 'Pravé zadní dveře', top: 4, left: 60 },
  { key: 'fenderRearRight', label: 'Pravý zadní blatník', top: 12, left: 84 },
  { key: 'hood', label: 'Kapota', top: 46, left: 15 },
  { key: 'roof', label: 'Střecha', top: 46, left: 49 },
  { key: 'tailgate', label: 'Páté dveře', top: 46, left: 84 },
  { key: 'fenderFrontLeft', label: 'Levý přední blatník', top: 80, left: 15 },
  { key: 'doorFrontLeft', label: 'Levé přední dveře', top: 88, left: 39 },
  { key: 'doorRearLeft', label: 'Levé zadní dveře', top: 88, left: 60 },
  { key: 'fenderRearLeft', label: 'Levý zadní blatník', top: 80, left: 84 },
];

type PaintReadingMap = Partial<Record<PaintZoneKey, number | null>>;

/** DB tvar (pole) -> tvar pro editaci (mapa podle panelu) */
function toMap(readings: PaintThicknessReading[] | undefined): PaintReadingMap {
  const map: PaintReadingMap = {};
  (readings ?? []).forEach((r) => {
    map[r.zone] = r.valueUm;
  });
  return map;
}

/** Tvar pro editaci -> DB tvar; nezměřené panely se neposílají */
function toReadings(map: PaintReadingMap): PaintThicknessReading[] {
  return ZONES.filter((z) => map[z.key] != null).map((z) => ({
    zone: z.key,
    valueUm: map[z.key] as number,
  }));
}

type PaintFlag = 'warning' | 'filler';

function useFlags(map: PaintReadingMap): Partial<Record<PaintZoneKey, PaintFlag>> {
  return useMemo(() => {
    const values = ZONES.map((z) => map[z.key]).filter((v): v is number => v != null);
    if (values.length === 0) return {};
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const flags: Partial<Record<PaintZoneKey, PaintFlag>> = {};
    ZONES.forEach(({ key }) => {
      const value = map[key];
      if (value == null || median === 0) return;
      const ratio = value / median;
      if (ratio >= 2) flags[key] = 'filler';
      else if (ratio >= 1.3) flags[key] = 'warning';
    });
    return flags;
  }, [map]);
}

interface PaintThicknessModalProps {
  visible: boolean;
  onClose: () => void;
  /** Naměřené hodnoty z výkupu */
  readings?: PaintThicknessReading[];
  /** Uloží hodnoty; když není zadáno, modal je jen ke čtení */
  onSave?: (readings: PaintThicknessReading[]) => Promise<void> | void;
  /** Otevře modal přímo v editaci - pro formuláře (nový výkup / úprava výkupu) */
  startInEditMode?: boolean;
}

export function PaintThicknessModal({
  visible,
  onClose,
  readings,
  onSave,
  startInEditMode,
}: PaintThicknessModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Obsah montujeme jen když je modal otevřený, aby se stav vždy načetl znovu z props */}
      {visible ? (
        <PaintThicknessContent
          readings={readings}
          onSave={onSave}
          onClose={onClose}
          startInEditMode={startInEditMode}
        />
      ) : null}
    </Modal>
  );
}

function PaintThicknessContent({
  readings,
  onSave,
  onClose,
  startInEditMode,
}: {
  readings?: PaintThicknessReading[];
  onSave?: (readings: PaintThicknessReading[]) => Promise<void> | void;
  onClose: () => void;
  startInEditMode?: boolean;
}) {
  const { theme } = useTheme();
  const [map, setMap] = useState<PaintReadingMap>(() => toMap(readings));
  const [editMode, setEditMode] = useState(!!startInEditMode && !!onSave);
  const [saving, setSaving] = useState(false);
  const flags = useFlags(map);

  const measuredCount = ZONES.filter((z) => map[z.key] != null).length;

  const handleChange = (key: PaintZoneKey, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setMap((prev) => ({ ...prev, [key]: cleaned === '' ? null : Number(cleaned) }));
  };

  const handleToggleEdit = async () => {
    if (!editMode) {
      setEditMode(true);
      return;
    }
    // Ukládáme až při opuštění edit módu
    if (onSave) {
      setSaving(true);
      try {
        await onSave(toReadings(map));
        // Ve formuláři je editace jediný účel modalu - po potvrzení zavíráme
        if (startInEditMode) {
          onClose();
          return;
        }
        setEditMode(false);
      } finally {
        setSaving(false);
      }
    } else {
      setEditMode(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
      <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Tloušťky laku</Text>
          <View style={styles.headerActions}>
            {onSave && (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: editMode ? theme.accent : theme.inputBackground }]}
                onPress={handleToggleEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.editButtonText, { color: editMode ? '#FFFFFF' : theme.text }]}>
                    {editMode ? 'Hotovo' : 'Upravit'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.inputBackground }]}
              onPress={onClose}
              disabled={saving}
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {measuredCount === 0 && !editMode && (
            <View style={[styles.emptyState, { backgroundColor: theme.inputBackground }]}>
              <Ionicons name="color-fill-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                {onSave
                  ? 'Zatím nezměřeno. Klepnutím na Upravit zadáte hodnoty.'
                  : 'Zatím nezměřeno.'}
              </Text>
            </View>
          )}

          <Text style={[styles.sideLabel, { color: theme.textSecondary }]}>Pravá strana</Text>

          <View style={styles.diagramWrapper}>
            <Svg viewBox="0 0 400 240" style={StyleSheet.absoluteFill}>
              {/* kola - kreslena pod karoserii, aby je blatník částečně překrýval */}
              <Circle cx={122} cy={44} r={16} stroke={theme.border} strokeWidth={2} fill="none" />
              <Circle cx={122} cy={196} r={16} stroke={theme.border} strokeWidth={2} fill="none" />
              <Circle cx={278} cy={44} r={16} stroke={theme.border} strokeWidth={2} fill="none" />
              <Circle cx={278} cy={196} r={16} stroke={theme.border} strokeWidth={2} fill="none" />

              {/* karoserie - zaoblená příď (vlevo), plošší záď (vpravo); vyplněná barvou pozadí, aby překryla vnitřní část kol */}
              <Path
                d="M 112,50 L 314,50 Q 330,50 330,66 L 330,174 Q 330,190 314,190 L 112,190 Q 70,190 70,148 L 70,92 Q 70,50 112,50 Z"
                stroke={theme.border}
                strokeWidth={2}
                fill={theme.card}
              />
              {/* střecha */}
              <Rect x={155} y={78} width={90} height={84} rx={18} ry={18} stroke={theme.border} strokeWidth={1.5} fill="none" />
              {/* dělící linie dveří */}
              <Line x1={150} y1={50} x2={150} y2={190} stroke={theme.border} strokeWidth={1.5} />
              <Line x1={250} y1={50} x2={250} y2={190} stroke={theme.border} strokeWidth={1.5} />
              {/* světlomety vpředu (oblé) */}
              <Rect x={78} y={64} width={16} height={7} rx={3.5} stroke={theme.border} strokeWidth={1.5} fill="none" />
              <Rect x={78} y={169} width={16} height={7} rx={3.5} stroke={theme.border} strokeWidth={1.5} fill="none" />
              {/* zadní světla (hranatá) */}
              <Rect x={308} y={68} width={14} height={9} rx={1.5} stroke={theme.border} strokeWidth={1.5} fill="none" />
              <Rect x={308} y={163} width={14} height={9} rx={1.5} stroke={theme.border} strokeWidth={1.5} fill="none" />
              {/* zpětná zrcátka */}
              <Rect x={76} y={36} width={10} height={7} rx={2} stroke={theme.border} strokeWidth={1.5} fill="none" />
              <Rect x={76} y={197} width={10} height={7} rx={2} stroke={theme.border} strokeWidth={1.5} fill="none" />

              {/* tečky - přesný bod měření, ke kterému se váže popisek */}
              {ZONES.map((zone) => (
                <Circle
                  key={`dot-${zone.key}`}
                  cx={(zone.left / 100) * 400}
                  cy={(zone.top / 100) * 240}
                  r={3}
                  fill={theme.textTertiary}
                />
              ))}
            </Svg>

            {ZONES.map((zone) => (
              <PaintZoneBadge
                key={zone.key}
                zone={zone}
                value={map[zone.key] ?? null}
                flag={flags[zone.key]}
                editMode={editMode}
                onChange={(text) => handleChange(zone.key, text)}
                theme={theme}
              />
            ))}
          </View>

          <Text style={[styles.sideLabel, { color: theme.textSecondary, marginBottom: 20 }]}>Levá strana</Text>

          <View style={styles.legend}>
            <LegendItem color={theme.warning} icon="warning" label="Odchylka od mediánu panelů" theme={theme} />
            <LegendItem color="#0A84FF" icon="water" label="Podezření na tmel / přestřik" theme={theme} />
            <LegendItem color={theme.textTertiary} icon="help-circle" label="Nezměřeno" theme={theme} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function PaintZoneBadge({
  zone,
  value,
  flag,
  editMode,
  onChange,
  theme,
}: {
  zone: ZoneConfig;
  value: number | null;
  flag?: PaintFlag;
  editMode: boolean;
  onChange: (text: string) => void;
  theme: any;
}) {
  const borderColor = flag === 'filler' ? '#0A84FF' : flag === 'warning' ? theme.warning : theme.border;

  return (
    <View
      style={[
        styles.zoneBadge,
        {
          top: (zone.top / 100) * DIAGRAM_HEIGHT,
          left: (zone.left / 100) * DIAGRAM_WIDTH,
          backgroundColor: theme.card,
          borderColor,
        },
      ]}
    >
      {editMode ? (
        <TextInput
          style={[styles.zoneInput, { color: theme.text }]}
          value={value != null ? String(value) : ''}
          onChangeText={onChange}
          keyboardType="number-pad"
          placeholder="—"
          placeholderTextColor={theme.textTertiary}
          maxLength={4}
          accessibilityLabel={zone.label}
        />
      ) : (
        <Text style={[styles.zoneValue, { color: theme.text }]} numberOfLines={1}>
          {value != null ? `${value} µm` : 'N/A'}
        </Text>
      )}
      {flag === 'filler' && <Ionicons name="water" size={12} color="#0A84FF" />}
      {flag === 'warning' && <Ionicons name="warning" size={12} color={theme.warning} />}
      {value == null && !editMode && <Ionicons name="help-circle" size={12} color={theme.textTertiary} />}
    </View>
  );
}

function LegendItem({ color, icon, label, theme }: { color: string; icon: any; label: string; theme: any }) {
  return (
    <View style={styles.legendItem}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.legendText, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 14,
    height: 36,
    minWidth: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 13,
    flex: 1,
  },
  sideLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  diagramWrapper: {
    width: DIAGRAM_WIDTH,
    height: DIAGRAM_HEIGHT,
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  zoneBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    transform: [{ translateX: -30 }, { translateY: -12 }],
  },
  zoneValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  zoneInput: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 34,
    padding: 0,
  },
  legend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 13,
  },
});
