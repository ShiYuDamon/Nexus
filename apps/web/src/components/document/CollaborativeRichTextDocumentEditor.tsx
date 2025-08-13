import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo } from
'react';
import { CollaborativeRichTextBlockEditor } from '@nexus-main/editor';
import { useAuth } from '../../contexts/AuthContext';
import { debounce } from 'lodash';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useDocumentStore } from '../../stores/documentStore';
import { UserAvatarGroup } from '../ui/UserAvatar';
import { VersionHistoryPanel } from '../version-history/VersionHistoryPanel';
import { CommentPanel } from '../comments/CommentPanel';
import { GlobalCommentSection } from '../comments/GlobalCommentSection';
import { FixedCommentSidebar } from '../comments/FixedCommentSidebar';
import { UnifiedHistoryPanel } from '../history/UnifiedHistoryPanel';
import { FullscreenHistoryView } from '../history/FullscreenHistoryView';
import { VersionService } from '../../services/version.service';
import { useIntelligentVersioning } from '../../hooks/useIntelligentVersioning';


import apiClient from '../../services/api.service';
import '../comments/comment-highlight.css';

interface CollaborativeRichTextDocumentEditorProps {
  documentId: string;
  initialContent?: string;
  documentTitle?: string;
  onTitleChange?: (title: string) => void;
  onContentChange?: (content: string, source?: 'local' | 'remote') => void;
  onCollaboratorsChange?: (
  users: {name: string;color: string;id: number;}[])
  => void;
  readOnly?: boolean;
  debug?: boolean;
  showOutline?: boolean;
  lastEditTime?: Date;
  className?: string;
  showVersionHistory?: boolean;
  showComments?: boolean;
  onCommentChange?: () => void;
}


export interface CollaborativeRichTextDocumentEditorRef {
  cleanup: () => void;
  getConnectionStatus: () => 'connected' | 'disconnected' | 'connecting';
  getConnectedUsers: () => {name: string;color: string;id: number;}[];
  handleBlockCommentClick: (
  blockId: string,
  source?: 'indicator' | 'button')
  => void;
}

