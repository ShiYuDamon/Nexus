import apiClient from './api.service';

export const UserService = {

  async getCurrentUser() {
    const response = await apiClient.get('/api/users/me');
    return response.data;
  },


  async updateProfile(data: {name?: string;avatar?: string;}) {
    const response = await apiClient.patch('/api/users/me', data);


    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const updatedUser = { ...user, ...data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        
      }
    }

    return response.data;
  },


  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post('/api/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });


    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const updatedUser = { ...user, avatar: response.data.avatar };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        
      }
    }

    return response.data;
  }
};