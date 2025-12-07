import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Purchase, PurchaseState } from '@/constants/types';
import { useTheme } from '@/contexts/ThemeContext';

interface PurchaseCardProps {
  purchase: Purchase;
}

export function PurchaseCard({ purchase }: PurchaseCardProps) {
  const { theme } = useTheme();

  const getStateColor = (state: PurchaseState) => {
    switch (state) {
      case PurchaseState.NEW:
        return theme.accent;
      case PurchaseState.IN_PROGRESS:
        return theme.warning;
      case PurchaseState.COMPLETED:
        return theme.success;
      case PurchaseState.CANCELLED:
        return theme.error;
      default:
        return theme.textTertiary;
    }
  };

  const getStateLabel = (state: PurchaseState) => {
    switch (state) {
      case PurchaseState.NEW:
        return 'Nový';
      case PurchaseState.IN_PROGRESS:
        return 'Probíhá';
      case PurchaseState.COMPLETED:
        return 'Dokončen';
      case PurchaseState.CANCELLED:
        return 'Zrušen';
      default:
        return state;
    }
  };

  const handlePress = () => {
    router.push(`/purchase/${purchase.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const stateColor = getStateColor(purchase.purchaseState);
  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.card }]} 
      onPress={handlePress} 
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Left side - Photo thumbnail */}
        <View style={[styles.imageContainer, { backgroundColor: theme.inputBackground }]}>
          {purchase.images && purchase.images.length > 0 ? (
            <Image 
              source={{ uri: purchase.images[0] }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="car" size={28} color={theme.textTertiary} />
          )}
        </View>

        {/* Middle - Info */}
        <View style={styles.infoContainer}>
          {purchase.carDetails && (
            <Text style={[styles.carName, { color: theme.text }]} numberOfLines={1}>
              {purchase.carDetails.make} {purchase.carDetails.model}
              {purchase.carDetails.year && ` (${purchase.carDetails.year})`}
            </Text>
          )}
          <Text style={[styles.clientName, { color: theme.accent }]} numberOfLines={1}>
            {purchase.clientName}
          </Text>
          <Text style={[styles.spz, { color: theme.textTertiary }]}>
            {purchase.spz}
          </Text>
          <Text style={[styles.date, { color: theme.textTertiary }]}>
            {formatDate(purchase.purchaseDate)}
          </Text>
        </View>

        {/* Right side - State and Amount */}
        <View style={styles.rightContainer}>
          <View style={[styles.stateBadge, { backgroundColor: stateColor + '20' }]}>
            <Text style={[styles.stateText, { color: stateColor }]}>
              {getStateLabel(purchase.purchaseState)}
            </Text>
          </View>
          {purchase.totalAmount && (
            <Text style={[styles.amount, { color: theme.text }]}>
              {purchase.totalAmount.toLocaleString('cs-CZ')} Kč
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  carName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  spz: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
  rightContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  stateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
});