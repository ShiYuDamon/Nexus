import apiClient from './api.service';

export interface CreateVersionDto {
  documentId: string;
  title: string;
  content: string;
  changeType?: 'CREATE' | 'EDIT' | 'TITLE' | 'RESTORE' | 'MERGE';
  changeSummary?: string;
}

export interface Version {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  changeType: 'CREATE' | 'EDIT' | 'TITLE' | 'RESTORE' | 'MERGE';
  changeSummary?: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface VersionListResponse {
  versions: Version[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const VersionService = {

  async createVersion(data: CreateVersionDto): Promise<Version> {
    const response = await apiClient.post('/api/versions', data);
    return response.data;
  },


  async getDocumentVersions(
  documentId: string,
  page = 1,
  limit = 20)
  : Promise<VersionListResponse> {
    const response = await apiClient.get(
      `/api/versions/document/${documentId}?page=${page}&limit=${limit}`
    );
    return response.data;
  },


  async getVersion(versionId: string): Promise<Version> {
    const response = await apiClient.get(`/api/versions/${versionId}`);
    return response.data;
  },


  async compareVersions(fromVersionId: string, toVersionId: string) {
    const response = await apiClient.post('/api/versions/compare', {
      fromVersionId,
      toVersionId
    });
    return response.data;
  },


  async restoreVersion(versionId: string): Promise<Version> {
    const response = await apiClient.post(`/api/versions/${versionId}/restore`);
    return response.data;
  },


  async autoCreateVersion(
  documentId: string,
  title: string,
  content: string,
  changeSummary = '自动保存')
  : Promise<Version> {
    return this.createVersion({
      documentId,
      title,
      content,
      changeType: 'EDIT',
      changeSummary
    });
  },


  async createInitialVersion(
  documentId: string,
  title: string,
  content: string)
  : Promise<Version> {
    return this.createVersion({
      documentId,
      title,
      content,
      changeType: 'CREATE',
      changeSummary: '文档创建'
    });
  },


  async createTitleChangeVersion(
  documentId: string,
  title: string,
  content: string,
  oldTitle: string)
  : Promise<Version> {
    return this.createVersion({
      documentId,
      title,
      content,
      changeType: 'TITLE',
      changeSummary: `标题从"${oldTitle}"更改为"${title}"`
    });
  }
};