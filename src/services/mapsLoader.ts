import { Loader } from '@googlemaps/js-api-loader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const loader = new Loader({
  apiKey: API_KEY,
  version: 'weekly',
  libraries: ['places', 'geometry', 'routes'],
});

export const mapsReady: Promise<any> = loader.load();

export async function importMapsLibrary(
  libraryName: string,
): Promise<any> {
  await mapsReady;
  return google.maps.importLibrary(libraryName as Parameters<typeof google.maps.importLibrary>[0]);
}