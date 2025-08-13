import apiClient from './api.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentDto,
  DocumentListResponseDto,
  DocumentDetailDto } from
'@nexus-main/common';

export const DocumentService = {

  async create(data: CreateDocumentDto): Promise<DocumentDto> {
    const response = await apiClient.post('/api/documents', data);
    return response.data;
  },


  async getByWorkspace(
  workspaceId: string,
  page = 1,
  limit = 10)
  : Promise<DocumentListResponseDto> {
    const response = await apiClient.get(
      `/api/workspaces/${workspaceId}/documents`,
      {
        params: { page, limit }
      }
    );
    return response.data;
  },


  async getById(id: string): Promise<DocumentDetailDto> {
    const response = await apiClient.get(`/api/documents/${id}`);
    return response.data;
  },


  async update(id: string, data: UpdateDocumentDto): Promise<DocumentDto> {
    const response = await apiClient.patch(`/api/documents/${id}`, data);
    return response.data;
  },


  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/documents/${id}`);
  },


  async getRecent(limit = 5): Promise<DocumentListResponseDto> {
    try {
      const response = await apiClient.get('/api/documents/recent', {
        params: { limit }
      });
      return response.data;
    } catch (error) {

      
      return { items: [], total: 0 };
    }
  }
};