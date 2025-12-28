
import { convertToQueryModel, UIQueryState } from './app/utils/query-converter';

// Mock data matching UI State
const mockState: UIQueryState = {
  selectedTables: [
    {
      id: 't1',
      schema: 'public',
      name: 'users',
      alias: 'u',
      columns: [
        { name: 'id', dataType: 'integer', displayType: 'int', nullable: false, defaultValue: null, isPrimaryKey: true, comment: null },
        { name: 'name', dataType: 'text', displayType: 'text', nullable: true, defaultValue: null, isPrimaryKey: false, comment: null },
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
  groupByColumns: [],
  orderByColumns: [],
  limit: null,
  offset: null,
};

try {
  const model = convertToQueryModel(mockState, 'conn-123');
  console.log('Conversion successful:');
  console.log(JSON.stringify(model, null, 2));
} catch (error) {
  console.error('Conversion failed:', error);
  process.exit(1);
}
