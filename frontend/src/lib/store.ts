import { writable } from 'svelte/store';
import { decodeToken, type User } from './api';

export const userStore = writable<User | null>(null);
export const tokenStore = writable<string | null>(null);

export function initializeAuth() {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('token');
  if (token) {
    const claims = decodeToken(token);
    if (claims && claims.exp * 1000 > Date.now()) {
      tokenStore.set(token);
      userStore.set({
        id: claims.sub,
        name: claims.name,
        email: claims.email,
        gender: claims.gender,
        roles: claims.roles
      });
    } else {
      clearAuth();
    }
  }
}

export function setAuth(token: string, user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  tokenStore.set(token);
  userStore.set(user);
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  tokenStore.set(null);
  userStore.set(null);
}
