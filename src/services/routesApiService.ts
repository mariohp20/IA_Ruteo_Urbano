import { Location } from '../types/route';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const ROUTES_API_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

export async function fetchAutomobileMatrix(locations: Location[]) {
    const waypoints = locations.map(loc => ({
        waypoint: {
            location: {
                latLng: { latitude: loc.lat, longitude: loc.lng }
            }
        }
    }));

    const payload = {
        origins: waypoints,
        destinations: waypoints,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE_OPTIMAL"
    };

    try {
        const response = await fetch(ROUTES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Routes API Error: ${response.status}`);

        const data = await response.json();
        return parseRoutesApiToMatrix(data, locations.length);

    } catch (error) {
        console.error("[RoutesApiService] Error fetching route matrix:", error);
        return null;
    }
}

/** Convierte la respuesta plana de la Routes API en una matriz NxN de segundos. */
function parseRoutesApiToMatrix(apiResponse: Array<{ originIndex?: number; destinationIndex?: number; duration?: string }>, nodeCount: number): number[][] {
    const matrix: number[][] = Array(nodeCount).fill(0).map(() => Array(nodeCount).fill(0));

    apiResponse.forEach(element => {
        const i = element.originIndex;
        const j = element.destinationIndex;
        const durationSecs = element.duration ? parseInt(element.duration.replace('s', '')) : 0;

        if (i !== undefined && j !== undefined) {
            matrix[i][j] = durationSecs;
        }
    });

    return matrix;
}