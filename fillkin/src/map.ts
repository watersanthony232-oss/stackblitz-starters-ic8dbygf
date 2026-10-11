// Fillkin - Leaflet map showing the search centre and station markers.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLon } from './geo';
import type { Station } from './stations';

let map: L.Map | null = null;
let markers: L.LayerGroup | null = null;
let centerMarker: L.CircleMarker | null = null;
let selectHandler: (id: string) => void = () => {};
const markerById = new Map<string, { marker: L.Marker; kind: Station['kind'] }>();

function pinIcon(kind: Station['kind'], favourite: boolean, selected: boolean) {
  const cls = ['pin', `pin-${kind}`, favourite ? 'pin-fav' : '', selected ? 'pin-selected' : '']
    .filter(Boolean)
    .join(' ');
  return L.divIcon({
    className: '',
    html: `<div class="${cls}"><span>${kind === 'fuel' ? '⛽' : '⚡'}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

export function initMap(el: HTMLElement, onSelect: (id: string) => void) {
  map = L.map(el, { zoomControl: true }).setView([51.505, -0.09], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  markers = L.layerGroup().addTo(map);
  selectHandler = onSelect;
}

export function showResults(
  center: LatLon,
  radiusMeters: number,
  stations: Station[],
  isFav: (id: string) => boolean
) {
  if (!map || !markers) return;
  markers.clearLayers();
  markerById.clear();
  centerMarker?.remove();
  centerMarker = L.circleMarker([center.lat, center.lon], {
    radius: 8,
    color: '#fff',
    weight: 3,
    fillColor: '#2563eb',
    fillOpacity: 1,
  }).addTo(map);

  for (const s of stations) {
    const m = L.marker([s.lat, s.lon], { icon: pinIcon(s.kind, isFav(s.id), false), title: s.name });
    m.on('click', () => selectHandler(s.id));
    m.addTo(markers);
    markerById.set(s.id, { marker: m, kind: s.kind });
  }

  const bounds = L.latLng(center.lat, center.lon).toBounds(radiusMeters * 2);
  map.fitBounds(bounds, { padding: [10, 10] });
}

export function highlight(station: Station | null, isFav: (id: string) => boolean, pan: boolean) {
  for (const [id, { marker, kind }] of markerById) {
    marker.setIcon(pinIcon(kind, isFav(id), station?.id === id));
    marker.setZIndexOffset(station?.id === id ? 1000 : 0);
  }
  if (station && pan && map) map.panTo([station.lat, station.lon]);
}

export function invalidateSize() {
  map?.invalidateSize();
}
