export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey?: (row: T) => string | number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-base shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase text-text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className="px-4 py-3 font-semibold">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {rows.map((row, index) => (
              <tr key={rowKey ? rowKey(row) : index} className="hover:bg-surface-raised/70">
                {columns.map((column) => (
                  <td key={column.header} className="px-4 py-3">
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
