import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DeliveryPoint, DeliveryPointFormData } from '../../types/types';
import AdminLayout from '../../components/AdminLayout';
import { Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';

declare global {
  interface Window {
    google: any;
    initGoogleAutocomplete: () => void;
  }
}

export default function Points() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const editId = searchParams.get('edit');
  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<DeliveryPoint | null>(null);
  const [formData, setFormData] = useState<DeliveryPointFormData>({
    point_type: 'parcel_shop',
    shop_code: '',
    name: '',
    address: '',
    postal_code: '',
    city: '',
    latitude: 0,
    longitude: 0,
    is_active: true,
    opening_timeframe: '',
    streetview_heading: 210,
    streetview_pitch: 0,
    streetview_zoom: 1,
    comment: '',
  });
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const streetViewRef = useRef<any>(null);
  const panoramaRef = useRef<any>(null);

  useEffect(() => {
    fetchPoints();
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (editId && points.length > 0) {
      const point = points.find(p => p.id === editId);
      if (point) {
        handleEdit(point);
      }
    }
  }, [editId, points]);

  useEffect(() => {
    if (isModalOpen && window.google) {
      initAutocomplete();
    }
  }, [isModalOpen]);

  const loadGoogleMapsScript = () => {
    if (!document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&loading=async&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initAutocomplete();
        if (isModalOpen) {
          initStreetView();
        }
      };
      document.head.appendChild(script);
    }
  };

  const initStreetView = () => {
    if (!streetViewRef.current || !window.google || !formData.latitude || !formData.longitude) return;

    const position = { lat: formData.latitude, lng: formData.longitude };
    
    panoramaRef.current = new window.google.maps.StreetViewPanorama(streetViewRef.current, {
      position,
      pov: {
        heading: formData.streetview_heading,
        pitch: formData.streetview_pitch,
        zoom: formData.streetview_zoom
      },
      addressControl: false,
      linksControl: false,
      panControl: false,
      enableCloseButton: false,
      zoomControl: false,
      fullscreenControl: false
    });

    panoramaRef.current.addListener('pov_changed', () => {
      const pov = panoramaRef.current.getPov();
      setFormData(prev => ({
        ...prev,
        streetview_heading: Math.round(pov.heading),
        streetview_pitch: Math.round(pov.pitch),
        streetview_zoom: Math.round(pov.zoom)
      }));
    });
  };

  useEffect(() => {
    if (isModalOpen && window.google && formData.latitude && formData.longitude) {
      initStreetView();
    }
  }, [isModalOpen, formData.latitude, formData.longitude]);

  const extractAddressComponents = (place: any) => {
    let streetNumber = '';
    let route = '';
    let city = '';
    let postalCode = '';

    place.address_components.forEach((component: any) => {
      const types = component.types;

      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('route')) {
        route = component.long_name;
      }
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    });

    const streetAddress = [streetNumber, route].filter(Boolean).join(' ');
    
    return {
      streetAddress,
      city,
      postalCode,
    };
  };

  const initAutocomplete = () => {
    if (addressInputRef.current && window.google) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'fr' },
        fields: ['address_components', 'geometry', 'formatted_address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry) {
          const { streetAddress, city, postalCode } = extractAddressComponents(place);

          setFormData(prev => ({
            ...prev,
            address: streetAddress,
            city: city || prev.city,
            postal_code: postalCode || prev.postal_code,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          }));
        }
      });
    }
  };

  const fetchPoints = async () => {
    const { data, error } = await supabase
      .from('delivery_points')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching points:', error);
      return;
    }

    setPoints(data || []);
  };

  const filteredPoints = points.filter(point =>
    point.shop_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const showError = (message: string) => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded';
      errorDiv.innerHTML = message;
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000);
    };

    if (editingPoint) {
      const { error } = await supabase
        .from('delivery_points')
        .update(formData)
        .eq('id', editingPoint.id);

      if (error) {
        console.error('Error updating point:', error);
        if (error.code === '23505') {
          showError(`Le code magasin "${formData.shop_code}" existe déjà.`);
        } else {
          showError('Une erreur est survenue lors de la mise à jour du point.');
        }
        return;
      }
    } else {
      const { error } = await supabase
        .from('delivery_points')
        .insert([formData]);

      if (error) {
        console.error('Error creating point:', error);
        if (error.code === '23505') {
          showError(`Le code magasin "${formData.shop_code}" existe déjà.`);
        } else {
          showError('Une erreur est survenue lors de la création du point.');
        }
        return;
      }
    }

    setIsModalOpen(false);
    setEditingPoint(null);
    setSearchParams({});
    resetForm();
    fetchPoints();
  };

  const handleEdit = (point: DeliveryPoint) => {
    setEditingPoint(point);
    setFormData({
      point_type: point.point_type,
      shop_code: point.shop_code,
      name: point.name,
      city: point.city,
      postal_code: point.postal_code,
      address: point.address,
      latitude: point.latitude,
      longitude: point.longitude,
      is_active: point.is_active,
      opening_timeframe: point.opening_timeframe || '',
      streetview_heading: point.streetview_heading || 210,
      streetview_pitch: point.streetview_pitch || 0,
      streetview_zoom: point.streetview_zoom || 1,
      comment: point.comment || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce point de livraison ?')) {
      return;
    }

    const { error } = await supabase
      .from('delivery_points')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting point:', error);
      return;
    }

    fetchPoints();
  };

  const resetForm = () => {
    setFormData({
      point_type: 'parcel_shop',
      shop_code: '',
      name: '',
      city: '',
      postal_code: '',
      address: '',
      latitude: 0,
      longitude: 0,
      is_active: true,
      opening_timeframe: '',
      streetview_heading: 210,
      streetview_pitch: 0,
      streetview_zoom: 1,
      comment: '',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Points de livraison</h1>
          <button
            onClick={() => {
              resetForm();
              setEditingPoint(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Ajouter un point
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par code magasin ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Nom</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Ville</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Actif</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPoints.map((point) => (
              <tr key={point.id} className="border-t">
                <td className="px-6 py-4">{point.shop_code}</td>
                <td className="px-6 py-4">{point.point_type === 'locker' ? 'Casier' : 'Point Relais'}</td>
                <td className="px-6 py-4">{point.name}</td>
                <td className="px-6 py-4">{point.city}</td>
                <td className="px-6 py-4">
                  {point.is_active ? (
                    <Check className="text-green-500" size={20} />
                  ) : (
                    <X className="text-red-500" size={20} />
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      data-point-id={point.id}
                      onClick={() => handleEdit(point)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(point.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingPoint ? 'Modifier' : 'Ajouter'} un point de livraison
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de point
                  </label>
                  <select
                    value={formData.point_type}
                    onChange={(e) => setFormData({ ...formData, point_type: e.target.value as 'locker' | 'parcel_shop' })}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="parcel_shop">Point Relais</option>
                    <option value="locker">Casier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code magasin
                  </label>
                  <input
                    type="text"
                    value={formData.shop_code}
                    onChange={(e) => setFormData({ ...formData, shop_code: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                    placeholder="Commencez à taper une adresse..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aperçu Street View
                  </label>
                  <div 
                    ref={streetViewRef} 
                    className="w-full h-[300px] rounded-lg overflow-hidden mb-2"
                  ></div>
                  <p className="text-sm text-gray-600">
                    Faites glisser la vue pour ajuster l'angle de la caméra. Position actuelle : 
                    {formData.streetview_heading}° horizontal, {formData.streetview_pitch}° vertical, 
                    zoom x{formData.streetview_zoom}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horaires d'ouverture
                  </label>
                  <textarea
                    value={formData.opening_timeframe}
                    onChange={(e) => setFormData({ ...formData, opening_timeframe: e.target.value })}
                    className="w-full p-2 border rounded h-32"
                    placeholder="Lundi-Vendredi: 9h-19h&#10;Samedi: 9h-12h&#10;Dimanche: Fermé"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Point actif</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commentaire
                  </label>
                  <textarea
                    value={formData.comment || ''}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="w-full p-2 border rounded h-32"
                    placeholder="Ajoutez un commentaire sur ce point de livraison..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPoint(null);
                    setSearchParams({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingPoint ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}