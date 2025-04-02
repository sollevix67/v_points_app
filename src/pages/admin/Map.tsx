import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DeliveryPoint } from '../../types/types';
import AdminLayout from '../../components/AdminLayout';
import Map from '../../components/Map';

export default function AdminMap() {
  const [points, setPoints] = useState<DeliveryPoint[]>([]);

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    const { data, error } = await supabase
      .from('delivery_points')
      .select('*');

    if (error) {
      console.error('Error fetching points:', error);
      return;
    }

    setPoints(data || []);
  };

  return (
    <AdminLayout>
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Carte des points de livraison</h1>
        <Map points={points} />
      </div>
    </AdminLayout>
  );
}