import { useTheme } from '@/contexts/ThemeContext';
import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Akční tlačítka zarovnaná doprava vedle nadpisu. */
  actions?: ReactNode;
  /** Obsah pod nadpisem, uvnitř hlavičky (např. vyhledávací pole). */
  children?: ReactNode;
}

/**
 * Jednotná hlavička obrazovky. Každý tab měl dřív vlastní variantu (jiná
 * velikost nadpisu, jiné odsazení, některé uvnitř ScrollView a jiné nad ním),
 * což bylo mezi taby vidět. Hlavička je pevná - patří NAD scrollovací obsah,
 * ne dovnitř něj.
 */
export function ScreenHeader({ title, subtitle, actions, children }: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.titleGroup}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
            ) : null}
          </View>
          {actions}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
});
