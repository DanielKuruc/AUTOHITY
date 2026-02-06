import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function NewPurchaseLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="zakladni"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="automobil"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="stav-soucasti"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="souhrn"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="foto-vady"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0.1,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});