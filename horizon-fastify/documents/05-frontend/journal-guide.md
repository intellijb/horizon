# Journal Feature - Frontend Implementation Guide

## Table of Contents
1. [API Overview](#api-overview)
2. [Data Models](#data-models)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [React Query Setup](#react-query-setup)
5. [API Client Implementation](#api-client-implementation)
6. [React Query Hooks](#react-query-hooks)
7. [React Native Components](#react-native-components)
8. [Usage Examples](#usage-examples)
9. [Error Handling](#error-handling)
10. [Optimistic Updates](#optimistic-updates)

## API Overview

The Journal API allows users to create customizable journal cards and track daily inputs. The system is designed for flexibility, allowing any type of journaling (health, mood, habits, goals, etc.).

**Base URL**: `http://localhost:20000/api/journal`

**Key Concepts**:
- **Journal Cards**: Templates/categories for journal entries (e.g., "Morning Run", "Mood Check", "Water Intake")
- **Journal Inputs**: Actual daily entries linked to cards with values and timestamps
- **Status Management**: Inputs can be active, archived, or deleted
- **Date-based Queries**: Retrieve entries by specific dates or today's entries

## Data Models

### JournalCard
```typescript
interface JournalCard {
  id: string;
  category: string;  // e.g., "health", "mood", "productivity"
  type: string;      // e.g., "exercise", "emotion", "task"
  name: string;      // e.g., "Morning Run", "Daily Mood"
  order: number;     // Display order (lower = higher priority)
}
```

### JournalCardInput
```typescript
interface JournalCardInput {
  id: string;
  date: string;      // Format: "YYYY-MM-DD"
  status: "active" | "archived" | "deleted";
  cardId: string;    // Reference to JournalCard
  order: number;     // Display order for the day
  value: string;     // The actual input value/content
}
```

### Request/Response Types
```typescript
// Request types
interface CreateJournalCardRequest {
  category: string;
  type: string;
  name: string;
  order?: number;  // Optional, defaults to 0
}

interface UpdateJournalCardRequest {
  category?: string;
  type?: string;
  name?: string;
  order?: number;
}

interface CreateJournalCardInputRequest {
  cardId: string;
  value: string;
  order?: number;
  status?: "active" | "archived" | "deleted";  // Defaults to "active"
}

interface UpdateJournalCardInputRequest {
  date?: string;    // "YYYY-MM-DD"
  status?: "active" | "archived" | "deleted";
  order?: number;
  value?: string;
}

// Batch response type
interface JournalDataResponse {
  cards: JournalCard[];
  inputs: JournalCardInput[];
}
```

## API Endpoints Reference

### Journal Card Endpoints

#### 1. Create Journal Card
- **Method**: `POST`
- **Endpoint**: `/cards`
- **Body**: `CreateJournalCardRequest`
- **Response**: `JournalCard`
- **Status**: `201 Created`

#### 2. Get All Journal Cards
- **Method**: `GET`
- **Endpoint**: `/cards`
- **Response**: `JournalCard[]`
- **Status**: `200 OK`
- **Notes**: Returns cards sorted by order

#### 3. Get Journal Card by ID
- **Method**: `GET`
- **Endpoint**: `/cards/:id`
- **Response**: `JournalCard`
- **Status**: `200 OK` or `404 Not Found`

#### 4. Update Journal Card
- **Method**: `PATCH`
- **Endpoint**: `/cards/:id`
- **Body**: `UpdateJournalCardRequest`
- **Response**: `JournalCard`
- **Status**: `200 OK` or `404 Not Found`

#### 5. Delete Journal Card
- **Method**: `DELETE`
- **Endpoint**: `/cards/:id`
- **Response**: No content
- **Status**: `204 No Content` or `404 Not Found`
- **Notes**: Cascades delete to all associated inputs

### Journal Input Endpoints

#### 6. Create Journal Input
- **Method**: `POST`
- **Endpoint**: `/inputs`
- **Body**: `CreateJournalCardInputRequest`
- **Response**: `JournalCardInput`
- **Status**: `201 Created` or `404 Not Found` (if card doesn't exist)
- **Notes**: Date automatically set to today in YYYY-MM-DD format

#### 7. Get Inputs by Card ID
- **Method**: `GET`
- **Endpoint**: `/inputs?cardId={cardId}`
- **Query Params**: `cardId` (required)
- **Response**: `JournalCardInput[]`
- **Status**: `200 OK`

#### 8. Get Inputs by Date
- **Method**: `GET`
- **Endpoint**: `/inputs/by-date?date={date}`
- **Query Params**: `date` (required, format: YYYY-MM-DD)
- **Response**: `JournalCardInput[]`
- **Status**: `200 OK`

#### 9. Get Today's Inputs
- **Method**: `GET`
- **Endpoint**: `/inputs/today`
- **Response**: `JournalCardInput[]`
- **Status**: `200 OK`

#### 10. Get Input by ID
- **Method**: `GET`
- **Endpoint**: `/inputs/:id`
- **Response**: `JournalCardInput`
- **Status**: `200 OK` or `404 Not Found`

#### 11. Update Journal Input
- **Method**: `PATCH`
- **Endpoint**: `/inputs/:id`
- **Body**: `UpdateJournalCardInputRequest`
- **Response**: `JournalCardInput`
- **Status**: `200 OK` or `404 Not Found`

#### 12. Delete Journal Input
- **Method**: `DELETE`
- **Endpoint**: `/inputs/:id`
- **Response**: No content
- **Status**: `204 No Content` or `404 Not Found`

#### 13. Archive Journal Input
- **Method**: `POST`
- **Endpoint**: `/inputs/:id/archive`
- **Response**: `JournalCardInput`
- **Status**: `200 OK` or `404 Not Found`
- **Notes**: Sets status to "archived"

#### 14. Activate Journal Input
- **Method**: `POST`
- **Endpoint**: `/inputs/:id/activate`
- **Response**: `JournalCardInput`
- **Status**: `200 OK` or `404 Not Found`
- **Notes**: Sets status to "active"

### Batch Endpoints

#### 15. Get Journal Data by Date
- **Method**: `GET`
- **Endpoint**: `/data/by-date?date={date}`
- **Query Params**: `date` (required, format: YYYY-MM-DD)
- **Response**: `JournalDataResponse`
- **Status**: `200 OK`
- **Notes**: Returns both cards and inputs for the specified date

#### 16. Get Today's Journal Data
- **Method**: `GET`
- **Endpoint**: `/data/today`
- **Response**: `JournalDataResponse`
- **Status**: `200 OK`
- **Notes**: Returns both cards and today's inputs

## React Query Setup

### Install Dependencies
```bash
npm install @tanstack/react-query
npm install @tanstack/react-query-devtools
```

### Query Client Configuration
```typescript
// app/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## API Client Implementation

### Base API Client
```typescript
// app/services/api/client.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:20000';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, error.message || response.statusText, error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const apiClient = {
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return handleResponse<T>(response);
  },

  async patch<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return handleResponse<T>(response);
  },

  async delete<T = void>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse<T>(response);
  },
};
```

### Journal API Service
```typescript
// app/services/api/journal.ts
import { apiClient } from './client';
import {
  JournalCard,
  JournalCardInput,
  CreateJournalCardRequest,
  UpdateJournalCardRequest,
  CreateJournalCardInputRequest,
  UpdateJournalCardInputRequest,
  JournalDataResponse,
} from './types';

export const journalApi = {
  // Card operations
  async createCard(data: CreateJournalCardRequest): Promise<JournalCard> {
    return apiClient.post('/api/journal/cards', data);
  },

  async getAllCards(): Promise<JournalCard[]> {
    return apiClient.get('/api/journal/cards');
  },

  async getCard(id: string): Promise<JournalCard> {
    return apiClient.get(`/api/journal/cards/${id}`);
  },

  async updateCard(id: string, data: UpdateJournalCardRequest): Promise<JournalCard> {
    return apiClient.patch(`/api/journal/cards/${id}`, data);
  },

  async deleteCard(id: string): Promise<void> {
    return apiClient.delete(`/api/journal/cards/${id}`);
  },

  // Input operations
  async createInput(data: CreateJournalCardInputRequest): Promise<JournalCardInput> {
    return apiClient.post('/api/journal/inputs', data);
  },

  async getInputsByCard(cardId: string): Promise<JournalCardInput[]> {
    return apiClient.get('/api/journal/inputs', { cardId });
  },

  async getInputsByDate(date: string): Promise<JournalCardInput[]> {
    return apiClient.get('/api/journal/inputs/by-date', { date });
  },

  async getTodayInputs(): Promise<JournalCardInput[]> {
    return apiClient.get('/api/journal/inputs/today');
  },

  async getInput(id: string): Promise<JournalCardInput> {
    return apiClient.get(`/api/journal/inputs/${id}`);
  },

  async updateInput(id: string, data: UpdateJournalCardInputRequest): Promise<JournalCardInput> {
    return apiClient.patch(`/api/journal/inputs/${id}`, data);
  },

  async deleteInput(id: string): Promise<void> {
    return apiClient.delete(`/api/journal/inputs/${id}`);
  },

  async archiveInput(id: string): Promise<JournalCardInput> {
    return apiClient.post(`/api/journal/inputs/${id}/archive`);
  },

  async activateInput(id: string): Promise<JournalCardInput> {
    return apiClient.post(`/api/journal/inputs/${id}/activate`);
  },

  // Batch operations
  async getDataByDate(date: string): Promise<JournalDataResponse> {
    return apiClient.get('/api/journal/data/by-date', { date });
  },

  async getTodayData(): Promise<JournalDataResponse> {
    return apiClient.get('/api/journal/data/today');
  },
};
```

## React Query Hooks

### Journal Card Hooks
```typescript
// app/hooks/useJournalCards.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journalApi } from '../services/api/journal';
import { CreateJournalCardRequest, UpdateJournalCardRequest } from '../services/api/types';

// Query Keys
export const journalKeys = {
  all: ['journal'] as const,
  cards: () => [...journalKeys.all, 'cards'] as const,
  card: (id: string) => [...journalKeys.cards(), id] as const,
  inputs: () => [...journalKeys.all, 'inputs'] as const,
  input: (id: string) => [...journalKeys.inputs(), id] as const,
  inputsByCard: (cardId: string) => [...journalKeys.inputs(), 'byCard', cardId] as const,
  inputsByDate: (date: string) => [...journalKeys.inputs(), 'byDate', date] as const,
  todayInputs: () => [...journalKeys.inputs(), 'today'] as const,
  dataByDate: (date: string) => [...journalKeys.all, 'data', 'byDate', date] as const,
  todayData: () => [...journalKeys.all, 'data', 'today'] as const,
};

// Get all cards
export function useJournalCards() {
  return useQuery({
    queryKey: journalKeys.cards(),
    queryFn: journalApi.getAllCards,
  });
}

// Get single card
export function useJournalCard(id: string) {
  return useQuery({
    queryKey: journalKeys.card(id),
    queryFn: () => journalApi.getCard(id),
    enabled: !!id,
  });
}

// Create card
export function useCreateJournalCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalCardRequest) => journalApi.createCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.cards() });
      queryClient.invalidateQueries({ queryKey: journalKeys.todayData() });
    },
  });
}

