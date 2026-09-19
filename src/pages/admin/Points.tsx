import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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

type AddressComponent = {
  longText: string;
  types: string[];
};

type SelectedPlace = {
  addressComponents?: AddressComponent[];
  formattedAddress?: string;
  location?: {
    lat: () => number;
    lng: () => number;
  };
  fetchFields: (options: { fields: string[] }) => Promise<void>;
};

type PlacePredictionSelectEvent = Event & {
  placePrediction: {
    toPlace: () => SelectedPlace;
  };
};

const EMPTY_FORM: DeliveryPointFormData = {
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
};

const normalizeText = (value?: string | null) => value?.trim() ?? '';

const isValidLatitude = (value: number) => Number.isFinite(value) && value >= -90 && value <= 90;
const isValidLongitude = (value: number) => Number.isFinite(value) && value >= -180 && value <= 180;

const sanitizeFormData = (data: DeliveryPointFormData): DeliveryPointFormData => {
  const sanitized: DeliveryPointFormData = {
    ...data,
    point_type: data.point_type === 'locker' ? 'locker' : 'parcel_shop',
    shop_code: normalizeText(data.shop_code),
    name: normalizeText(data.name),
    address: normalizeText(data.address),
    postal_code: normalizeText(data.postal_code),
    city: normalizeText(data.city),
    opening_timeframe: normalizeText(data.opening_timeframe),
    comment: normalizeText(data.comment),
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    streetview_heading: Number.isFinite(Number(data.streetview_heading)) ? Number(data.streetview_heading) : 210,
    streetview_pitch: Number.isFinite(Number(data.streetview_pitch)) ? Number(data.streetview_pitch) : 0,
    streetview_zoom: Number.isFinite(Number(data.streetview_zoom)) ? Number(data.streetview_zoom) : 1,
  };

  return sanitized;
};

const validateFormData = (data: DeliveryPointFormData) => {
  const { shop_code, name, address, postal_code, city, latitude, longitude } = sanitizeFormData(data);

  if (!shop_code || !name || !address || !postal_code || !city) {
    return 'Tous les champs obligatoires doivent être renseignés.';
  }

  if (!isValidLatitude(latitude)) {
    return 'La latitude doit être un nombre valide entre -90 et 90.';
  }

  if (!isValidLongitude(longitude)) {
    return 'La longitude doit être un nombre valide entre -180 et 180.';
  }

  if (!/^[0-9]{5}$/.test(postal_code)) {
    return 'Le code postal doit contenir 5 chiffres.';
  }

  if (shop_code.length > 100 || name.length > 200 || address.length > 255 || city.length > 120) {
    return 'Un des champs dépasse la longueur autorisée.';
  }

  return null;
};

