import { useCallback, useEffect, useRef, useState } from 'react';
import { IntelligentVersionService, EditSession, VersionCreationConfig } from '../services/intelligent-version.service';
import { VersionService } from '../services/version.service';

export interface VersioningStatus {
  isActive: boolean;
  currentSession: EditSession | null;
  lastVersionTime: number;
  pendingChanges: boolean;
  sessionInfo: {
    duration: number;
    editCount: number;
    hasSignificantChanges: boolean;
  } | null;
}

export interface UseIntelligentVersioningOptions {
  documentId: string;
  config?: Partial<VersionCreationConfig>;
  onVersionCreated?: (versionId: string) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, created: boolean) => void;
  debug?: boolean;
}

export function useIntelligentVersioning({
  documentId,
  config,
  onVersionCreated,
  onSessionStart,
  onSessionEnd,
  debug = false
}: UseIntelligentVersioningOptions) {
  const [status, setStatus] = useState<VersioningStatus>({
    isActive: false,
    currentSession: null,
    lastVersionTime: Date.now(),
    pendingChanges: false,
    sessionInfo: null
  });

  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const intelligentServiceRef = useRef<IntelligentVersionService | null>(null);
  const statusUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);


  const onVersionCreatedRef = useRef(onVersionCreated);
  const onSessionStartRef = useRef(onSessionStart);
  const onSessionEndRef = useRef(onSessionEnd);


  useEffect(() => {
    onVersionCreatedRef.current = onVersionCreated;
    onSessionStartRef.current = onSessionStart;
    onSessionEndRef.current = onSessionEnd;
  });


  useEffect(() => {
    intelligentServiceRef.current = new IntelligentVersionService(config);
    setStatus((prev) => ({ ...prev, isActive: true }));

    return () => {
      if (intelligentServiceRef.current) {
        intelligentServiceRef.current.cleanup();
      }
    };
  }, []);


  useEffect(() => {

    const updateStatus = () => {
      if (intelligentServiceRef.current) {
        const currentSession = intelligentServiceRef.current.getCurrentSessionInfo();
        const now = Date.now();

        setStatus((prev) => ({
          ...prev,
          currentSession,
          sessionInfo: currentSession ? {
            duration: now - currentSession.startTime,
            editCount: currentSession.editCount,
            hasSignificantChanges: currentSession.significantChanges
          } : null
        }));
      }
    };

    statusUpdateTimerRef.current = setInterval(updateStatus, 1000);

    return () => {
      if (statusUpdateTimerRef.current) {
        clearInterval(statusUpdateTimerRef.current);
      }
    };
  }, []);


  const log = useCallback((...args: any[]) => {
    if (debug) {
      
    }
  }, [debug]);


  const handleContentChange = useCallback(async (
  content: string,
  title: string,
  source: 'local' | 'remote' = 'local')
  : Promise<boolean> => {
    if (!intelligentServiceRef.current || isCreatingVersion) {
      return false;
    }


    setStatus((prev) => ({ ...prev, pendingChanges: source === 'local' }));

    try {

      const prevSession = intelligentServiceRef.current.getCurrentSessionInfo();
      const prevSessionId = prevSession?.id;


      const shouldCreateVersion = await intelligentServiceRef.current.handleContentChange(
        content,
        title,
        source
      );


      const currentSession = intelligentServiceRef.current.getCurrentSessionInfo();
      const currentSessionId = currentSession?.id;


      if (!prevSessionId && currentSessionId) {
        log('编辑会话开始:', currentSessionId);
        onSessionStartRef.current?.(currentSessionId);
      }


      if (prevSessionId && !currentSessionId) {
        log('编辑会话结束:', prevSessionId, '创建版本:', shouldCreateVersion);
        onSessionEndRef.current?.(prevSessionId, shouldCreateVersion);
      }


      if (shouldCreateVersion) {
        await createVersion(content, title, 'EDIT', '智能自动保存');
        return true;
      }

      return false;
    } catch (error) {
      
      return false;
    } finally {
      setStatus((prev) => ({ ...prev, pendingChanges: false }));
    }
  }, [isCreatingVersion, log]);


  const createVersion = useCallback(async (
  content: string,
  title: string,
  changeType: 'CREATE' | 'EDIT' | 'TITLE' | 'RESTORE' | 'MERGE' = 'EDIT',
  changeSummary?: string)
  : Promise<string | null> => {
    if (isCreatingVersion) {
      log('版本创建中，跳过重复请求');
      return null;
    }

    setIsCreatingVersion(true);

    try {
      log('开始创建版本:', changeType, changeSummary);

      const version = await VersionService.createVersion({
        documentId,
        title,
        content,
        changeType,
        changeSummary
      });

      const now = Date.now();
      setStatus((prev) => ({
        ...prev,
        lastVersionTime: now,
        pendingChanges: false
      }));

      log('版本创建成功:', version.id, version.versionNumber);
      onVersionCreatedRef.current?.(version.id);

      return version.id;
    } catch (error) {
      
      return null;
    } finally {
      setIsCreatingVersion(false);
    }
  }, [documentId, isCreatingVersion, log]);


  const manualCreateVersion = useCallback(async (
  content: string,
  title: string,
  changeSummary: string = '手动保存检查点')
  : Promise<string | null> => {
    log('手动创建版本请求');


    if (intelligentServiceRef.current) {
      const forced = await intelligentServiceRef.current.forceCreateVersion(content, title);
      if (forced) {
        return await createVersion(content, title, 'EDIT', changeSummary);
      }
    }


    return await createVersion(content, title, 'EDIT', changeSummary);
  }, [createVersion, log]);


  const createTitleChangeVersion = useCallback(async (
  content: string,
  newTitle: string,
  oldTitle: string)
  : Promise<string | null> => {
    const changeSummary = `标题从"${oldTitle}"更改为"${newTitle}"`;
    log('创建标题变更版本:', changeSummary);

    return await createVersion(content, newTitle, 'TITLE', changeSummary);
  }, [createVersion, log]);


  const endCurrentSession = useCallback(async (
  content?: string,
  title?: string)
  : Promise<boolean> => {
    if (!intelligentServiceRef.current) return false;

    const currentSession = intelligentServiceRef.current.getCurrentSessionInfo();
    if (!currentSession) return false;

    log('手动结束编辑会话:', currentSession.id);


    if (content && title && currentSession.significantChanges) {
      const versionId = await createVersion(content, title, 'EDIT', '会话结束保存');
      return !!versionId;
    }

    return false;
  }, [createVersion, log]);


  const getSessionStats = useCallback(() => {
    const session = status.currentSession;
    if (!session) return null;

    const now = Date.now();
    return {
      sessionId: session.id,
      duration: now - session.startTime,
      editCount: session.editCount,
      hasSignificantChanges: session.significantChanges,
      isActive: session.isActive,
      timeSinceLastEdit: now - session.lastEditTime
    };
  }, [status.currentSession]);


  const canCreateVersion = useCallback((content: string): boolean => {
    if (!intelligentServiceRef.current) return false;

    const session = intelligentServiceRef.current.getCurrentSessionInfo();
    return !!(session && session.significantChanges);
  }, []);

  return {

    status,
    isCreatingVersion,


    handleContentChange,
    createVersion,
    manualCreateVersion,
    createTitleChangeVersion,


    endCurrentSession,
    getSessionStats,
    canCreateVersion,


    log
  };
}