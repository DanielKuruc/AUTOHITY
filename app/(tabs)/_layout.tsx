import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const { isTablet } = useTabletLayout();
  const { user } = useAuth();
  const { users } = useUsers();
  const { user: currentUser } = useAuth();
  
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        headerTitleStyle: styles.headerTitle,
        tabBarStyle: { 
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          // Hide bottom tabs on tablet (sidebar will be used instead)
          display: isTablet ? 'none' : 'flex',
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Výkupy',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistiky"
        options={{
          title: 'Statistiky',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifikace',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />

        <Tabs.Screen
          name="reporty"
          options={{
            title: 'Reporty',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          href: users.find(u => u.id === currentUser?.id)?.isAdmin ? '/(tabs)/reporty' : null,
          }}
        />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontWeight: '600',
    fontSize: 17,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});