export default function Points() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const editId = searchParams.get('edit');
  const [points, setPoints] = useState<DeliveryPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<DeliveryPoint | null>(null);
  const [formData, setFormData] = useState<DeliveryPointFormData>(EMPTY_FORM);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<(HTMLElement & { value: string }) | null>(null);
  const streetViewRef = useRef<any>(null);
  const panoramaRef = useRef<any>(null);

  const showError = (message: string) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    window.setTimeout(() => errorDiv.remove(), 5000);
  };

  const fetchPoints = async () => {
    const { data, error } = await supabase
      .from('delivery_points')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching points:', error);
      showError('Impossible de charger les points de livraison.');
      return;
    }

    setPoints(data ?? []);
  };

  const loadGoogleMapsScript = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('VITE_GOOGLE_MAPS_API_KEY is missing');
      return;
    }

    if (document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      if (window.google) {
        void initAutocomplete();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (isModalOpen) {
        void initAutocomplete();
      }
    };
    script.onerror = () => {
      showError('Le chargement de Google Maps a échoué. Vérifiez votre clé API.');
    };

    document.head.appendChild(script);
  };

  const extractAddressComponents = (components: AddressComponent[] = []) => {
    let streetNumber = '';
    let route = '';
    let city = '';
    let postalCode = '';

    components.forEach((component) => {
      const types = component.types || [];

      if (types.includes('street_number')) {
        streetNumber = component.longText;
      }
      if (types.includes('route')) {
        route = component.longText;
      }
      if (types.includes('locality')) {
        city = component.longText;
      }
      if (types.includes('postal_code')) {
        postalCode = component.longText;
      }
    });

    return {
      streetAddress: [streetNumber, route].filter(Boolean).join(' '),
      city,
      postalCode,
    };
  };

  const initAutocomplete = async () => {
    if (!autocompleteContainerRef.current || !window.google || autocompleteRef.current) return;

    const container = autocompleteContainerRef.current;

    try {
      const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places');
      if (!container.isConnected || autocompleteRef.current) return;

      const autocomplete = new PlaceAutocompleteElement({
        includedRegionCodes: ['fr'],
        placeholder: 'Commencez à taper une adresse...',
        requestedLanguage: 'fr',
        requestedRegion: 'fr',
        value: formData.address,
      }) as HTMLElement & { value: string };

      autocomplete.className = 'w-full';
      autocomplete.style.colorScheme = 'light';
      autocomplete.style.backgroundColor = '#ffffff';
      autocomplete.style.color = '#111827';
      autocomplete.style.border = '1px solid #d1d5db';
      autocomplete.style.borderRadius = '0.25rem';

      autocomplete.addEventListener('gmp-select', async (event: Event) => {
        const { placePrediction } = event as PlacePredictionSelectEvent;
        const place = placePrediction.toPlace();

        await place.fetchFields({
          fields: ['addressComponents', 'formattedAddress', 'location'],
        });

        if (!place.location) return;

        const { streetAddress, city, postalCode } = extractAddressComponents(
          place.addressComponents ?? [],
        );

        setFormData((prev) => ({
          ...prev,
          address: streetAddress || place.formattedAddress || autocomplete.value,
          city: city || prev.city,
          postal_code: postalCode || prev.postal_code,
          latitude: Number(place.location!.lat()),
          longitude: Number(place.location!.lng()),
        }));
      });

      container.replaceChildren(autocomplete);
      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Google Places init failed:', error);
      showError('L’autocomplétion d’adresse n’a pas pu être initialisée.');
    }
  };

  const initStreetView = () => {
    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);

    if (!streetViewRef.current || !window.google || !isValidLatitude(latitude) || !isValidLongitude(longitude)) {
      return;
    }

    if (panoramaRef.current) {
      try {
        panoramaRef.current.setVisible(false);
      } catch {
        // ignored
      }
      panoramaRef.current = null;
    }

    const position = { lat: latitude, lng: longitude };

    panoramaRef.current = new window.google.maps.StreetViewPanorama(streetViewRef.current, {
      position,
      pov: {
        heading: Number(formData.streetview_heading ?? 210),
        pitch: Number(formData.streetview_pitch ?? 0),
        zoom: Number(formData.streetview_zoom ?? 1),
      },
      addressControl: false,
      linksControl: false,
      panControl: false,
      enableCloseButton: false,
      zoomControl: false,
      fullscreenControl: false,
    });

    panoramaRef.current.addListener('pov_changed', () => {
      const pov = panoramaRef.current.getPov();
      setFormData((prev) => ({
        ...prev,
        streetview_heading: Math.round(pov.heading),
        streetview_pitch: Math.round(pov.pitch),
        streetview_zoom: Math.round(pov.zoom),
      }));
    });
  };

  useEffect(() => {
    fetchPoints();
    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (editId && points.length > 0) {
      const point = points.find((p) => p.id === editId);
      if (point) {
        handleEdit(point);
      }
    }
  }, [editId, points]);

  useEffect(() => {
    if (!isModalOpen) {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
      }
      return;
    }

    if (window.google) {
      void initAutocomplete();
    }

    return () => {
      if (autocompleteRef.current) {
        autocompleteRef.current.remove();
        autocompleteRef.current = null;
      }
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen || !streetViewRef.current || !window.google) return;

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);

    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return;

    initStreetView();

    return () => {
      if (panoramaRef.current) {
        try {
          window.google.maps.event.clearListeners(panoramaRef.current, 'pov_changed');
          panoramaRef.current.setVisible(false);
        } catch {
          // ignored
        }
        panoramaRef.current = null;
      }
    };
  }, [isModalOpen, formData.latitude, formData.longitude]);

  const filteredPoints = (points ?? []).filter((point) => {
    const search = searchTerm.toLowerCase();
    const shopCode = String(point.shop_code ?? '').toLowerCase();
    const name = String(point.name ?? '').toLowerCase();

    return shopCode.includes(search) || name.includes(search);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedFormData = sanitizeFormData(formData);
    const validationError = validateFormData(cleanedFormData);

    if (validationError) {
      showError(validationError);
      return;
    }

    const payload = {
      ...cleanedFormData,
      shop_code: cleanedFormData.shop_code.trim(),
      name: cleanedFormData.name.trim(),
      address: cleanedFormData.address.trim(),
      city: cleanedFormData.city.trim(),
      postal_code: cleanedFormData.postal_code.trim(),
      comment: cleanedFormData.comment?.trim() || null,
      opening_timeframe: cleanedFormData.opening_timeframe?.trim() || null,
    };

    try {
      if (editingPoint) {
        const { error } = await supabase
          .from('delivery_points')
          .update(payload)
          .eq('id', editingPoint.id);

        if (error) {
          console.error('Error updating point:', error);
          if (error.code === '23505') {
            showError(`Le code magasin "${payload.shop_code}" existe déjà.`);
          } else {
            showError('Une erreur est survenue lors de la mise à jour du point.');
          }
          return;
        }
      } else {
        const { error } = await supabase
          .from('delivery_points')
          .insert([payload]);

        if (error) {
          console.error('Error creating point:', error);
          if (error.code === '23505') {
            showError(`Le code magasin "${payload.shop_code}" existe déjà.`);
          } else {
            showError('Une erreur est survenue lors de la création du point.');
          }
          return;
        }
      }

      setIsModalOpen(false);
      setEditingPoint(null);
      setSearchParams({});
      setFormData(EMPTY_FORM);
      await fetchPoints();
    } catch (error) {
      console.error('Unexpected submit error:', error);
      showError('Une erreur inattendue est survenue.');
    }
  };

  const handleEdit = (point: DeliveryPoint) => {
    setEditingPoint(point);
    setFormData({
      point_type: point.point_type === 'locker' ? 'locker' : 'parcel_shop',
      shop_code: point.shop_code ?? '',
      name: point.name ?? '',
      city: point.city ?? '',
      postal_code: point.postal_code ?? '',
      address: point.address ?? '',
      latitude: Number(point.latitude ?? 0),
      longitude: Number(point.longitude ?? 0),
      is_active: Boolean(point.is_active),
      opening_timeframe: point.opening_timeframe ?? '',
      streetview_heading: Number(point.streetview_heading ?? 210),
      streetview_pitch: Number(point.streetview_pitch ?? 0),
      streetview_zoom: Number(point.streetview_zoom ?? 1),
      comment: point.comment ?? '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce point de livraison ?')) {
      return;
    }

    const { error } = await supabase
      .from('delivery_points')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting point:', error);
      showError('La suppression du point a échoué.');
      return;
    }

    await fetchPoints();
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Points de livraison</h1>
          <button
            type="button"
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      type="button"
                      data-point-id={point.id}
                      onClick={() => handleEdit(point)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Pencil size={20} />
                    </button>
                    <button
                      type="button"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
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
                  <div ref={autocompleteContainerRef} className="w-full" />
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
                    onChange={(e) => setFormData({ ...formData, latitude: Number.parseFloat(e.target.value) || 0 })}
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
                    onChange={(e) => setFormData({ ...formData, longitude: Number.parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aperçu Street View
                  </label>
                  <div ref={streetViewRef} className="w-full h-[300px] rounded-lg overflow-hidden mb-2" />
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