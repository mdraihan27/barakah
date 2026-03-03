import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
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

/** Custom green pin icon for shop markers */
const shopIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px; height:36px;
    background: linear-gradient(135deg,#059669,#10b981);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(5,150,105,0.45);
  "></div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -38],
});

/** Re-fits the map bounds to show user + all shops */
function FitBounds({ bounds }) {
  const map = useMap();
  useMemo(() => {
    if (bounds && bounds.length >= 1) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(bounds)]);
  return null;
}

/**
 * NearbyShopsMap
 * Props:
 *   userLat, userLng  – user's coordinates
 *   shops             – array of shop objects ({ _id, name, address, category, distance_km, location })
 *   isBangla          – bool for i18n
 *   className         – optional extra classes for the wrapper
 */
export default function NearbyShopsMap({ userLat, userLng, shops = [], isBangla, className = '' }) {
  const hasUser = userLat && userLng;
  const center = hasUser ? [userLat, userLng] : [23.8103, 90.4125];

  // Build bounds from user + shops (all points with valid coords)
  const bounds = useMemo(() => {
    const pts = [];
    if (hasUser) pts.push([userLat, userLng]);
    for (const s of shops) {
      const sLat = s.location?.coordinates?.[1];
      const sLng = s.location?.coordinates?.[0];
      if (sLat && sLng) pts.push([sLat, sLng]);
    }
    return pts.length >= 2 ? pts : null;
  }, [hasUser, userLat, userLng, shops]);

  return (
    <div className={`rounded-xl overflow-hidden border border-stone-200/70 dark:border-white/[0.08] shadow-sm ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location – blue pulsing circle */}
        {hasUser && (
          <>
            <CircleMarker
              center={[userLat, userLng]}
              radius={10}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.25, weight: 2 }}
            >
              <Popup>
                <strong>{isBangla ? 'আপনি এখানে' : 'You are here'}</strong>
              </Popup>
            </CircleMarker>
            <CircleMarker
              center={[userLat, userLng]}
              radius={5}
              pathOptions={{ color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
            />
          </>
        )}

        {/* Shop markers */}
        {shops.map((shop) => {
          const sLat = shop.location?.coordinates?.[1];
          const sLng = shop.location?.coordinates?.[0];
          if (!sLat || !sLng) return null;
          return (
            <Marker key={shop._id} position={[sLat, sLng]} icon={shopIcon}>
              <Popup minWidth={180}>
                <div className="text-[13px]">
                  <p className="font-semibold text-stone-800 leading-tight mb-1">{shop.name}</p>
                  {shop.category && (
                    <p className="text-[11px] text-emerald-700 font-medium mb-1">{shop.category}</p>
                  )}
                  {shop.address && (
                    <p className="text-[11px] text-stone-500 mb-1">{[shop.address.street, shop.address.city, shop.address.state, shop.address.country].filter(Boolean).join(', ') || null}</p>
                  )}
                  {shop.distance_km != null && (
                    <p className="text-[11px] text-stone-500 mb-2">
                      {shop.distance_km.toFixed(1)} {isBangla ? 'কিমি দূরে' : 'km away'}
                    </p>
                  )}
                  <Link
                    to={`/dashboard/shop/${shop._id}`}
                    className="inline-block text-[12px] font-medium text-emerald-700 hover:underline"
                  >
                    {isBangla ? 'দোকান দেখুন →' : 'View Shop →'}
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>

      {/* legend */}
      <div className="px-4 py-2 bg-white/90 dark:bg-[#1a1a1a] flex items-center gap-6 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500/60 border-2 border-blue-500 inline-block" />
          {isBangla ? 'আপনার অবস্থান' : 'Your location'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          {isBangla ? `${shops.length}টি দোকান` : `${shops.length} shop${shops.length !== 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  );
}
