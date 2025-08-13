export interface CreateDocumentDto {
  title: string;
  content?: string;
  workspaceId: string;
}

export interface UpdateDocumentDto {
  title?: string;
  content?: string;
}

export interface DocumentDto {
  id: string;
  title: string;
  content?: string;
  workspaceId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  workspace?: {
    id: string;
    name: string;
  };
}

export interface DocumentListResponseDto {
  items: DocumentDto[];
  total: number;
  page: number;
  limit: number;
}

export interface DocumentDetailDto extends DocumentDto {
  author: {
    id: string;
    name: string;
    email: string;
  };
  workspace: {
    id: string;
    name: string;
  };
}