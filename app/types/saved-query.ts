import type { SerializableQueryState } from '@/stores/query-builder'

export interface SavedQuery {
  id: string
  name: string
  description: string
  tags: string[]
  connectionId: string
  query: SerializableQueryState
  createdAt: string
  updatedAt: string
}

export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  connectionId: string
  createdAt: string
  updatedAt: string
}

export interface SaveQueryRequest {
  id?: string
  name: string
  description: string
  tags: string[]
  connectionId: string
  query: SerializableQueryState
}

export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
}
