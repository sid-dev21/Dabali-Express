import React, { useState, useEffect } from 'react';

interface CanteenHistoryProps {
  schoolName: string;
  managerName: string;
}

interface HistoryRecord {
  id: string;
  date: string;
  type: 'menu' | 'stock';
  description: string;
  amount?: number;
  status: 'completed' | 'pending' | 'cancelled';
}

const CanteenHistory: React.FC<CanteenHistoryProps> = ({ schoolName, managerName }) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'menu' | 'stock'>('all');

  useEffect(() => {
    // Simulate fetching history data
    const fetchHistory = async () => {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockHistory: HistoryRecord[] = [
        {
          id: '1',
          date: '2024-01-15',
          type: 'menu',
          description: 'Menu updated - Added new items',
          status: 'completed'
        },
        {
          id: '2',
          date: '2024-01-14',
          type: 'stock',
          description: 'Stock replenishment - Vegetables and fruits',
          amount: 15000,
          status: 'completed'
        },
        {
          id: '4',
          date: '2024-01-12',
          type: 'menu',
          description: 'Menu price update',
          status: 'completed'
        }
      ];
      
      setTimeout(() => {
        setHistory(mockHistory);
        setLoading(false);
      }, 1000);
    };

    fetchHistory();
  }, []);

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(record => record.type === filter);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'menu': return 'bg-blue-100 text-blue-800';
      case 'stock': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Canteen History</h2>
        <p className="text-slate-600">
          {schoolName} - Managed by {managerName}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex space-x-2">
          {(['all', 'menu', 'stock'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredHistory.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(record.type)}`}>
                      {record.type.charAt(0).toUpperCase() + record.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {record.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {record.amount ? `${record.amount.toLocaleString()} FCFA` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredHistory.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No history records found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanteenHistory;
