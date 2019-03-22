
const createValidator = require('./createValidator');

const radians = n => n * Math.PI / 180;

const earthRadius = 6371e3;

/**
 *  Haversine: https://www.movable-type.co.uk/scripts/latlong.html
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Kilometers
 */
const haversine = (lat1, lon1, lat2, lon2) => {
  const validate = createValidator('haversine');
  validate('lat1').asNumber(lat1);
  validate('lon1').asNumber(lon1);
  validate('lat2').asNumber(lat2);
  validate('lon2').asNumber(lon2);
  const lat1r = radians(lat1);
  const lat2r = radians(lat2);
  const latdr = radians(lat2 - lat1);
  const londr = radians(lon2 - lon1);
  const a = Math.sin(latdr / 2) * Math.sin(latdr / 2) + Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(londr / 2) * Math.sin(londr / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;
  validate('distance').asNumber(distance);
  return distance;
};

module.exports = haversine;
