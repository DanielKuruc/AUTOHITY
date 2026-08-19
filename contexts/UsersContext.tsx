import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '@/services/apiService';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name?: string; // computed field
  email?: string;
  phoneNumber?: string;
  isAdmin?: boolean;
}

interface UsersContextType {
  users: User[];
  isLoading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiService.listUsers();
      if (result.success && result.data) {
        // Parse API response - API vrací: { users: [...] }
        const apiUsers = result.data.users || result.data;
        const parsedUsers = Array.isArray(apiUsers) ? apiUsers.map((user: any) => {
          return {
            id: user.id,
            firstName: user.firstName || user.first_name || '',
            lastName: user.lastName || user.last_name || '',
            name: user.name || `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim(),
            email: user.email || '',
            phoneNumber: user.phoneNumber || user.phone_number || user.phone || '',
            isAdmin: user.isAdmin || false,
          };
        }) : [];
        setUsers(parsedUsers);
      } else {
        throw new Error(result.error || 'Chyba při načítání uživatelů');
      }
    } catch (err: any) {
      setError(err.message);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  return (
    <UsersContext.Provider value={{ users, isLoading, error, refreshUsers }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers musí být použit uvnitř UsersProvider');
  }
  return context;
};