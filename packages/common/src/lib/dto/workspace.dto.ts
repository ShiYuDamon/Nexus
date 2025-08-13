export interface CreateWorkspaceDto {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceListResponseDto {
  items: WorkspaceDto[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkspaceDetailDto extends WorkspaceDto {
  members: WorkspaceMemberDto[];
}

export interface WorkspaceMemberDto {
  id: string;
  userId: string;
  role: WorkspaceRole;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export interface AddWorkspaceMemberDto {
  email: string;
  role: WorkspaceRole;
}

export interface UpdateWorkspaceMemberDto {
  role: WorkspaceRole;
}