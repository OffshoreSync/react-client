import i18next from 'i18next';

// Predefined Offshore Roles to match User model enum
export const OFFSHORE_ROLES = [
  'Drilling',
  'Production', 
  'Maintenance', 
  'Support', 
  'Management',
  'Operations',
  'Safety',
  'Bridge'
];

// Translate offshore roles
export const getTranslatedRoles = () => {
  return OFFSHORE_ROLES.map(role => 
    i18next.t(`offshoreRoles.${role.toLowerCase()}`)
  );
};
