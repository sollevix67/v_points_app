export type PointType = 'locker' | 'parcel_shop';

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
}

export interface DeliveryPoint {
  id: string;
  point_type: PointType;
  shop_code: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  opening_timeframe?: string;
  streetview_heading: number;
  streetview_pitch: number;
  streetview_zoom: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryPointFormData {
  point_type: PointType;
  shop_code: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  opening_timeframe?: string;
  streetview_heading: number;
  streetview_pitch: number;
  streetview_zoom: number;
  comment?: string;
}