/**
 * columns: [{ key, label, align?, render?(row) }]
 * rows: array of data objects
 * onRowClick: optional (row) => void
 * emptyMessage: shown when rows is empty
 */
export default function DataTable({ columns, rows, onRowClick, emptyMessage = 'Nothing here yet.' }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align || 'left' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || row.account?.id || i} className={onRowClick ? 'data-table-row-clickable' : ''} onClick={() => onRowClick?.(row)}>
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
