import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix webpack / CRA default icon paths
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Listens for map clicks and calls onChange({ lat, lng }) */
function ClickHandler({ onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Re-centers the map when lat/lng props change (e.g. "use my location") */
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

/**
 * LocationPicker
 * Props:
 *   lat, lng          – current selected coordinates (numbers or empty strings)
 *   onChange(obj)     – called with { lat, lng } on click or marker drag
 *   onUseMyLocation() – callback to trigger GPS capture
 *   geoLoading        – bool, disables the "use my location" button while fetching
 *   isBangla          – bool for i18n
 */
export default function LocationPicker({
  lat,
  lng,
  onChange,
  onUseMyLocation,
  geoLoading,
  isBangla,
}) {
  const hasPosition = lat && lng;
  const center = hasPosition ? [parseFloat(lat), parseFloat(lng)] : [23.8103, 90.4125];

  return (
    <div className="rounded-xl overflow-hidden border border-stone-200/70 dark:border-white/[0.08] shadow-sm">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '280px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {hasPosition && (
          <Marker
            position={center}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat: newLat, lng: newLng } = e.target.getLatLng();
                onChange({ lat: newLat, lng: newLng });
              },
            }}
          />
        )}
        <RecenterMap lat={hasPosition ? parseFloat(lat) : null} lng={hasPosition ? parseFloat(lng) : null} />
      </MapContainer>

      {/* bottom bar */}
      <div className="px-4 py-2.5 bg-white/90 dark:bg-[#1a1a1a] flex items-center justify-between gap-4 text-[12px]">
        <span className="text-muted font-mono">
          {hasPosition
            ? `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`
            : (isBangla ? 'মানচিত্রে ট্যাপ করুন বা মার্কার টানুন' : 'Tap the map or drag marker to set location')}
        </span>
        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300 hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {geoLoading ? '…' : (isBangla ? 'আমার লোকেশন' : 'Use my location')}
        </button>
      </div>
    </div>
  );
}
