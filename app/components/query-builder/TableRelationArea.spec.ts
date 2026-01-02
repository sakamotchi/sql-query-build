import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import TableRelationArea from './TableRelationArea.vue'
import { nuxtUiStubs } from '../../../tests/utils/nuxt-ui-stubs'

const updateTablePosition = vi.fn()
const removeTable = vi.fn()
const updateTableAlias = vi.fn()
const addTableMock = vi.fn()

const storeState = reactive({
  selectedTables: [] as Array<{ id: string; schema: string; name: string; alias: string; columns: any[] }>,
  joins: [] as Array<any>,
  tablePositions: {} as Record<string, { x: number; y: number }>,
  updateTablePosition,
  removeTable,
  updateTableAlias,
})

vi.mock('@/stores/query-builder', () => ({
  useQueryBuilderStore: () => storeState,
}))

vi.mock('@/composables/useTableSelection', () => ({
  useTableSelection: () => ({
    addTable: addTableMock,
  }),
}))

const stubs = {
  ...nuxtUiStubs,
  DropZone: {
    template: '<div data-test="drop-zone"></div>',
  },
  TableCard: {
    name: 'TableCard',
    template: '<div data-test="table-card"></div>',
    props: ['table', 'position', 'zoom'],
    emits: ['remove', 'update-alias', 'move', 'focus'],
  },
  RelationLine: {
    template: '<div data-test="relation-line"></div>',
    props: ['join', 'x1', 'y1', 'x2', 'y2', 'isActive', 'isDimmed'],
  },
}

const mountComponent = () =>
  mount(TableRelationArea, {
    attachTo: document.body,
    global: {
      stubs,
    },
  })

describe('TableRelationArea', () => {
  beforeEach(() => {
    storeState.selectedTables = []
    storeState.joins = []
    storeState.tablePositions = {}
    updateTablePosition.mockReset()
    removeTable.mockReset()
    updateTableAlias.mockReset()
    addTableMock.mockReset()
  })

  it('テーブルがない場合はドロップゾーンを表示する', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('[data-test="drop-zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="table-card"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('テーブルがある場合はTableCardを表示する', () => {
    storeState.selectedTables = [
      { id: 'public.users', schema: 'public', name: 'users', alias: 'u', columns: [] },
    ]
    storeState.tablePositions = {
      'public.users': { x: 100, y: 120 },
    }

    const wrapper = mountComponent()

    expect(wrapper.findAll('[data-test="table-card"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="drop-zone"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('テーブルをドロップできる', async () => {
    const wrapper = mountComponent()
    await nextTick()

    const table = { schema: 'public', name: 'users' } as any
    const event = new CustomEvent('table-drop', {
      detail: { table, x: 20, y: 40 },
    })

    wrapper.get('#query-builder-canvas').element.dispatchEvent(event)

    expect(updateTablePosition).toHaveBeenCalledWith('public.users', 20, 40)
    expect(addTableMock).toHaveBeenCalledWith(table)

    wrapper.unmount()
  })

  it('テーブル削除時にストアのremoveTableを呼び出す', async () => {
    storeState.selectedTables = [
      { id: 'public.users', schema: 'public', name: 'users', alias: 'u', columns: [] },
    ]
    storeState.tablePositions = {
      'public.users': { x: 100, y: 120 },
    }

    const wrapper = mountComponent()
    const tableCard = wrapper.findComponent({ name: 'TableCard' })
    tableCard.vm.$emit('remove', 'public.users')

    expect(removeTable).toHaveBeenCalledWith('public.users')

    wrapper.unmount()
  })

  it('JOINがある場合はリレーション線を表示する', () => {
    storeState.selectedTables = [
      { id: 'public.users', schema: 'public', name: 'users', alias: 'u', columns: [] },
      { id: 'public.posts', schema: 'public', name: 'posts', alias: 'p', columns: [] },
    ]
    storeState.tablePositions = {
      'public.users': { x: 100, y: 120 },
      'public.posts': { x: 300, y: 120 },
    }
    storeState.joins = [
      {
        id: 'join-1',
        type: 'INNER',
        table: { schema: 'public', name: 'posts', alias: 'p' },
        conditions: [
          {
            left: { tableAlias: 'u', columnName: 'id' },
            operator: '=',
            right: { tableAlias: 'p', columnName: 'user_id' },
          },
        ],
        conditionLogic: 'AND',
      },
    ]

    const wrapper = mountComponent()

    expect(wrapper.findAll('[data-test="relation-line"]')).toHaveLength(1)

    wrapper.unmount()
  })
})
