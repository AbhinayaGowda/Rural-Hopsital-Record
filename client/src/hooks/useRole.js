import { useAuth } from './useAuth.js';

export function useRole() {
  const { profile } = useAuth();
  const role = profile?.role ?? null;
  return {
    role,
    isAdmin:       role === 'admin',
    isDoctor:      role === 'doctor' || role === 'admin',
    isGroundStaff: role === 'ground_staff' || role === 'admin',
    can: (roles) => roles.includes(role),
  };
}
