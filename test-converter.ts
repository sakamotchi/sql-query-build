
import { convertToQueryModel } from './app/utils/query-converter';
import { QueryBuilderState } from './app/types/query-model';

// Mock data
const mockState: QueryBuilderState = {
  selectedTables: [
    {
      id: 't1',
      schema: 'public',
      name: 'users',
      alias: 'u',
      columns: [
        { name: 'id', dataType: 'integer' },
        { name: 'name', dataType: 'text' },
      ],
    },
  ],
  selectedColumns: [
    {
      tableId: 't1',
      tableAlias: 'u',
      columnName: 'id',
      columnAlias: null,
      dataType: 'integer',
    },
    {
      tableId: 't1',
      tableAlias: 'u',
      columnName: 'name',
      columnAlias: 'user_name',
      dataType: 'text',
    },
  ],
  whereConditions: [],
  whereLogic: 'AND',
  groupByColumns: [],
  havingConditions: [],
  orderByItems: [],
  limit: null,
  offset: null,
  distinct: false,
  joins: [],
};

try {
  const model = convertToQueryModel(mockState, 'conn-123');
  console.log('Conversion successful:');
  console.log(JSON.stringify(model, null, 2));
} catch (error) {
  console.error('Conversion failed:', error);
  process.exit(1);
}