const CollaborativeRichTextDocumentEditor = forwardRef<
  CollaborativeRichTextDocumentEditorRef,
  CollaborativeRichTextDocumentEditorProps>(

  (
  {
    documentId,
    initialContent = '',
    documentTitle = '',
    onTitleChange,
    onContentChange,
    onCollaboratorsChange,
    readOnly = false,
    debug = false,
    showOutline = false,
    lastEditTime,
    className = '',
    showVersionHistory = true,
    showComments = true,
    onCommentChange
  },
  ref) =>
  {
    const { user } = useAuth();


    const { updateDocumentTitle } = useDocumentStore();


    const [connectionStatus, setConnectionStatus] = useState<
      'connected' | 'disconnected' | 'connecting'>(
      'connecting');
    const [connectedUsers, setConnectedUsers] = useState<number>(0);
    const [onlineUsers, setOnlineUsers] = useState<
      {name: string;color: string;id: number;}[]>(
      []);
    const [lastSavedContent, setLastSavedContent] =
    useState<string>(initialContent);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    const [initialBlocks, setInitialBlocks] = useState<any[]>([]);

    const isInitialConnectionAttemptRef = useRef<boolean>(true);

    const lastLocalEditTimeRef = useRef<number>(Date.now());

    const changeSourceRef = useRef<'local' | 'remote' | null>(null);

    const isPageVisibleRef = useRef<boolean>(true);

    const [title, setTitle] = useState<string>(documentTitle);


    const blockEditorRef = useRef<any>(null);


    const forceUpdateEditorContent = useCallback(
      (newBlocks: any[]) => {
        if (blockEditorRef.current && blockEditorRef.current.setBlocks) {
          blockEditorRef.current.setBlocks(newBlocks);
          if (debug) {
            
          }
        } else {

          setInitialBlocks(newBlocks);
          if (debug) {
            
          }
        }
      },
      [debug]
    );


    const [showVersionHistoryPanel, setShowVersionHistoryPanel] =
    useState(false);
    const [showCommentPanel, setShowCommentPanel] = useState(false);

    const [showUnifiedHistoryPanel, setShowUnifiedHistoryPanel] =
    useState(false);

    const [showFullscreenHistory, setShowFullscreenHistory] = useState(false);


    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);


    const [showUnifiedCommentSidebar, setShowUnifiedCommentSidebar] =
    useState(false);
    const [blockPositions, setBlockPositions] = useState<Map<string, number>>(
      new Map()
    );
    const [autoActivateBlockId, setAutoActivateBlockId] = useState<
      string | null>(
      null);


    const {
      documentContainerStyle,
      documentContainerClassName,
      sidebarWidth,
      isSmallScreen
    } = useResponsiveLayout({
      showSidebar: showUnifiedCommentSidebar
    });
    const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(
      null
    );
    const [blockCommentCounts, setBlockCommentCounts] = useState<
      Map<string, number>>(
      new Map());


    const fetchBlockCommentCounts = useCallback(async () => {
      try {
        const response = await apiClient.get(
          `/api/comments/document/${documentId}/counts?includeResolved=false`
        );
        const counts = new Map<string, number>();
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach((item: {blockId: string;count: number;}) => {
            counts.set(item.blockId, item.count);
          });
        }
        setBlockCommentCounts(counts);
      } catch (error) {
        
      }
    }, [documentId]);


    const getBlockCommentCount = useCallback(
      (blockId: string): number => {
        return blockCommentCounts.get(blockId) || 0;
      },
      [blockCommentCounts]
    );


    useEffect(() => {
      if (documentId) {
        fetchBlockCommentCounts();
      }
    }, [documentId, fetchBlockCommentCounts]);


    const commentIndicatorData = React.useMemo(() => {
      const data: Array<{blockId: string;commentCount: number;}> = [];
      blockCommentCounts.forEach((count, blockId) => {
        if (count > 0) {
          data.push({ blockId, commentCount: count });
        }
      });
      return data;
    }, [blockCommentCounts]);


    const updateBlockPositions = useCallback(() => {
      const newPositions = new Map<string, number>();


      const blockElements = document.querySelectorAll('[data-block-id]');
      blockElements.forEach((element) => {
        const blockId = element.getAttribute('data-block-id');
        if (blockId) {
          const rect = element.getBoundingClientRect();
          const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
          newPositions.set(blockId, rect.top + scrollTop);
        }
      });

      setBlockPositions(newPositions);
    }, []);


    useEffect(() => {
      const handleScroll = debounce(updateBlockPositions, 100);
      const handleResize = debounce(updateBlockPositions, 200);


      const scrollContainer = document.getElementById(
        'document-scroll-container'
      );
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll, {
          passive: true
        });
      }
      window.addEventListener('resize', handleResize);


      const timer = setTimeout(updateBlockPositions, 500);

      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScroll);
        }
        window.removeEventListener('resize', handleResize);
        clearTimeout(timer);
      };
    }, [updateBlockPositions]);


    useEffect(() => {
      if (highlightedBlockId) {
        const blockElement = document.querySelector(
          `[data-block-id="${highlightedBlockId}"]`
        );
        if (blockElement) {
          blockElement.classList.add('block-highlighted');
        }
      }

      return () => {

        const highlightedElements =
        document.querySelectorAll('.block-highlighted');
        highlightedElements.forEach((el) =>
        el.classList.remove('block-highlighted')
        );
      };
    }, [highlightedBlockId]);


    const versionConfig = useMemo(
      () => ({
        sessionTimeoutMs: 45 * 1000,
        minSessionDurationMs: 10 * 1000,
        minTextChangeRatio: 0.05,
        minStructureChanges: 1,
        versionWindowMs: 5 * 60 * 1000,
        maxVersionsPerWindow: 1,
        debounceMs: 2 * 1000
      }),
      []
    );


    const handleVersionCreated = useCallback(
      (versionId: string) => {
        if (debug) {
          
        }
      },
      [debug]
    );

    const handleSessionStart = useCallback(
      (sessionId: string) => {
        if (debug) {
          
        }
      },
      [debug]
    );

    const handleSessionEnd = useCallback(
      (sessionId: string, versionCreated: boolean) => {
        if (debug) {
          
        }
      },
      [debug]
    );


    const {
      status: versioningStatus,
      isCreatingVersion,
      handleContentChange: handleIntelligentContentChange,
      createVersion: createIntelligentVersion,
      manualCreateVersion,
      createTitleChangeVersion,
      endCurrentSession,
      getSessionStats,
      canCreateVersion,
      log: versionLog
    } = useIntelligentVersioning({
      documentId,
      config: versionConfig,
      onVersionCreated: handleVersionCreated,
      onSessionStart: handleSessionStart,
      onSessionEnd: handleSessionEnd,
      debug
    });


    const handleBlockCommentClick = useCallback(
      (blockId: string, source: 'indicator' | 'button' = 'button') => {

        updateBlockPositions();


        setSelectedBlockId(blockId);


        if (source === 'button') {

          setAutoActivateBlockId(blockId);
        } else if (source === 'indicator') {

          setAutoActivateBlockId(null);
        }


        setShowUnifiedCommentSidebar(true);


        fetchBlockCommentCounts();

        if (debug) {
          
        }
      },
      [debug, updateBlockPositions, getBlockCommentCount]
    );


    const handleCloseUnifiedComment = useCallback(() => {
      setShowUnifiedCommentSidebar(false);
      setSelectedBlockId(null);
      setAutoActivateBlockId(null);

      if (debug) {
        
      }
    }, [debug]);


    useEffect(() => {
      const openHistory = () => setShowUnifiedHistoryPanel(true);
      const manualSave = async () => {
        try {

          const latestContent = blockEditorRef.current?.getContentAsString ?
          blockEditorRef.current.getContentAsString() :
          '';
          await manualCreateVersion(latestContent, title, '用户手动保存版本');
        } catch (e) {
          
        }
      };
      window.addEventListener('nexus-open-history-panel', openHistory as any);
      window.addEventListener(
        'nexus-open-history-panel-side',
        openHistory as any
      );
      const openHistoryFull = () => setShowFullscreenHistory(true);
      window.addEventListener(
        'nexus-open-history-panel-full',
        openHistoryFull as any
      );
      window.addEventListener('nexus-manual-save-version', manualSave as any);
      return () => {
        window.removeEventListener(
          'nexus-open-history-panel',
          openHistory as any
        );
        window.removeEventListener(
          'nexus-open-history-panel-side',
          openHistory as any
        );
        window.removeEventListener(
          'nexus-open-history-panel-full',
          openHistoryFull as any
        );
        window.removeEventListener(
          'nexus-manual-save-version',
          manualSave as any
        );
      };
    }, [title, manualCreateVersion]);


    useImperativeHandle(
      ref,
      () => ({
        cleanup: () => {
          if (blockEditorRef.current?.cleanup) {
            
            blockEditorRef.current.cleanup();
          }
        },
        getConnectionStatus: () => connectionStatus,
        getConnectedUsers: () => onlineUsers,
        setTitle: (newTitle: string) => {
          if (blockEditorRef.current?.setTitle) {
            blockEditorRef.current.setTitle(newTitle);
          }
        },
        getTitle: () => {
          return blockEditorRef.current?.getTitle() || title;
        },
        handleBlockCommentClick: handleBlockCommentClick
      }),
      [connectionStatus, onlineUsers, title, handleBlockCommentClick]
    );


    const docId = `doc-${documentId}`;


    useEffect(() => {
      try {

        if (initialContent) {
          try {
            const parsedBlocks = JSON.parse(initialContent);
            if (Array.isArray(parsedBlocks)) {
              setInitialBlocks(parsedBlocks);
              return;
            }
          } catch (e) {
            
          }
        }


        setInitialBlocks([
        {
          id: Math.random().toString(36).substring(2, 15),
          type: 'paragraph',
          content: initialContent || ''
        }]
        );
      } catch (e) {
        
      }
    }, [initialContent]);


    const handleConnectionStatusChange = useCallback(
      (status: 'connected' | 'disconnected' | 'connecting') => {
        setConnectionStatus(status);

        if (status === 'connected') {

          isInitialConnectionAttemptRef.current = false;
        }

        if (debug) {
          
        }
      },
      [debug]
    );


    const handleOnlineUsersChange = useCallback(
      (users: {name: string;color: string;id: number;}[]) => {
        setOnlineUsers(users);
        setConnectedUsers(users.length);


        if (onCollaboratorsChange) {
          onCollaboratorsChange(users);
        }

        if (debug) {
          
        }
      },
      [debug, onCollaboratorsChange]
    );


    const handleBlocksChange = useCallback(
      (blocks: any[], source?: 'local' | 'remote') => {
        if (!onContentChange) return;

        try {

          const blocksJson = JSON.stringify(blocks);


          if (blocksJson !== lastSavedContent) {
            setHasUnsavedChanges(true);
          }


          if (source === 'local') {
            lastLocalEditTimeRef.current = Date.now();
            changeSourceRef.current = 'local';
          } else if (source === 'remote') {
            changeSourceRef.current = 'remote';
          }


          setTimeout(() => {

            if (onContentChange) {
              onContentChange(blocksJson, changeSourceRef.current || undefined);
            }
          }, 0);


          if (documentTitle) {
            setTimeout(async () => {
              try {
                await handleIntelligentContentChange(
                  blocksJson,
                  documentTitle,
                  source
                );
              } catch (error) {
                
              }
            }, 100);
          }


          setLastSavedContent(blocksJson);
          setHasUnsavedChanges(false);

          if (debug) {
            
          }
        } catch (e) {
          
        }
      },
      [onContentChange, lastSavedContent, debug]
    );


    const handleLocalEdit = useCallback(
      (blocks: any[]) => {
        handleBlocksChange(blocks, 'local');
      },
      [handleBlocksChange]
    );


    const handleRemoteEdit = useCallback(
      (blocks: any[]) => {
        handleBlocksChange(blocks, 'remote');
      },
      [handleBlocksChange]
    );


    const handleTitleChange = useCallback(
      (newTitle: string) => {
        setTitle(newTitle);


        if (documentId) {
          updateDocumentTitle(documentId, newTitle);
        }


        if (onTitleChange) {
          onTitleChange(newTitle);
        }

        if (debug) {
          
        }
      },
      [documentId, onTitleChange, debug, updateDocumentTitle]
    );


    useEffect(() => {
      if (documentTitle !== title) {
        setTitle(documentTitle);
      }
    }, [documentTitle]);


    useEffect(() => {
      if (!blockEditorRef.current) return;


      const intervalId = setInterval(() => {

        if (isPageVisibleRef.current && blockEditorRef.current?.getBlocks) {
          const currentBlocks = blockEditorRef.current.getBlocks();
          if (currentBlocks && Array.isArray(currentBlocks)) {

            handleBlocksChange(currentBlocks);
          }
        }
      }, 2000);

      return () => {
        clearInterval(intervalId);
      };
    }, [handleBlocksChange]);


    useEffect(() => {

      if (blockEditorRef.current?.getTitle) {
        const checkTitleInterval = setInterval(() => {

          if (isPageVisibleRef.current) {
            const currentTitle = blockEditorRef.current.getTitle();
            if (currentTitle && currentTitle !== title) {
              setTitle(currentTitle);


              if (onTitleChange) {
                onTitleChange(currentTitle);
              }


              if (documentId) {
                updateDocumentTitle(documentId, currentTitle);
                if (debug) {
                  
                }
              }
            }
          }
        }, 1000);

        return () => {
          clearInterval(checkTitleInterval);
        };
      }
    }, [title, onTitleChange, documentId, debug, updateDocumentTitle]);


    useEffect(() => {

      if (
      connectionStatus === 'disconnected' &&
      !isInitialConnectionAttemptRef.current)
      {
        

      }
    }, [connectionStatus]);


    useEffect(() => {
      const handleVisibilityChange = () => {
        const isVisible = document.visibilityState === 'visible';
        isPageVisibleRef.current = isVisible;

        if (debug) {
          
        }


        if (!isVisible && blockEditorRef.current) {
          const provider = blockEditorRef.current.getProvider();
          if (provider && provider.shouldConnect) {

            if (
            provider.ws && (
            provider.ws.readyState === 0 ||
            provider.ws.readyState === 1))
            {

              if (debug) {
                
              }
              provider.disconnect();
            }
          }
        }


        if (isVisible && blockEditorRef.current) {
          const provider = blockEditorRef.current.getProvider();
          const status = blockEditorRef.current.getConnectionStatus();
          if (provider && status === 'disconnected') {

            if (!provider.ws || provider.ws.readyState !== 2) {

              if (debug) {
                
              }
              provider.connect();
            }
          }
        }
      };


      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      };
    }, [debug]);


    useEffect(() => {

      const handleBeforeUnload = () => {
        if (debug) {
          
        }


        if (blockEditorRef.current?.cleanup) {
          blockEditorRef.current.cleanup();
        }
      };


      window.addEventListener('beforeunload', handleBeforeUnload);


      const handlePopState = () => {
        if (debug) {
          
        }


        if (blockEditorRef.current?.cleanup) {
          blockEditorRef.current.cleanup();
        }
      };


      window.addEventListener('popstate', handlePopState);

      return () => {

        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }, [debug]);


    useEffect(() => {

      return () => {
        if (blockEditorRef.current?.cleanup) {
          
          blockEditorRef.current.cleanup();
        }


        setConnectionStatus('disconnected');
        setConnectedUsers(0);
        setOnlineUsers([]);

        if (debug) {
          
        }
      };
    }, [debug]);


    return (
      <div className={`collaborative-rich-text-document-editor ${className}`}>
        {}
        {debug &&
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs">
            <h4 className="font-medium text-gray-700 mb-1">调试信息</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">文档ID: </span>
                <span className="font-mono">{docId}</span>
              </div>
              <div>
                <span className="text-gray-500">用户: </span>
                <span className="font-mono">{user?.name || '匿名'}</span>
              </div>
              <div>
                <span className="text-gray-500">连接状态: </span>
                <span
                className={`font-mono ${
                connectionStatus === 'connected' ?
                'text-green-600' :
                connectionStatus === 'connecting' ?
                'text-yellow-600' :
                'text-red-600'}`
                }>
                
                  {connectionStatus}
                </span>
              </div>
              <div>
                <span className="text-gray-500">连接用户数: </span>
                <span className="font-mono">{connectedUsers}</span>
              </div>
            </div>
          </div>
        }

        {}
        {connectionStatus === 'disconnected' &&
        !isInitialConnectionAttemptRef.current &&
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
              <span className="material-icons text-yellow-500 mr-2">
                signal_wifi_off
              </span>
              <span className="text-sm text-yellow-700">
                连接已断开，编辑器处于离线模式。请检查网络连接，稍后将自动尝试重新连接。
              </span>
            </div>
        }

        {}
        <div className="mb-4 flex items-center justify-between">
          {onlineUsers.length > 1 &&
          <div className="flex items-center">
              <UserAvatarGroup
              users={onlineUsers.map((user) => ({
                id: user.id?.toString(),
                name: user.name,
                color: user.color
              }))}
              size="sm"
              max={3}
              className="mr-2" />
            
              <span className="text-xs text-gray-500">
                {onlineUsers.length} 人正在协作此文档
              </span>
            </div>
          }

          {}
          <div className="flex items-center space-x-2">
            {}

            {}
            {debug && versioningStatus.currentSession &&
            <div className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200">
                会话:{' '}
                {Math.floor(
                (Date.now() - versioningStatus.currentSession.startTime) /
                1000
              )}
                s{versioningStatus.sessionInfo?.hasSignificantChanges && ' ✓'}{' '}
                编辑{versioningStatus.currentSession.editCount}次
              </div>
            }

            {showComments && null}
            {showVersionHistory && null}
          </div>
        </div>

        {}
        <div className="flex-1 relative">
          {}
          <div className="h-full overflow-auto" id="document-scroll-container">
            <div className="flex min-h-screen">
              {}
              <div
                className={`flex-1 ${documentContainerClassName}`}
                style={documentContainerStyle}>
                
                <div
                  className="rich-text-block-editor w-full min-h-screen"
                  id="rich-text-editor-container">
                  
                  <CollaborativeRichTextBlockEditor
                    ref={blockEditorRef}
                    documentId={docId}
                    roomName={`room-${documentId}`}
                    userName={user?.name || '匿名用户'}
                    initialValue={initialBlocks}
                    readOnly={readOnly}
                    onConnectionStatusChange={handleConnectionStatusChange}
                    onConnectedUsersChange={handleOnlineUsersChange}
                    onLocalEdit={handleLocalEdit}
                    onRemoteEdit={handleRemoteEdit}
                    debug={debug}
                    className="prose prose-slate max-w-none w-full"
                    placeholder="输入 / 快速创建各种内容..."
                    showOutline={false}
                    documentTitle={title}
                    onTitleChange={handleTitleChange}
                    lastEditTime={lastEditTime}
                    onBlockCommentClick={handleBlockCommentClick}
                    getBlockCommentCount={getBlockCommentCount}
                    showCommentIndicators={
                    showComments && !showUnifiedCommentSidebar
                    }
                    blockComments={commentIndicatorData} />
                  
                </div>

                {}
                <GlobalCommentSection
                  documentId={documentId}
                  className="mt-8" />
                
              </div>

              {}
            </div>
          </div>

          {}
          {showComments &&
          <button
            onClick={() => setShowUnifiedCommentSidebar(true)}
            className="fixed right-6 top-14 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 shadow-md hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            title="评论"
            aria-label="评论">
            
              <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true">
              
                <path d="M20 15a4 4 0 0 1-4 4H9l-5 3V6a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z" />
                <circle cx="9.25" cy="10.75" r="1" />
                <circle cx="12" cy="10.75" r="1" />
                <circle cx="14.75" cy="10.75" r="1" />
              </svg>
            </button>
          }
        </div>

        {}
        {showVersionHistoryPanel &&
        <VersionHistoryPanel
          documentId={documentId}
          isOpen={showVersionHistoryPanel}
          onClose={() => setShowVersionHistoryPanel(false)}
          onVersionSelect={(version) => {
            
          }}
          onVersionRestore={async (versionId) => {
            
            try {

              const restoredVersion = await VersionService.getVersion(
                versionId
              );


              if (restoredVersion.content) {
                try {
                  const parsedContent = JSON.parse(restoredVersion.content);


                  forceUpdateEditorContent(parsedContent);


                  if (
                  restoredVersion.title !== documentTitle &&
                  onTitleChange)
                  {
                    onTitleChange(restoredVersion.title);
                  }


                  if (onContentChange) {
                    onContentChange(restoredVersion.content, 'remote');
                  }

                  if (debug) {
                    
                  }
                } catch (parseError) {
                  
                }
              }
            } catch (error) {
              
            }
          }} />

        }

        {}
        {showCommentPanel &&
        <CommentPanel
          documentId={documentId}
          isOpen={showCommentPanel}
          onClose={() => setShowCommentPanel(false)} />

        }

        {}
        <FixedCommentSidebar
          documentId={documentId}
          isOpen={showUnifiedCommentSidebar}
          onClose={handleCloseUnifiedComment}
          blockPositions={blockPositions}
          selectedBlockId={selectedBlockId}
          onHighlightBlock={setHighlightedBlockId}
          autoActivateBlockId={autoActivateBlockId}
          sidebarWidth={sidebarWidth}
          isSmallScreen={isSmallScreen}
          onCommentChange={() => {
            fetchBlockCommentCounts();
            onCommentChange?.();
          }} />
        

        {}
        <UnifiedHistoryPanel
          documentId={documentId}
          isOpen={showUnifiedHistoryPanel}
          onClose={() => setShowUnifiedHistoryPanel(false)}
          onVersionSelect={(version) => {
            
          }}
          onVersionRestore={async (versionId) => {
            
            try {

              const restoredVersion = await VersionService.getVersion(
                versionId
              );


              if (restoredVersion.content) {
                try {
                  const parsedContent = JSON.parse(restoredVersion.content);


                  forceUpdateEditorContent(parsedContent);


                  if (restoredVersion.title !== title) {
                    setTitle(restoredVersion.title);
                    onTitleChange?.(restoredVersion.title);
                  }


                  setShowUnifiedHistoryPanel(false);

                  if (debug) {
                    
                  }
                } catch (parseError) {
                  
                  alert('版本内容格式错误，无法恢复');
                }
              }
            } catch (error) {
              
              alert('版本恢复失败，请重试');
            }
          }} />
        

        {}
        <FullscreenHistoryView
          documentId={documentId}
          isOpen={showFullscreenHistory}
          onClose={() => setShowFullscreenHistory(false)}
          onVersionRestore={async (versionId) => {
            try {

              const restoredVersion = await VersionService.getVersion(
                versionId
              );


              if (restoredVersion.content) {
                try {
                  const parsedContent = JSON.parse(restoredVersion.content);


                  forceUpdateEditorContent(parsedContent);


                  if (restoredVersion.title !== title) {
                    setTitle(restoredVersion.title);
                    onTitleChange?.(restoredVersion.title);
                  }

                  if (debug) {
                    
                  }
                } catch (parseError) {
                  
                  alert('版本内容格式错误，无法恢复');
                }
              }
            } catch (error) {
              
              throw error;
            }
          }} />
        
      </div>);

  }
);

CollaborativeRichTextDocumentEditor.displayName =
'CollaborativeRichTextDocumentEditor';

export { CollaborativeRichTextDocumentEditor };