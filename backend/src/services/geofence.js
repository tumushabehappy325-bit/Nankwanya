/**
 * Geofencing & Matching Service for Nankwanya
 * 
 * Implements:
 * 1. Haversine spherical distance calculation (in kilometers)
 * 2. Blood compatibility matrix
 * 3. Donor eligibility filtering by radius and blood type
 * 
 * Note on MVP vs Production scale:
 * This Haversine scan runs in O(n) over donor records, which is fast and dependable
 * for MVP/demo scale (hundreds to thousands of donors).
 * For national scale (>100k donors), the recommended scale-up path is PostgreSQL + PostGIS
 * with spatial indexing (ST_DWithin) or S2/H3 geohash spatial buckets.
 */

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates great-circle distance between two coordinate pairs using Haversine formula
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // 2 decimal places
}

/**
 * Standard Red Blood Cell (RBC) compatibility table
 * Map key is recipient blood type, value is array of compatible donor types
 */
const RBC_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] // Universal recipient
};

/**
 * Checks if a donor's blood type is compatible with requested blood type
 * @param {string} donorBloodType - Donor's blood type (e.g. 'O+', 'B-')
 * @param {string} requestedBloodType - Requested blood type or 'ANY'
 * @param {boolean} exactMatchOnly - If true, only identical blood types match
 * @returns {boolean}
 */
function isBloodCompatible(donorBloodType, requestedBloodType, exactMatchOnly = false) {
  if (!requestedBloodType || requestedBloodType.toUpperCase() === 'ANY') {
    return true;
  }
  if (!donorBloodType) {
    return false;
  }

  const cleanDonor = donorBloodType.trim().toUpperCase();
  const cleanReq = requestedBloodType.trim().toUpperCase();

  if (exactMatchOnly) {
    return cleanDonor === cleanReq;
  }

  const compatibleDonors = RBC_COMPATIBILITY[cleanReq];
  if (!compatibleDonors) {
    return cleanDonor === cleanReq;
  }

  return compatibleDonors.includes(cleanDonor);
}

/**
 * Filters donors within radius R of facility coordinates and matching blood type
 * @param {Object} params
 * @param {number} params.facilityLat - Facility latitude
 * @param {number} params.facilityLng - Facility longitude
 * @param {number} params.radiusKm - Geofence radius in km (default 5)
 * @param {string} params.bloodType - Blood type needed (e.g. 'O+', 'A-', 'ANY')
 * @param {Array} params.donors - List of donor records
 * @param {boolean} [params.exactMatchOnly=false] - Whether to enforce exact type match
 * @returns {Array} List of matched donors with attached distanceKm
 */
function findEligibleDonors({
  facilityLat,
  facilityLng,
  radiusKm = 5,
  bloodType = 'ANY',
  donors = [],
  exactMatchOnly = false
}) {
  if (!facilityLat || !facilityLng || !Array.isArray(donors)) {
    return [];
  }

  const radius = Number(radiusKm) || 5;

  return donors
    .map((donor) => {
      const distance = haversineDistance(
        facilityLat,
        facilityLng,
        donor.lat,
        donor.lng
      );

      const compatible = isBloodCompatible(donor.bloodType, bloodType, exactMatchOnly);

      return {
        ...donor,
        distanceKm: distance,
        isWithinRadius: distance <= radius,
        isBloodCompatible: compatible
      };
    })
    .filter((donor) => donor.isWithinRadius && donor.isBloodCompatible)
    .sort((a, b) => a.distanceKm - b.distanceKm); // Nearest first
}

module.exports = {
  EARTH_RADIUS_KM,
  haversineDistance,
  isBloodCompatible,
  findEligibleDonors,
  RBC_COMPATIBILITY
};
