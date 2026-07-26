import axios from 'axios';

let token: string | null = localStorage.getItem('driver_token');

export function setToken(t: string) {
  token = t;
  localStorage.setItem('driver_token', t);
  axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
}

export function clearToken() {
  token = null;
  localStorage.removeItem('driver_token');
  delete axios.defaults.headers.common['Authorization'];
}

export function getToken() { return token; }

if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export async function login(email: string, password: string) {
  const res = await axios.post('/api/auth/login', { email, password });
  const { accessToken, user } = res.data.data;
  if (user.role !== 'DRIVER') throw new Error('Not a driver account');
  setToken(accessToken);
  return user;
}
