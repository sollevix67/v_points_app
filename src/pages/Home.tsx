import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DeliveryPoint } from '../types/types';
import DeliveryPointsList from '../components/DeliveryPointsList';
import Map from '../components/Map';
import { Settings } from 'lucide-react';

const getInitialView = () => {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    view: searchParams.get('view') === 'map' ? 'map' : 'list',
    pointId: searchParams.get('point') || undefined
  };
};

export default function Home() {
  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<DeliveryPoint | null>(null);
  const [view, setView] = useState<'list' | 'map'>(getInitialView().view);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>(getInitialView().pointId);

  // Fetch specific point when ID changes
  useEffect(() => {
    if (selectedPointId) {
      fetchSelectedPoint(selectedPointId);
    } else {
      setSelectedPoint(null);
    }
  }, [selectedPointId]);

  const fetchSelectedPoint = async (id: string) => {
    const { data, error } = await supabase
      .from('delivery_points')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching selected point:', error);
      return;
    }

    setSelectedPoint(data);
  };

  useEffect(() => {
    // Update view and selected point when URL changes
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setView(params.get('view') === 'map' ? 'map' : 'list');
      setSelectedPointId(params.get('point') || undefined);
    };

    // Listen for URL changes
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    fetchPoints();
  }, []);

  // Update URL when view or selected point changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (view === 'map') {
      params.set('view', 'map');
    }
    if (selectedPointId) {
      params.set('point', selectedPointId);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [view, selectedPointId]);

  async function fetchPoints() {
    const { data, error } = await supabase
      .from('delivery_points')
      .select('*');

    if (error) {
      console.error('Error fetching points:', error);
      return;
    }

    setPoints(data);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Points de livraison</h1>
        <a
          href="/admin/login"
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Settings size={20} />
          Administration
        </a>
      </div>
      
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded ${
              view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Liste
          </button>
          <button
            onClick={() => setView('map')}
            className={`px-4 py-2 rounded ${
              view === 'map' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Carte
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <DeliveryPointsList points={points} />
      ) : (
        <Map points={points} selectedPoint={selectedPoint} />
      )}
    </div>
  );
}