// Update card
export function useUpdateJournalCard(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJournalCardRequest) => journalApi.updateCard(id, data),
    onSuccess: (updatedCard) => {
      queryClient.setQueryData(journalKeys.card(id), updatedCard);
      queryClient.invalidateQueries({ queryKey: journalKeys.cards() });
    },
  });
}

// Delete card
export function useDeleteJournalCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalApi.deleteCard(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: journalKeys.cards() });
      queryClient.invalidateQueries({ queryKey: journalKeys.inputs() });
      queryClient.removeQueries({ queryKey: journalKeys.card(id) });
    },
  });
}
```

### Journal Input Hooks
```typescript
// app/hooks/useJournalInputs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journalApi } from '../services/api/journal';
import { CreateJournalCardInputRequest, UpdateJournalCardInputRequest } from '../services/api/types';
import { journalKeys } from './useJournalCards';

// Get today's inputs
export function useTodayInputs() {
  return useQuery({
    queryKey: journalKeys.todayInputs(),
    queryFn: journalApi.getTodayInputs,
  });
}

// Get inputs by date
export function useInputsByDate(date: string) {
  return useQuery({
    queryKey: journalKeys.inputsByDate(date),
    queryFn: () => journalApi.getInputsByDate(date),
    enabled: !!date,
  });
}

