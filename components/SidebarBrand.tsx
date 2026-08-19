import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

/**
 * Hlavička sidebaru s logem a názvem aplikace. Záporné okraje ruší vodorovné
 * odsazení sidebaru, aby spodní linka sahala přes celou jeho šířku - stejný
 * princip jako u SidebarUserSection dole.
 */
export function SidebarBrand() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <Image
        source={require('@/assets/images/autohity-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        AUTOHITY - Výkup
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
    marginTop: -16,
    paddingTop: 16,
    marginLeft: -12,
    marginRight: -12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  logo: {
    width: 32,
    height: 32,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
});
