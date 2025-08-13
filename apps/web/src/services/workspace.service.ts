import apiClient from './api.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
  WorkspaceListResponseDto,
  WorkspaceDetailDto,
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberDto,
  WorkspaceMemberDto } from
'@nexus-main/common';

export const WorkspaceService = {

  async create(data: CreateWorkspaceDto): Promise<WorkspaceDto> {
    const response = await apiClient.post('/api/workspaces', data);
    return response.data;
  },


  async getAll(page = 1, limit = 10): Promise<WorkspaceListResponseDto> {
    const response = await apiClient.get('/api/workspaces', {
      params: { page, limit }
    });
    return response.data;
  },


  async getById(id: string): Promise<WorkspaceDetailDto> {
    const response = await apiClient.get(`/api/workspaces/${id}`);
    return response.data;
  },


  async update(id: string, data: UpdateWorkspaceDto): Promise<WorkspaceDto> {
    const response = await apiClient.patch(`/api/workspaces/${id}`, data);
    return response.data;
  },


  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${id}`);
  },


  async addMember(workspaceId: string, data: AddWorkspaceMemberDto): Promise<WorkspaceMemberDto> {
    const response = await apiClient.post(`/api/workspaces/${workspaceId}/members`, data);
    return response.data;
  },


  async updateMember(workspaceId: string, memberId: string, data: UpdateWorkspaceMemberDto): Promise<WorkspaceMemberDto> {
    const response = await apiClient.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, data);
    return response.data;
  },


  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
  }
};