// Get inputs by card
export function useInputsByCard(cardId: string) {
  return useQuery({
    queryKey: journalKeys.inputsByCard(cardId),
    queryFn: () => journalApi.getInputsByCard(cardId),
    enabled: !!cardId,
  });
}

// Create input
export function useCreateJournalInput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalCardInputRequest) => journalApi.createInput(data),
    onSuccess: (newInput) => {
      // Invalidate all input queries
      queryClient.invalidateQueries({ queryKey: journalKeys.inputs() });
      queryClient.invalidateQueries({ queryKey: journalKeys.todayData() });
      queryClient.invalidateQueries({ queryKey: journalKeys.inputsByCard(newInput.cardId) });
    },
  });
}

// Update input
export function useUpdateJournalInput(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJournalCardInputRequest) => journalApi.updateInput(id, data),
    onSuccess: (updatedInput) => {
      queryClient.setQueryData(journalKeys.input(id), updatedInput);
      queryClient.invalidateQueries({ queryKey: journalKeys.inputs() });
      queryClient.invalidateQueries({ queryKey: journalKeys.inputsByCard(updatedInput.cardId) });
    },
  });
}

// Delete input
export function useDeleteJournalInput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalApi.deleteInput(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.inputs() });
      queryClient.invalidateQueries({ queryKey: journalKeys.todayData() });
    },
  });
}

