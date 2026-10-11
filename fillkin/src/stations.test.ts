import { describe, expect, it } from 'vitest';
import { buildQuery, parseElement } from './stations';
import { formatDistance, haversineMeters, radiusToMeters } from './geo';

const origin = { lat: 51.5, lon: -0.1 };

describe('parseElement', () => {
  it('parses a fuel station with fuel types and address', () => {
    const s = parseElement(
      {
        type: 'node',
        id: 1,
        lat: 51.501,
        lon: -0.1,
        tags: {
          amenity: 'fuel',
          name: 'High St Garage',
          brand: 'Shell',
          'fuel:diesel': 'yes',
          'fuel:octane_95': 'yes',
          'fuel:lpg': 'no',
          'addr:housenumber': '12',
          'addr:street': 'High Street',
          'addr:city': 'London',
          opening_hours: '24/7',
        },
      },
      'fuel',
      origin
    )!;
    expect(s.id).toBe('node/1');
    expect(s.name).toBe('High St Garage');
    expect(s.brand).toBe('Shell');
    expect(s.fuels.sort()).toEqual(['diesel', 'petrol']);
    expect(s.address).toBe('12 High Street, London');
    expect(s.distanceMeters).toBeGreaterThan(100);
    expect(s.distanceMeters).toBeLessThan(120);
  });

  it('uses way centre and parses charger sockets and power', () => {
    const s = parseElement(
      {
        type: 'way',
        id: 2,
        center: { lat: 51.5, lon: -0.1 },
        tags: {
          amenity: 'charging_station',
          operator: 'Ionity',
          'socket:type2_combo': '4',
          'socket:type2_combo:output': '350 kW',
          'socket:chademo': 'yes',
          'socket:type2': 'no',
          capacity: '4',
        },
      },
      'ev',
      origin
    )!;
    expect(s.name).toBe('Ionity');
    expect(s.brand).toBeNull();
    expect(s.connectors).toEqual([
      { name: 'CCS', count: 4 },
      { name: 'CHAdeMO', count: null },
    ]);
    expect(s.maxPowerKw).toBe(350);
    expect(s.capacity).toBe(4);
  });

  it('returns null without coordinates', () => {
    expect(parseElement({ type: 'relation', id: 3 }, 'fuel', origin)).toBeNull();
  });
});

describe('geo', () => {
  it('builds an around query', () => {
    expect(buildQuery('ev', origin, 1609.3)).toContain('"amenity"="charging_station"](around:1609,51.5,-0.1)');
  });

  it('formats distances', () => {
    expect(formatDistance(1609.344 * 2.34, 'mi')).toBe('2.3 mi');
    expect(formatDistance(50, 'mi')).toBe('164 ft');
    expect(formatDistance(850, 'km')).toBe('850 m');
    expect(formatDistance(2500, 'km')).toBe('2.5 km');
    expect(radiusToMeters(5, 'km')).toBe(5000);
  });

  it('computes haversine distance', () => {
    expect(Math.round(haversineMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) / 1000)).toBe(111);
  });
});
