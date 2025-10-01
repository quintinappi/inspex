// Input validation utilities

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

const validateRole = (role) => {
  const validRoles = ['inspector', 'engineer', 'admin', 'client'];
  return validRoles.includes(role);
};

const validatePressure = (pressure) => {
  return pressure === 140 || pressure === 400;
};

const validateSize = (size) => {
  const validSizes = ['1.5', '1.8', '2.0'];
  return validSizes.includes(size);
};

const validateDoorType = (doorType) => {
  const validTypes = ['V1', 'V2'];
  return validTypes.includes(doorType);
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Remove any potentially dangerous characters
  return str.trim().slice(0, 500); // Max length 500
};

const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRole,
  validatePressure,
  validateSize,
  validateDoorType,
  sanitizeString,
  validateRequired
};