// Archive input
export function useArchiveJournalInput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalApi.archiveInput(id),
    onSuccess: (updatedInput) => {
      queryClient.setQueryData(journalKeys.input(updatedInput.id), updatedInput);
      queryClient.invalidateQueries({ queryKey: journalKeys.inputs() });
    },
  });
}

// Activate input
export function useActivateJournalInput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => journalApi.activateInput(id),
    onSuccess: (updatedInput) => {
      queryClient.setQueryData(journalKeys.input(updatedInput.id), updatedInput);
      queryClient.invalidateQueries({ queryKey: journalKeys.inputs() });
    },
  });
}
```

### Batch Data Hooks
```typescript
// app/hooks/useJournalData.ts
import { useQuery } from '@tanstack/react-query';
import { journalApi } from '../services/api/journal';
import { journalKeys } from './useJournalCards';

// Get today's data (cards + inputs)
export function useTodayJournalData() {
  return useQuery({
    queryKey: journalKeys.todayData(),
    queryFn: journalApi.getTodayData,
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Get data by date
export function useJournalDataByDate(date: string) {
  return useQuery({
    queryKey: journalKeys.dataByDate(date),
    queryFn: () => journalApi.getDataByDate(date),
    enabled: !!date,
  });
}
```

## React Native Components

### Journal Card List Component
```tsx
// app/components/JournalCardList.tsx
import React from 'react';
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useJournalCards } from '../hooks/useJournalCards';
import { JournalCard } from '../services/api/types';

interface JournalCardListProps {
  onCardPress: (card: JournalCard) => void;
}

export function JournalCardList({ onCardPress }: JournalCardListProps) {
  const { data: cards, isLoading, error } = useJournalCards();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Failed to load journal cards</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cards}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onCardPress(item)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardCategory}>{item.category}</Text>
          </View>
          <Text style={styles.cardType}>{item.type}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardCategory: {
    fontSize: 14,
    color: '#666',
  },
  cardType: {
    fontSize: 14,
    color: '#999',
  },
});
```

### Today's Journal View
```tsx
// app/components/TodayJournal.tsx
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useTodayJournalData } from '../hooks/useJournalData';
import { useCreateJournalInput, useUpdateJournalInput } from '../hooks/useJournalInputs';
import { JournalCard, JournalCardInput } from '../services/api/types';

