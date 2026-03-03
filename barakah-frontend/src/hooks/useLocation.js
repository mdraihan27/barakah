import { useState, useEffect } from 'react';

/**
 * Hook to get the user's geolocation.
 * Returns { lat, lng, error, loading, refresh }.
 */
export function useLocation() {
  const [position, setPosition] = useState({ lat: null, lng: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const getPosition = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        // Default to Dhaka if geolocation fails
        setPosition({ lat: 23.8103, lng: 90.4125 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    getPosition();
  }, []);

  return { ...position, error, loading, refresh: getPosition };
}
