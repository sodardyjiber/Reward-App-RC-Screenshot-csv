import React from 'react';
import { TableRow } from '../types';

interface ResultsTableProps {
  rows: TableRow[];
  headers: string[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ rows, headers }) => {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
        <p className="text-gray-500">No data extracted yet. Upload an image to start building your sheet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50 border-r border-gray-200 w-16">
                #
              </th>
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-200">
                  {index + 1}
                </td>
                {headers.map((header) => (
                  <td key={`${row.id}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.data[header] !== undefined && row.data[header] !== null 
                      ? String(row.data[header]) 
                      : <span className="text-gray-300 italic">-</span>}
                  </td>
                ))}
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-right">
                   {row.sourceImageName}
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
        <span>{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
        <span>Auto-saved locally</span>
      </div>
    </div>
  );
};