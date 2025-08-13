import apiClient from './api.service';
import { RegisterDto, LoginDto, AuthResponseDto, RefreshResponseDto } from '@nexus-main/common';

export const AuthService = {

  async register(registerData: RegisterDto): Promise<any> {
    const response = await apiClient.post('/api/auth/register', registerData);
    return response.data;
  },


  async login(loginData: LoginDto): Promise<AuthResponseDto> {
    const response = await apiClient.post('/api/auth/login', loginData);
    const authData = response.data;


    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user', JSON.stringify(authData.user));

    return authData;
  },


  async refreshToken(refreshToken: string): Promise<RefreshResponseDto> {
    const response = await apiClient.post('/api/auth/refresh', { refreshToken });
    const { accessToken } = response.data;


    localStorage.setItem('accessToken', accessToken);

    return response.data;
  },


  async logout(): Promise<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiClient.post('/api/auth/logout', { refreshToken });
      } catch (error) {
        
      }
    }


    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    return { success: true };
  },


  getCurrentUser() {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch (error) {
      
      return null;
    }
  },


  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }
};