export function TodayJournal() {
  const { data, isLoading, refetch } = useTodayJournalData();
  const createInput = useCreateJournalInput();
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [editingInputs, setEditingInputs] = useState<Record<string, string>>({});

  const handleCreateInput = async (card: JournalCard) => {
    const value = inputValues[card.id];
    if (!value?.trim()) return;

    await createInput.mutateAsync({
      cardId: card.id,
      value: value.trim(),
    });

    setInputValues(prev => ({ ...prev, [card.id]: '' }));
  };

  const handleUpdateInput = (inputId: string) => {
    const updateMutation = useUpdateJournalInput(inputId);
    const value = editingInputs[inputId];

    if (!value?.trim()) return;

    updateMutation.mutate({ value: value.trim() });
    setEditingInputs(prev => {
      const next = { ...prev };
      delete next[inputId];
      return next;
    });
  };

  const getInputForCard = (cardId: string): JournalCardInput | undefined => {
    return data?.inputs.find(input => input.cardId === cardId && input.status === 'active');
  };

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      <Text style={styles.title}>Today's Journal</Text>

      {data.cards.map(card => {
        const existingInput = getInputForCard(card.id);
        const isEditing = existingInput && editingInputs[existingInput.id] !== undefined;

        return (
          <View key={card.id} style={styles.cardSection}>
            <Text style={styles.cardTitle}>{card.name}</Text>

            {existingInput ? (
              <View style={styles.inputContainer}>
                {isEditing ? (
                  <>
                    <TextInput
                      style={styles.input}
                      value={editingInputs[existingInput.id]}
                      onChangeText={text => setEditingInputs(prev => ({
                        ...prev,
                        [existingInput.id]: text,
                      }))}
                      placeholder="Update your entry"
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => handleUpdateInput(existingInput.id)}
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputValue}>{existingInput.value}</Text>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setEditingInputs(prev => ({
                        ...prev,
                        [existingInput.id]: existingInput.value,
                      }))}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputValues[card.id] || ''}
                  onChangeText={text => setInputValues(prev => ({
                    ...prev,
                    [card.id]: text,
                  }))}
                  placeholder={`Enter ${card.name.toLowerCase()}`}
                  multiline
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => handleCreateInput(card)}
                  disabled={!inputValues[card.id]?.trim()}
                >
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
  },
  cardSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputValue: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
```

## Usage Examples

### Complete Implementation Example
```tsx
// app/screens/JournalScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TodayJournal } from '../components/TodayJournal';
import { JournalCardList } from '../components/JournalCardList';
import { CreateJournalCardModal } from '../components/CreateJournalCardModal';

export function JournalScreen() {
  const [showCardList, setShowCardList] = useState(false);

  return (
    <View style={styles.container}>
      {showCardList ? (
        <JournalCardList onCardPress={(card) => console.log('Selected:', card)} />
      ) : (
        <TodayJournal />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Creating a New Journal Card
```tsx
const createCard = useCreateJournalCard();

const handleCreateCard = async () => {
  try {
    const newCard = await createCard.mutateAsync({
      category: 'health',
      type: 'exercise',
      name: 'Evening Yoga',
      order: 2,
    });
    console.log('Created card:', newCard);
  } catch (error) {
    console.error('Failed to create card:', error);
  }
};
```

### Fetching Historical Data
```tsx
const { data } = useJournalDataByDate('2025-09-20');

// Display cards and inputs for that date
data?.cards.forEach(card => {
  const inputs = data.inputs.filter(i => i.cardId === card.id);
  console.log(`${card.name}: ${inputs.length} entries`);
});
```

## Error Handling

### Global Error Handler
```tsx
// app/utils/errorHandler.ts
import { ApiError } from '../services/api/client';

export function handleJournalError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        return 'Journal entry not found';
      case 400:
        return 'Invalid input data';
      case 500:
        return 'Server error. Please try again later';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }

  return 'Network error. Please check your connection';
}
```

### Using Error Handler in Components
```tsx
const { error } = useJournalCards();

if (error) {
  return <Text>{handleJournalError(error)}</Text>;
}
```

## Optimistic Updates

### Example: Optimistic Input Update
```tsx
export function useOptimisticUpdateInput(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJournalCardInputRequest) =>
      journalApi.updateInput(id, data),

    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: journalKeys.input(id) });

      // Snapshot previous value
      const previousInput = queryClient.getQueryData(journalKeys.input(id));

      // Optimistically update
      queryClient.setQueryData(journalKeys.input(id), (old: any) => ({
        ...old,
        ...newData,
      }));

      return { previousInput };
    },

    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousInput) {
        queryClient.setQueryData(journalKeys.input(id), context.previousInput);
      }
    },

    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: journalKeys.input(id) });
    },
  });
}
```

## Best Practices

1. **Use Query Keys Consistently**: Always use the centralized `journalKeys` object for query keys
2. **Handle Loading States**: Show appropriate loading indicators during data fetching
3. **Implement Pull-to-Refresh**: Use RefreshControl for better UX
4. **Cache Management**: Configure appropriate stale times based on data update frequency
5. **Error Boundaries**: Implement error boundaries to catch rendering errors
6. **Optimistic Updates**: Use for better perceived performance on slow networks
7. **Date Formatting**: Always use YYYY-MM-DD format for date parameters
8. **Status Management**: Track input status (active/archived/deleted) for proper filtering

## Testing

### Mock API for Development
```typescript
// app/services/api/__mocks__/journal.ts
export const mockJournalApi = {
  getAllCards: jest.fn().mockResolvedValue([
    { id: '1', category: 'health', type: 'exercise', name: 'Morning Run', order: 1 },
  ]),
  createInput: jest.fn().mockResolvedValue({
    id: '1',
    date: '2025-09-22',
    status: 'active',
    cardId: '1',
    order: 1,
    value: 'Test input',
  }),
  // ... other mocked methods
};
```

### Testing Hooks
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJournalCards } from '../hooks/useJournalCards';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

test('useJournalCards fetches cards', async () => {
  const { result } = renderHook(() => useJournalCards(), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(1);
});
```

## Deployment Considerations

1. **Environment Variables**:
   ```bash
   EXPO_PUBLIC_API_URL=https://api.yourdomain.com
   ```

2. **API Security**:
   - Add authentication headers to API client
   - Implement token refresh logic
   - Use HTTPS in production

3. **Performance**:
   - Implement pagination for large datasets
   - Use React.memo for expensive components
   - Consider implementing virtual lists for long card lists

4. **Offline Support**:
   - Configure React Query persistence
   - Implement offline queue for mutations
   - Show offline indicators in UI