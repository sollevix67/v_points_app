import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { DeliveryPoint } from '../types/types';
import 'leaflet/dist/leaflet.css';

// Constants for France bounds
const FRANCE_BOUNDS = {
  north: 51.089,
  south: 41.342,
  west: -5.142,
  east: 9.662
};

// Create custom icons
const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const inactiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const bouncingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'leaflet-marker-bounce'
});

interface Props {
  points: DeliveryPoint[];
  selectedPoint?: DeliveryPoint | null;
}

// Helper function to validate coordinates
function isValidCoordinate(coord: number): boolean {
  return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

function isValidLatitude(lat: number): boolean {
  return isValidCoordinate(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng: number): boolean {
  return isValidCoordinate(lng) && lng >= -180 && lng <= 180;
}

function parseCoordinate(value: number | string): number {
  if (value === null || value === undefined) {
    return NaN;
  }
  const stringValue = String(value).trim().replace(',', '.');
  const parsed = typeof value === 'string' ? parseFloat(stringValue) : value;
  return parsed;
}

// Component to handle map updates
function MapUpdater({ points, selectedPoint }: Props) {
  const map = useMap();
  const mapRef = useRef(map);

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  // Set max bounds for France
  useEffect(() => {
    if (!map) return;

    map.setMaxBounds([
      [FRANCE_BOUNDS.south - 0.1, FRANCE_BOUNDS.west - 0.1],
      [FRANCE_BOUNDS.north + 0.1, FRANCE_BOUNDS.east + 0.1]
    ]);
    map.on('drag', () => {
      map.panInsideBounds([
        [FRANCE_BOUNDS.south, FRANCE_BOUNDS.west],
        [FRANCE_BOUNDS.north, FRANCE_BOUNDS.east]
      ], { animate: false });
    });
  }, [map]);

  useEffect(() => {
    if (!mapRef.current || !selectedPoint) return;

    if (selectedPoint && selectedPoint.latitude && selectedPoint.longitude) {
      const lat = parseCoordinate(selectedPoint.latitude);
      const lng = parseCoordinate(selectedPoint.longitude);
      
      if (isValidLatitude(lat) && isValidLongitude(lng)) {
        mapRef.current.setView([lat, lng], 15, { animate: true });
      }
    }
  }, [selectedPoint]);

  return null;
}

export default function Map({ points, selectedPoint }: Props) {
  const initialCenter = useMemo(() => {
    if (selectedPoint && selectedPoint.latitude && selectedPoint.longitude) {
      const lat = parseCoordinate(selectedPoint.latitude);
      const lng = parseCoordinate(selectedPoint.longitude);
      if (isValidLatitude(lat) && isValidLongitude(lng)) {
        return [lat, lng];
      }
    }

    // Default center for France
    return [48.52797, 7.60425];
  }, [points, selectedPoint]);

  const initialZoom = useMemo(() => {
    return selectedPoint ? 15 : 6;
  }, [selectedPoint]);

  return (
    <>
      <style>
        {`.leaflet-marker-bounce { z-index: 1000 !important; }`}
      </style>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        key={`map-${selectedPoint?.id || 'default'}-${Date.now()}`}
        className="w-full h-[600px]"
        scrollWheelZoom={true}
        minZoom={5}
        maxZoom={18}
        dragging={true}
        doubleClickZoom={true}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="[&_img]:transition-opacity"
        />
        {/* Render all points when no specific point is selected */}
        {!selectedPoint && points.map((point) => {
          const lat = parseCoordinate(point.latitude);
          const lng = parseCoordinate(point.longitude);
          
          if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
            console.warn('Invalid coordinates for point:', point.id, { lat, lng });
            return null;
          }
          
          return (
            <Marker
              key={point.id}
              icon={point.is_active ? defaultIcon : inactiveIcon}
              position={[lat, lng]}>
              <Popup>
                <div>
                  <h3 className="font-bold">{point.name}</h3>
                  <p>{point.address}</p>
                  <p>{point.city}</p>
                  <p className={`text-sm ${point.is_active ? 'text-green-600' : 'text-red-600'} font-medium`}>
                    {point.is_active ? 'Point actif' : 'Point inactif'}
                  </p>
                  <p className="text-sm text-gray-500">
                    GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
                  </p>
                  <a
                    href={`/point/${point.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Voir les détails
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {/* Render selected point with bouncing icon */}
        {selectedPoint && (() => {
          const lat = parseCoordinate(selectedPoint.latitude);
          const lng = parseCoordinate(selectedPoint.longitude);
          
          console.log('Rendering marker for point:', {
            id: selectedPoint.id,
            lat,
            lng,
            valid: isValidLatitude(lat) && isValidLongitude(lng)
          });
          
          if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
            console.warn('Invalid coordinates for point:', selectedPoint.id, { lat, lng });
            return null;
          }
          
          return (
            <Marker
              key={selectedPoint.id}
              icon={bouncingIcon}
              position={[lat, lng]}
              eventHandlers={{
                add: (e) => {
                  console.log('Marker added to map:', e.target.getLatLng());
                }
              }}>
              <Popup>
                <div>
                  <h3 className="font-bold">{selectedPoint.name}</h3>
                  <p>{selectedPoint.address}</p>
                  <p>{selectedPoint.city}</p>
                  <p className="text-sm text-gray-500">
                    GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
                  </p>
                  <a
                    href={`/point/${selectedPoint.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Voir les détails
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })()}
        <MapUpdater points={points} selectedPoint={selectedPoint} />
      </MapContainer>
    </>
  );
}