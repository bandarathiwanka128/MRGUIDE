import { useEffect, useMemo, useState } from 'react';

/* Google Maps styling that matches the Mr. Guide themes.
   Used by every map screen so maps follow the light/dark toggle. */

const NIGHT = [
  { elementType: 'geometry', stylers: [{ color: '#13243a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#b3bfcc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1622' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2d4560' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f3eee6' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d9b84a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#172b42' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#173a35' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#7fb79a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22384f' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f1e2e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8ca0b4' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4f63' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1b2c3e' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#e7d9a8' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f3349' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#b3bfcc' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1726' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4f6d8a' }] },
];

const DAY = [
  { elementType: 'geometry', stylers: [{ color: '#f4efe6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475666' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f7f4ee' }, { weight: 3 }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9bfae' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#12202e' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#ebe4d6' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7a5a00' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dbe8d2' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3f6b4f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e2d9c9' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f6dd8c' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e6c25c' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#5c4500' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#e6dccb' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b7d3e6' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#34699a' }] },
];

export const MAP_THEMES = {
  dark: { styles: NIGHT, route: '#FFCC00', routeAlt: '#8CB8E2', marker: '#FFCC00' },
  light: { styles: DAY, route: '#34699A', routeAlt: '#B08400', marker: '#34699A' },
};

const currentTheme = () =>
  (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

/* Returns the map theme for the active app theme and updates when it changes. */
export function useMapTheme() {
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(currentTheme()));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return useMemo(() => ({ name: theme, ...MAP_THEMES[theme] }), [theme]);
}
