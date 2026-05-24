// Convierte grados a radianes
const toRad = (value: number) => (value * Math.PI) / 180;

// Calcula la distancia Haversine entre dos coordenadas GPS en km
export const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Convierte la distancia en un tiempo heurístico h(n) optimista en minutos.
// Asume una velocidad base de 50 km/h para garantizar la admisibilidad.
export const calculateHeuristicTime = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const distanceKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  const optimisticSpeedKmH = 50;
  return (distanceKm / optimisticSpeedKmH) * 60;
};