import type { SerializableQueryState } from '@/stores/query-builder'
import type { SerializableMutationState } from '@/stores/mutation-builder'

export type SerializableBuilderState = SerializableQueryState | SerializableMutationState

export interface SavedQuery {
  id: string
  name: string
  description: string
  tags: string[]
  connectionId: string
  query: SerializableBuilderState
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
  query: SerializableBuilderState
}

export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
}
