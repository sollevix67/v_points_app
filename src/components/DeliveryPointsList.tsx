import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Search, Clock, ArrowUpDown } from 'lucide-react';
import { DeliveryPoint } from '../types/types';

interface Props {
  points: DeliveryPoint[];
}

type SortField = 'shop_code' | 'name' | 'city';
type SortDirection = 'asc' | 'desc';

export default function DeliveryPointsList({ points }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('city');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const navigate = useNavigate();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedPoints = [...points].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    const aValue = a[sortField].toLowerCase();
    const bValue = b[sortField].toLowerCase();
    return aValue > bValue ? direction : -direction;
  });

  const filteredPoints = sortedPoints.filter(point => 
    point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.shop_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRowClick = (id: string) => {
    navigate(`/point/${id}`);
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
    >
      {label}
      <ArrowUpDown
        size={16}
        className={`transition-colors ${
          sortField === field
            ? 'text-blue-500'
            : 'text-gray-400'
        }`}
      />
      {sortField === field && (
        <span className="text-xs text-blue-500 ml-1">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );

  return (
    <div className="w-full">
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Rechercher par nom ou code..."
          className="w-full p-2 pl-10 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                <SortButton field="shop_code" label="Code" />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                <SortButton field="name" label="Nom" />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">
                <SortButton field="city" label="Ville" />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Horaires</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Actif</th>
            </tr>
          </thead>
          <tbody>
            {filteredPoints.map((point) => (
              <tr 
                key={point.id} 
                onClick={() => handleRowClick(point.id)}
                className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-sm">{point.shop_code}</td>
                <td className="px-6 py-4 text-sm">
                  {point.point_type === 'locker' ? 'Casier' : 'Point Relais'}
                </td>
                <td className="px-6 py-4 text-sm">{point.name}</td>
                <td className="px-6 py-4 text-sm">{point.city}</td>
                <td className="px-6 py-4 text-sm">
                  {point.opening_timeframe ? (
                    <button 
                      className="flex items-center text-blue-500 hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(point.opening_timeframe);
                      }}
                    >
                      <Clock size={16} className="mr-1" />
                      Voir les horaires
                    </button>
                  ) : (
                    <span className="text-gray-400">Non renseigné</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {point.is_active ? (
                    <Check className="text-green-500" size={20} />
                  ) : (
                    <X className="text-red-500" size={20} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}