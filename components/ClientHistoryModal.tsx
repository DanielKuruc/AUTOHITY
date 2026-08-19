import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { apiService } from '@/services/apiService';

interface Client {
  id: number;
  client_type: 'company' | 'person';
  first_name?: string;
  last_name?: string;
  company_name?: string;
  ico?: string;
  dic?: string;
  phone?: string;
  street?: string;
  city?: string;
  postal_code?: string;
}

interface ClientHistoryModalProps {
  visible: boolean;
  type: 'company' | 'person';
  onSelect: (client: Client) => void;
  onClose: () => void;
}

export default function ClientHistoryModal({
  visible,
  type,
  onSelect,
  onClose,
}: ClientHistoryModalProps) {
  const insets = useSafeAreaInsets();
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    accent: '#FF3B30',
    inputBackground: '#F2F2F7',
    border: '#E5E5E7',
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Načti všechna data když se modal otevře
  const loadAllClients = useCallback(async () => {
    setLoading(true);
    try {
      let clients;
      if (type === 'company') {
        clients = await apiService.searchCompaniesByFulltext('');
      } else {
        clients = await apiService.searchPeopleByFulltext('');
      }
      setAllClients(clients || []);
      setResults(clients || []);
    } catch (error: any) {
      // Error handled silently
      setAllClients([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  // Lokální fuzzy search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (!query.trim()) {
        // Bez query - zobraz všechna data
        setResults(allClients);
        return;
      }

      // Fuzzy search v již načtených datech
      const filtered = allClients.filter((client: any) => {
        const queryLower = query.toLowerCase();
        if (type === 'company') {
          const companyName = (client.company_name || '').toLowerCase();
          const ico = (client.ico || '').toLowerCase();
          const dic = (client.dic || '').toLowerCase();
          return companyName.includes(queryLower) || 
                 ico.includes(queryLower) || 
                 dic.includes(queryLower);
        } else {
          const firstName = (client.first_name || '').toLowerCase();
          const lastName = (client.last_name || '').toLowerCase();
          const phone = (client.phone || '').toLowerCase();
          return firstName.includes(queryLower) || 
                 lastName.includes(queryLower) || 
                 phone.includes(queryLower);
        }
      });

      setResults(filtered);
    },
    [allClients, type]
  );

  const handleSelectClient = (client: Client) => {
    onSelect(client);
    setSearchQuery('');
    setResults([]);
    onClose();
  };

  const renderCompanyItem = (client: Client) => (
    <TouchableOpacity
      style={[styles.clientItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleSelectClient(client)}
    >
      <View style={styles.clientIcon}>
        <Ionicons name="briefcase" size={20} color={theme.accent} />
      </View>
      <View style={styles.clientInfo}>
        <Text style={[styles.clientName, { color: theme.text }]}>
          {client.company_name || 'Neznámá firma'}
        </Text>
        {client.ico && (
          <Text style={[styles.clientDetail, { color: theme.textSecondary }]}>
            IČO: {client.ico}
          </Text>
        )}
        {client.dic && (
          <Text style={[styles.clientDetail, { color: theme.textSecondary }]}>
            DIČ: {client.dic}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  const renderPersonItem = (client: Client) => (
    <TouchableOpacity
      style={[styles.clientItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => handleSelectClient(client)}
    >
      <View style={styles.clientIcon}>
        <Ionicons name="person" size={20} color={theme.accent} />
      </View>
      <View style={styles.clientInfo}>
        <Text style={[styles.clientName, { color: theme.text }]}>
          {client.last_name} {client.first_name}
        </Text>
        {client.phone && (
          <Text style={[styles.clientDetail, { color: theme.textSecondary }]}>
            {client.phone}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Client }) => {
    return type === 'company' ? renderCompanyItem(item) : renderPersonItem(item);
  };

  const emptyMessage =
    type === 'company'
      ? 'Zadejte IČO, DIČ nebo název firmy'
      : 'Zadejte jméno, příjmení nebo telefon';

  // Načti data když se modal otevře
  React.useEffect(() => {
    if (visible) {
      loadAllClients();
    } else {
      setSearchQuery('');
      setResults([]);
    }
  }, [visible, loadAllClients]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {type === 'company' ? 'Výběr firmy' : 'Výběr osoby'}
          </Text>
          <View style={styles.closeButtonPlaceholder} />
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder={
              type === 'company'
                ? 'Hledej IČO, DIČ, název...'
                : 'Hledej jméno, příjmení, telefon...'
            }
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setResults(allClients);
              }}
            >
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={type === 'company' ? 'briefcase' : 'person'}
              size={48}
              color={theme.textTertiary}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery ? 'Nic nenalezeno' : emptyMessage}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonPlaceholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  clientIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFE5E5',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});