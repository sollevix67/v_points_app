import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DeliveryPoint } from '../types/types';
import { Clock, MapPin, Package, Check, X, ArrowLeft, Edit, Link2, Map } from 'lucide-react';

export default function PointDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [point, setPoint] = useState<DeliveryPoint | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  useEffect(() => {
    fetchPoint();
  }, [id]);

  async function fetchPoint() {
    if (!id) return;

    const { data, error } = await supabase
      .from('delivery_points')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching point:', error);
      return;
    }

    setPoint(data);
  }

  const handleEdit = () => {
    navigate(`/admin/points?edit=${point.id}`);
  };

  if (!point) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Retour à la liste
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              copySuccess 
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Copier le lien permanent"
          >
            <Link2 size={20} />
            {copySuccess ? 'Lien copié !' : 'Copier le lien'}
          </button>
          <button
            onClick={() => navigate(`/?view=map&point=${point.id}`)}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            title="Voir sur la carte"
          >
            <Map size={20} />
            Voir sur la carte
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            <Edit size={20} />
            Modifier
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            {point.point_type === 'locker' ? (
              <Package className="text-blue-500" size={24} />
            ) : (
              <MapPin className="text-green-500" size={24} />
            )}
            <span className="text-sm font-medium text-gray-500">
              {point.point_type === 'locker' ? 'Casier' : 'Point Relais'}
            </span>
          </div>

          <h1 className="text-3xl font-bold mb-6">{point.name}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Informations</h2>
              <dl className="space-y-2">
                <dt className="font-medium">Code magasin</dt>
                <dd className="text-gray-600">{point.shop_code}</dd>
                
                <dt className="font-medium mt-4">Adresse</dt>
                <dd className="text-gray-600">
                  {point.address}<br />
                  {point.postal_code} {point.city}
                </dd>
                
                <dt className="font-medium mt-4">Statut</dt>
                <dd className="text-gray-600">
                  {point.is_active ? (
                    <span className="text-green-500 flex items-center gap-2">
                      <Check size={20} />
                      Actif
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-2">
                      <X size={20} />
                      Inactif
                    </span>
                  )}
                </dd>
                
                <dt className="font-medium mt-4">Commentaire</dt>
                <dd className="text-gray-600">
                  {point.comment ? (
                    <p className="whitespace-pre-wrap">{point.comment}</p>
                  ) : (
                    <span className="text-gray-400">Aucun commentaire</span>
                  )}
                </dd>
              </dl>

              {point.opening_timeframe && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Horaires d'ouverture
                  </h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap font-sans">
                      {point.opening_timeframe}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Street View</h2>
              <div className="rounded-lg shadow-sm overflow-hidden bg-gray-100 h-[300px] relative">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/streetview?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&location=${point.latitude},${point.longitude}&heading=${point.streetview_heading}&pitch=${point.streetview_pitch}&fov=${Math.max(10, Math.min(100, 120 / (point.streetview_zoom || 1)))}`}
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}