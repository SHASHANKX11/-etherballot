import axios from 'axios';

// In production set VITE_API_URL to your backend domain.
// In development the Vite proxy handles /api → http://localhost:5000/api
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000 // 15-second request timeout
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('etherballot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle auth errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      // Request timed out
      return Promise.reject(new Error('Request timed out. Please check your connection.'));
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('etherballot_token');
      localStorage.removeItem('etherballot_user');
      // Don't redirect if already on an auth page
      const authPaths = ['/login', '/register', '/admin/login'];
      const isAuthPage = authPaths.some(p => window.location.pathname.startsWith(p));
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════
//  AUTH API
// ═══════════════════════════════════════════

export const authAPI = {
  validateAadhaar: (aadhaarNumber) =>
    api.post('/auth/validate-aadhaar', { aadhaarNumber }),

  sendOTP: (mobile) =>
    api.post('/auth/send-otp', { mobile }),

  verifyOTP: (mobile, otp) =>
    api.post('/auth/verify-otp', { mobile, otp }),

  register: (userData) =>
    api.post('/auth/register', userData),

  login: (aadhaarNumber) =>
    api.post('/auth/login', { aadhaarNumber }),

  verifyFace: (userId, faceDescriptor) =>
    api.post('/auth/login/verify-face', { userId, faceDescriptor }),

  getMe: () =>
    api.get('/auth/me')
};

// ═══════════════════════════════════════════
//  ADMIN API
// ═══════════════════════════════════════════

export const adminAPI = {
  login: (username, password) =>
    api.post('/admin/login', { username, password }),

  createStateAdmin: (data) =>
    api.post('/admin/create-state-admin', data),

  createDistrictAdmin: (data) =>
    api.post('/admin/create-district-admin', data),

  listAdmins: (params) =>
    api.get('/admin/list', { params }),

  toggleAdminStatus: (id) =>
    api.put(`/admin/${id}/toggle-status`),

  getStats: () =>
    api.get('/admin/stats'),

  getVoters: (params) =>
    api.get('/admin/voters', { params }),

  getAuditLogs: (params) =>
    api.get('/admin/audit-logs', { params }),

  getStates: () =>
    api.get('/admin/states'),

  deleteVoter: (id) =>
    api.delete(`/admin/voters/${id}`)
};

// ═══════════════════════════════════════════
//  ELECTION API
// ═══════════════════════════════════════════

export const electionAPI = {
  create: (data) =>
    api.post('/elections', data),

  getAll: (params) =>
    api.get('/elections', { params }),

  getActive: () =>
    api.get('/elections/active'),

  getById: (id) =>
    api.get(`/elections/${id}`),

  updateStatus: (id, status) =>
    api.put(`/elections/${id}/status`, { status }),

  deleteElection: (id) =>
    api.delete(`/elections/${id}`),

  getResults: (id) =>
    api.get(`/elections/${id}/results`)
};

// ═══════════════════════════════════════════
//  VOTING API
// ═══════════════════════════════════════════

export const votingAPI = {
  castVote: (electionId, candidateIndex) =>
    api.post('/voting/cast', { electionId, candidateIndex }),

  checkStatus: (electionId) =>
    api.get(`/voting/status/${electionId}`),

  getEligibleElections: () =>
    api.get('/voting/eligible-elections'),

  verifyVote: (voteHash) =>
    api.post('/voting/verify', { voteHash })
};

// ═══════════════════════════════════════════
//  VOTER SEARCH / ELECTORAL ROLL API
// ═══════════════════════════════════════════

export const voterAPI = {
  searchElectoralRoll: (params) =>
    api.get('/voters/search', { params }),

  trackApplication: (refId) =>
    api.get(`/voters/track/${refId}`)
};

export default api;
