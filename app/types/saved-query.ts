import type { SerializableQueryState } from '@/stores/query-builder'
import type { SerializableMutationState } from '@/stores/mutation-builder'

export type SerializableBuilderState = SerializableQueryState | SerializableMutationState

export interface SavedQuery {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null
  connectionId: string | null
  query: SerializableBuilderState
  createdAt: string
  updatedAt: string
}

export interface SavedQueryMetadata {
  id: string
  name: string
  description: string
  tags: string[]
  folderPath: string | null
  connectionId: string | null
  createdAt: string
  updatedAt: string
}

export interface SaveQueryRequest {
  id?: string
  name: string
  description: string
  tags: string[]
  folderPath?: string | null
  connectionId: string | null
  query: SerializableBuilderState
}

export interface SearchQueryRequest {
  keyword?: string
  tags?: string[]
  connectionId?: string
  folderPath?: string
}
