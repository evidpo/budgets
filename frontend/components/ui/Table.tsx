import React from 'react';

interface TableColumn<T> {
  key: string;
  title: string;
 render?: (value: any, record: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (key: string) => void;
 currentSort?: { key: string; direction: 'asc' | 'desc' };
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  emptyText?: string;
}

export default function Table<T>({
  data,
  columns,
  onSort,
  currentSort,
  pagination,
  loading = false,
  emptyText = 'Нет данных'
}: TableProps<T>) {
  const handleSort = (key: string) => {
    if (onSort && columns.find(col => col.key === key)?.sortable) {
      onSort(key);
    }
  };

  const getSortIcon = (key: string) => {
    if (!currentSort || currentSort.key !== key) {
      return (
        <span className="ml-1 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    
    return currentSort.direction === 'asc' ? (
      <span className="ml-1 text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </span>
    ) : (
      <span className="ml-1 text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    );
  };

  const renderCellContent = (column: TableColumn<T>, value: any, record: T) => {
    if (column.render) {
      return column.render(value, record);
    }
    return value || '-';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                } sm:px-6`}
                onClick={() => handleSort(column.key)}
              >
                <div className="flex items-center">
                  {column.title}
                  {column.sortable && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.length > 0 ? (
            data.map((record, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                {columns.map((column) => {
                  const value = (record as any)[column.key];
                  const alignment = column.align || 'left';
                  return (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-20 sm:px-6 ${
                        alignment === 'right' ? 'text-right' : alignment === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {renderCellContent(column, value, record)}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400 sm:px-6"
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
            Страница <span className="font-medium">{pagination.currentPage}</span> из{' '}
            <span className="font-medium">{pagination.totalPages}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className={`px-3 py-1 rounded-md text-sm ${
                pagination.currentPage <= 1
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              Назад
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className={`px-3 py-1 rounded-md text-sm ${
                pagination.currentPage >= pagination.totalPages
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  );
}