import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const HIDE_TABS_STYLE_ID = 'autohity-hide-native-tabs';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const { isTablet } = useTabletLayout();
  const { users } = useUsers();
  const { user: currentUser } = useAuth();
  const isAdmin = !!users.find(u => u.id === currentUser?.id)?.isAdmin;

  // NativeTabs na webu prop `hidden` ignoruje - NativeTabsView.web.js ho vůbec
  // nečte a lištu s taby vykreslí vždy (na iOS/Androidu `hidden` funguje).
  // Na tabletu, kde navigaci obstarává sidebar, ji proto schováme přes CSS.
  // Obsah tabů zůstává namontovaný, mizí jen samotná lišta.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let el = document.getElementById(HIDE_TABS_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = HIDE_TABS_STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = isTablet ? '[role="tablist"] { display: none !important; }' : '';
  }, [isTablet]);

  return (
    // Hide native tab bar on tablet — sidebar is used instead
    <NativeTabs
      hidden={isTablet}
      tintColor={theme.accent}
      blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" />
        <NativeTabs.Trigger.Label>Výkupy</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="statistiky">
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
        <NativeTabs.Trigger.Label>Statistiky</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <NativeTabs.Trigger.Icon sf="bell.fill" md="notifications" />
        <NativeTabs.Trigger.Label>Notifikace</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reporty" hidden={!isAdmin}>
        <NativeTabs.Trigger.Icon sf="doc.text.fill" md="description" />
        <NativeTabs.Trigger.Label>Reporty</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}