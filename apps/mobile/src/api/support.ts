import { request } from './client';
import type { Cinema } from './types';

/** A participating cinema with its cancellation and refund policy, in the request language (BRD 9). */
export type CinemaPolicy = Cinema & { cancellationPolicy: string };

export const supportApi = {
  cinemaPolicies: () => request<CinemaPolicy[]>('/v1/cinemas'),
};
