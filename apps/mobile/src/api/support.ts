import { request } from './client';
import type { Cinema } from './types';

export const supportApi = {
  cinemaPolicies: () => request<Cinema[]>('/v1/cinemas'),
};
