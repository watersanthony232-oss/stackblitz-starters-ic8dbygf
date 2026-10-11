# Fillkin

Find nearby **fuel stations** and **EV chargers**, see them on a map, and keep track of prices.

- **Near me** (browser geolocation) or search any town, postcode or address
- Toggle between ⛽ Fuel and ⚡ EV charging
- Filter by radius (miles or km) and fuel type (petrol, diesel, LPG, E85)
- EV chargers show connector types (CCS, CHAdeMO, Type 2, …), counts and max power
- Opening hours, brand/operator, address, one-tap directions
- ★ Favourites, and price reports you enter yourself, sortable by cheapest
  (saved in your browser's localStorage and dropped after 14 days)

Station data comes from OpenStreetMap via the free Overpass API; place search uses Nominatim. No API keys are needed.

## Run

```sh
npm install
npm run dev      # dev server
npm test         # unit tests
npm run build    # type-check + production build into dist/
```
