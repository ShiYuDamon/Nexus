import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { WorkspaceDetailDto } from '@nexus-main/common';
import { WorkspaceService } from '../services/workspace.service';

interface WorkspaceContextType {
  workspace: WorkspaceDetailDto | null;
  loading: boolean;
  error: string | null;
  refetchWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  loading: true,
  error: null,
  refetchWorkspace: async () => {}
});

export const useWorkspaceContext = () => useContext(WorkspaceContext);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { id: workspaceId } = useParams<{id: string;}>();

  const [workspace, setWorkspace] = useState<WorkspaceDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await WorkspaceService.getById(workspaceId);
      setWorkspace(data);
    } catch (err) {
      
      setError('无法加载工作区信息，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        loading,
        error,
        refetchWorkspace: fetchWorkspace
      }}>
      
      {children}
    </WorkspaceContext.Provider>);

}