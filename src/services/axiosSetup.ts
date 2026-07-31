import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const setupAxiosInterceptors = () => {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Avoid infinite loops by checking _retry flag, and only intercept 401s
      // Also avoid intercepting the refresh endpoint itself to prevent loops
      if (
        error.response?.status === 401 && 
        !originalRequest._retry &&
        originalRequest.url !== `${API_URL}/auth/refresh`
      ) {
        originalRequest._retry = true;

        const { refreshToken, logout, setTokens } = useAuthStore.getState();

        if (refreshToken) {
          try {
            // Hit the refresh endpoint
            const res = await axios.post(
              `${API_URL}/auth/refresh`,
              {},
              {
                headers: { Authorization: `Bearer ${refreshToken}` },
              }
            );

            // Our backend returns { accessToken, refreshToken }
            const newAccessToken = res.data.accessToken || res.data.access_token || res.data.token;
            const newRefreshToken = res.data.refreshToken;

            if (newAccessToken) {
              // Save the new tokens
              setTokens(newAccessToken, newRefreshToken || refreshToken);

              // Update the failed request with the new access token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              }

              // Retry the original request
              return axios(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed (token expired or invalid)
            logout();
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token available
          logout();
        }
      }

      return Promise.reject(error);
    }
  );
};
