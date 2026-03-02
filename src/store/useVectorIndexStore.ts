import { create } from 'zustand';
import type { IndexProgress, SearchResult, IndexingConfig } from '../types/vectorIndex';
import { DEFAULT_INDEXING_CONFIG } from '../types/vectorIndex';

interface VectorIndexState {
  // Estado da indexação
  isIndexing: boolean;
  indexProgress: IndexProgress | null;
  indexError: string | null;
  indexingConfig: IndexingConfig;

  // Estado da busca
  isSearching: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  searchError: string | null;

  // Metadados
  lastIndexedAt: Date | null;
  totalFiles: number;
  totalChunks: number;

  // Actions
  setIsIndexing: (isIndexing: boolean) => void;
  setIndexProgress: (progress: IndexProgress | null) => void;
  setIndexError: (error: string | null) => void;
  setIndexingConfig: (config: IndexingConfig) => void;

  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchError: (error: string | null) => void;

  setMetadata: (metadata: {
    lastIndexedAt: Date | null;
    totalFiles: number;
    totalChunks: number;
  }) => void;

  reset: () => void;
}

export const useVectorIndexStore = create<VectorIndexState>((set) => ({
  // Estado inicial
  isIndexing: false,
  indexProgress: null,
  indexError: null,
  indexingConfig: DEFAULT_INDEXING_CONFIG,

  isSearching: false,
  searchQuery: '',
  searchResults: [],
  searchError: null,

  lastIndexedAt: null,
  totalFiles: 0,
  totalChunks: 0,

  // Actions
  setIsIndexing: (isIndexing) => set({ isIndexing }),
  setIndexProgress: (indexProgress) => set({ indexProgress }),
  setIndexError: (indexError) => set({ indexError }),
  setIndexingConfig: (indexingConfig) => set({ indexingConfig }),

  setIsSearching: (isSearching) => set({ isSearching }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchError: (searchError) => set({ searchError }),

  setMetadata: (metadata) =>
    set({
      lastIndexedAt: metadata.lastIndexedAt,
      totalFiles: metadata.totalFiles,
      totalChunks: metadata.totalChunks,
    }),

  reset: () =>
    set({
      isIndexing: false,
      indexProgress: null,
      indexError: null,
      isSearching: false,
      searchQuery: '',
      searchResults: [],
      searchError: null,
    }),
}));
