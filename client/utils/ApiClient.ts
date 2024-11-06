import { useContext } from 'react';
import { TokenContext } from '@/context/TokenProvider';
import axios from 'axios';

export const useApiClient = () => {
  const tokenContext = useContext(TokenContext);

  if (!tokenContext) {
    throw new Error('useApiClient must be used within a TokenProvider');
  }

  const { accessToken } = tokenContext;

  const apiClient = axios.create({
    baseURL: 'https://api.spotify.com/v1',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  return apiClient;
};
