export type Role = 'ADMIN' | 'MANAGER' | 'TRAINER' | 'TRAINEE';

export const Role = {
  ADMIN: 'ADMIN' as const,
  MANAGER: 'MANAGER' as const,
  TRAINER: 'TRAINER' as const,
  TRAINEE: 'TRAINEE' as const,
};

