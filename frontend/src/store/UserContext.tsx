import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from '../services';
import type { User } from '../types/';

interface UserContextType {
  users: User[];
  isLoading: boolean;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: number, user: Partial<User>) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  
  const loadUsers = async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<User[]>('/api/users');
        setUsers(data);
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        alert(`Erreur de chargement des utilisateurs depuis la base MySQL: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    void loadUsers();
  }, []);

  const addUser = async (newUser: Omit<User, 'id'>) => {
    const user = await apiRequest<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(newUser),
    });
    setUsers((prev) => [user, ...prev]);
  };

  const updateUser = async (id: number, updatedFields: Partial<User>) => {
    const existing = users.find((user) => user.id === id);
    if (!existing) return;

    const payload = { ...existing, ...updatedFields };

    const updated = await apiRequest<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    setUsers((prev) =>
      prev.map((user) => (user.id === id ? updated : user))
    );
  };

  const deleteUser = async (id: number) => {
    try {
      await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error(error);
    }

    setUsers((prev) => prev.filter((user) => user.id !== id));
  };

  return (
    <UserContext.Provider value={{ users, isLoading, addUser, updateUser, deleteUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
}