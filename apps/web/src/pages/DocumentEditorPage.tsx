import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DocumentService } from '../services/document.service';
import { SidebarLayout } from '../components/layout/SidebarLayout';
import { UpdateDocumentDto } from '@nexus-main/common';
import { useAuth } from '../contexts/AuthContext';
import {
  CollaborativeRichTextDocumentEditor,
  CollaborativeRichTextDocumentEditorRef,
} from '../components/document/CollaborativeRichTextDocumentEditor';
import { PageCommentIndicators } from '../components/comments/PageCommentIndicators';
import { debounce } from 'lodash';
import { useWebSocketCleanup } from '../hooks/useWebSocketCleanup';
import { useDocumentStore } from '../stores/documentStore';
import { DocumentSideOutline } from '@nexus-main/editor';
import { DocumentOutline } from '@nexus-main/editor';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-red-300 rounded-md p-4 bg-red-50">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            编辑器加载失败
          </h3>
          <p className="text-sm text-red-700 mb-3">
            {this.state.error?.message || '发生未知错误'}
          </p>
          <details className="text-xs text-gray-700">
            <summary>查看详细错误信息</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

type PageWidth = 'default' | 'wide' | 'full';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';

interface PageWidthOption {
  value: PageWidth;
  label: string;
  icon: string;
}

export function DocumentEditorPage() {
  const { workspaceId, documentId } = useParams<{
    workspaceId: string;
    documentId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { updateDocumentTitle, fetchWorkspaceDocuments } = useDocumentStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pageWidth, setPageWidth] = useState<PageWidth>('default');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [debug] = useState<boolean>(false);
  const [showOutline, setShowOutline] = useState<boolean>(true);
  const [showPageWidthOptions, setShowPageWidthOptions] =
    useState<boolean>(false);
  const [showHistoryMenu, setShowHistoryMenu] = useState<boolean>(false);
  const historyMenuRef = useRef<HTMLDivElement>(null);
  const pageWidthMenuRef = useRef<HTMLDivElement>(null);
  const [initialBlocks, setInitialBlocks] = useState<any[]>([]);

  const [blockCommentCounts, setBlockCommentCounts] = useState<
    Map<string, number>
  >(new Map());
  const [showComments] = useState(true);

  const fetchBlockCommentCounts = useCallback(async () => {
    if (!documentId) return;

    try {
      const apiClient = (await import('../services/api.service')).default;
      const response = await apiClient.get(
        `/api/comments/document/${documentId}/counts?includeResolved=false`
      );
      const counts = new Map<string, number>();
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((item: { blockId: string; count: number }) => {
          counts.set(item.blockId, item.count);
        });
      }
      setBlockCommentCounts(counts);
    } catch (error) {}
  }, [documentId]);

  const handleCommentIndicatorClick = useCallback((blockId: string) => {
    if (editorRef.current?.handleBlockCommentClick) {
      editorRef.current.handleBlockCommentClick(blockId, 'indicator');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showHistoryMenu &&
        historyMenuRef.current &&
        !historyMenuRef.current.contains(target)
      ) {
        setShowHistoryMenu(false);
      }
      if (
        showPageWidthOptions &&
        pageWidthMenuRef.current &&
        !pageWidthMenuRef.current.contains(target)
      ) {
        setShowPageWidthOptions(false);
      }
    };
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHistoryMenu) setShowHistoryMenu(false);
        if (showPageWidthOptions) setShowPageWidthOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [showHistoryMenu, showPageWidthOptions]);

  const commentIndicatorData = React.useMemo(() => {
    const data: Array<{ blockId: string; commentCount: number }> = [];
    blockCommentCounts.forEach((count, blockId) => {
      if (count > 0) {
        data.push({ blockId, commentCount: count });
      }
    });
    return data;
  }, [blockCommentCounts]);

  useEffect(() => {
    if (documentId) {
      fetchBlockCommentCounts();
    }
  }, [documentId, fetchBlockCommentCounts]);

  const [showOutlineHover, setShowOutlineHover] = useState(false);
  const [pageWidthTooSmall, setPageWidthTooSmall] = useState(false);
  const [hasHeadings, setHasHeadings] = useState(false);
  const outlineHoverRef = useRef<HTMLDivElement>(null);

  const pageWidthOptions: PageWidthOption[] = [
    { value: 'default', label: '默认宽度', icon: 'format_align_justify' },
    { value: 'wide', label: '宽屏模式', icon: 'format_align_left' },
    { value: 'full', label: '全屏模式', icon: 'fullscreen' },
  ];

  const editorRef = useRef<CollaborativeRichTextDocumentEditorRef>(null);

  const contentRef = useRef<string>('');
  const titleRef = useRef<string>('');
  const lastAutoSaveRef = useRef<number>(0);
  const isChangedSinceLastSaveRef = useRef<boolean>(false);
  const AUTO_SAVE_DELAY = 5000;
  const SAVE_MESSAGE_TIMEOUT = 3000;
  const saveMessageTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedPageWidth = localStorage.getItem('editor-page-width');
    if (
      savedPageWidth &&
      ['default', 'wide', 'full'].includes(savedPageWidth)
    ) {
      setPageWidth(savedPageWidth as PageWidth);
    }
  }, []);

  const updatePageWidth = (width: PageWidth) => {
    setPageWidth(width);
    localStorage.setItem('editor-page-width', width);
  };

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        const document = await DocumentService.getById(documentId);
        setTitle(document.title);
        titleRef.current = document.title;
        setContent(document.content || '');
        contentRef.current = document.content || '';

        setLastSaved(new Date(document.updatedAt));
        lastAutoSaveRef.current = Date.now();
        isChangedSinceLastSaveRef.current = false;
        setSaveStatus('saved');
        updateSaveMessage('所有更改已保存');
      } catch (err) {
        setError('无法加载文档，请稍后重试');
        setSaveStatus('error');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  useEffect(() => {
    if (!content) return;

    try {
      const parsedContent = JSON.parse(content);
      if (Array.isArray(parsedContent)) {
        setInitialBlocks(parsedContent);

        const hasHeadingBlocks = parsedContent.some(
          (block) =>
            block.type === 'heading-1' ||
            block.type === 'heading-2' ||
            block.type === 'heading-3'
        );
        setHasHeadings(hasHeadingBlocks);

        if (!hasHeadingBlocks) {
          setShowOutline(false);
        }
      }
    } catch (e) {}
  }, [content]);

  useEffect(() => {
    const checkWindowWidth = () => {
      const isTooSmall = window.innerWidth < 992;
      setPageWidthTooSmall(isTooSmall);

      if (!hasHeadings) {
        setShowOutline(false);
      }
    };

    checkWindowWidth();

    window.addEventListener('resize', checkWindowWidth);

    return () => {
      window.removeEventListener('resize', checkWindowWidth);
    };
  }, [hasHeadings]);

  const handleOutlineItemClick = (blockId: string) => {
    const element = document.getElementById(blockId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showOutlineHover &&
        outlineHoverRef.current &&
        !outlineHoverRef.current.contains(event.target as Node)
      ) {
        setShowOutlineHover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOutlineHover]);

  const closeOutlineHover = () => {
    setShowOutlineHover(false);
  };

  const updateSaveMessage = (message: string) => {
    setSaveMessage(message);

    if (saveMessageTimerRef.current) {
      clearTimeout(saveMessageTimerRef.current);
    }

    if (message === '所有更改已保存') {
      saveMessageTimerRef.current = setTimeout(() => {
        setSaveMessage('');
      }, SAVE_MESSAGE_TIMEOUT);
    }
  };

  const debouncedScheduleAutoSave = useCallback(
    debounce(() => {
      if (!isChangedSinceLastSaveRef.current) {
        return;
      }

      setSaveStatus('saving');
      updateSaveMessage('正在保存...');

      const now = Date.now();
      const timeSinceLastSave = now - lastAutoSaveRef.current;

      if (timeSinceLastSave >= AUTO_SAVE_DELAY) {
        autoSave();
      } else {
        const remainingTime = AUTO_SAVE_DELAY - timeSinceLastSave;

        setTimeout(() => {
          if (isChangedSinceLastSaveRef.current) {
            autoSave();
          }
        }, remainingTime);
      }
    }, 800),
    []
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      titleRef.current = newTitle;
      isChangedSinceLastSaveRef.current = true;
      setSaveStatus('unsaved');
      updateSaveMessage('有未保存的更改');
      debouncedScheduleAutoSave();

      if (documentId) {
        updateDocumentTitle(documentId, newTitle);
      }
    },
    [
      debouncedScheduleAutoSave,
      updateSaveMessage,
      documentId,
      updateDocumentTitle,
    ]
  );

  const handleContentChange = useCallback((newContent: string) => {
    const contentChanged = contentRef.current !== newContent;

    setContent(newContent);
    contentRef.current = newContent;

    if (contentChanged) {
      isChangedSinceLastSaveRef.current = true;
      setSaveStatus('unsaved');
      updateSaveMessage('有未保存的更改');
      debouncedScheduleAutoSave();
    }
  }, []);

  useEffect(() => {
    const checkContentChanges = () => {
      if (
        isChangedSinceLastSaveRef.current &&
        saveStatus !== 'saving' &&
        saveStatus !== 'unsaved'
      ) {
        setSaveStatus('unsaved');
        updateSaveMessage('有未保存的更改');
        debouncedScheduleAutoSave();
      }
    };

    const intervalId = setInterval(checkContentChanges, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [saveStatus]);

  const autoSave = async () => {
    if (!documentId) return;

    try {
      setSaving(true);
      setSaveStatus('saving');
      updateSaveMessage('正在保存...');

      const updateDto: UpdateDocumentDto = {
        title: titleRef.current,
        content: contentRef.current,
      };

      await DocumentService.update(documentId, updateDto);

      const saveTime = new Date();
      setLastSaved(saveTime);
      setSaveStatus('saved');
      updateSaveMessage('所有更改已保存');
      lastAutoSaveRef.current = saveTime.getTime();
      isChangedSinceLastSaveRef.current = false;

      updateDocumentTitle(documentId, titleRef.current);

      if (workspaceId) {
        fetchWorkspaceDocuments(workspaceId);
      }
    } catch (err) {
      setSaveStatus('error');
      updateSaveMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!documentId) return;

    try {
      setSaving(true);
      setSaveStatus('saving');
      updateSaveMessage('正在保存...');

      const updateDto: UpdateDocumentDto = {
        title,
        content,
      };
      await DocumentService.update(documentId, updateDto);

      const saveTime = new Date();
      setLastSaved(saveTime);
      setSaveStatus('saved');
      updateSaveMessage('所有更改已保存');
      lastAutoSaveRef.current = saveTime.getTime();
      isChangedSinceLastSaveRef.current = false;

      updateDocumentTitle(documentId, title);

      if (workspaceId) {
        fetchWorkspaceDocuments(workspaceId);
      }
    } catch (err) {
      setError('保存文档失败，请稍后重试');
      setSaveStatus('error');
      updateSaveMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const getPageWidthClass = () => {
    switch (pageWidth) {
      case 'wide':
        return 'w-full max-w-6xl mx-auto';
      case 'full':
        return 'w-full';
      default:
        return 'w-full max-w-4xl mx-auto';
    }
  };

  const getSaveStatusUI = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center">
            <svg
              className="animate-spin h-3 w-3 mr-1.5 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-yellow-600">{saveMessage}</span>
          </div>
        );

      case 'saved':
        return (
          <div className="flex items-center">
            <svg
              className="h-3 w-3 mr-1.5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-green-600">{saveMessage}</span>
          </div>
        );

      case 'unsaved':
        return (
          <div className="flex items-center">
            <span className="h-2 w-2 rounded-full bg-yellow-400 mr-1.5"></span>
            <span className="text-yellow-600">{saveMessage}</span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center">
            <svg
              className="h-3 w-3 mr-1.5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-red-600">{saveMessage}</span>
          </div>
        );

      default:
        return lastSaved ? (
          <div className="flex items-center text-gray-500">
            <span>上次保存于 {lastSaved.toLocaleTimeString()}</span>
          </div>
        ) : (
          <span className="text-gray-500">尚未保存</span>
        );
    }
  };

  const navigateWithCleanup = useWebSocketCleanup(
    () => {
      if (editorRef.current?.cleanup) {
        editorRef.current.cleanup();
      }
    },
    [],
    debug
  );

  useEffect(() => {
    return () => {
      if (editorRef.current?.cleanup) {
        editorRef.current.cleanup();
      }
    };
  }, []);

  const handleBack = () => {
    if (workspaceId) {
      navigateWithCleanup(`/workspaces/${workspaceId}`);
    } else {
      navigateWithCleanup('/dashboard');
    }
  };

  return (
    <SidebarLayout>
      <div className="h-full flex flex-col">
        {}
        <nav className="flex items-center px-4 py-2 bg-white border-b border-gray-100">
          {}
          <div className="flex-1 text-sm text-gray-500 flex items-center overflow-hidden mr-4 ml-10">
            <span
              className="material-icons text-gray-400 mr-1 flex-shrink-0"
              style={{ fontSize: '16px' }}
            >
              folder
            </span>
            <Link
              to={`/workspaces/${workspaceId}`}
              className="hover:text-gray-700 whitespace-nowrap flex-shrink-0"
            >
              {user?.name || '我'}的文档空间
            </Link>
            <span className="mx-1 flex-shrink-0">/</span>
            <span className="text-gray-700 font-medium truncate">
              {title || '无标题文档'}
            </span>
          </div>

          {}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {}
            <div className="text-xs text-gray-500 hidden sm:block">
              {getSaveStatusUI()}
            </div>

            {}
            <div className="dropdown relative" ref={pageWidthMenuRef}>
              <button
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 rounded-md p-1.5 hover:bg-gray-50"
                onClick={() => setShowPageWidthOptions(!showPageWidthOptions)}
                title="页面宽度"
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>
                  {
                    pageWidthOptions.find((opt) => opt.value === pageWidth)
                      ?.icon
                  }
                </span>
              </button>
              {showPageWidthOptions && (
                <div className="dropdown-menu absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-md py-1 z-30">
                  {pageWidthOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 ${
                        pageWidth === option.value
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        updatePageWidth(option.value);
                        setShowPageWidthOptions(false);
                      }}
                    >
                      <span
                        className="material-icons"
                        style={{ fontSize: '18px' }}
                      >
                        {option.icon}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {}
            <div className="relative" ref={historyMenuRef}>
              <button
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-600 hover:bg-gray-50 focus:outline-none"
                onClick={() => setShowHistoryMenu((s) => !s)}
                title="历史记录"
              >
                <span className="material-icons text-[18px]">history</span>
              </button>
              {showHistoryMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-40 py-1">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    onClick={() => {
                      const evt = new CustomEvent(
                        'nexus-open-history-panel-side'
                      );
                      window.dispatchEvent(evt);
                      setShowHistoryMenu(false);
                    }}
                  >
                    <span className="material-icons text-[18px] mr-2">
                      splitscreen
                    </span>
                    历史记录（侧边）
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    onClick={() => {
                      const evt = new CustomEvent(
                        'nexus-open-history-panel-full'
                      );
                      window.dispatchEvent(evt);
                      setShowHistoryMenu(false);
                    }}
                  >
                    <span className="material-icons text-[18px] mr-2">
                      fullscreen
                    </span>
                    历史记录（全屏）
                  </button>
                  <div className="my-1 h-px bg-gray-100" />
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    onClick={() => {
                      const evt = new CustomEvent('nexus-manual-save-version');
                      window.dispatchEvent(evt);
                      setShowHistoryMenu(false);
                    }}
                  >
                    <span className="material-icons text-[18px] mr-2">
                      save
                    </span>
                    保存版本
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {}
        {error && (
          <div className="bg-red-50 p-4 m-4 rounded-md flex justify-between items-center">
            <div className="text-red-700">{error}</div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
              aria-label="关闭错误提示"
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {}
        <div className="flex-1 overflow-hidden bg-white flex relative">
          {}
          {!loading && initialBlocks.length > 0 && hasHeadings && (
            <DocumentSideOutline
              blocks={initialBlocks}
              onItemClick={handleOutlineItemClick}
              className="h-full"
              docTitle={title}
            />
          )}

          {}
          <div className={`flex-1 h-full overflow-auto relative`}>
            <div className={`py-4 ${getPageWidthClass()}`}>
              {loading ? (
                <div className="py-8 text-center">
                  <svg
                    className="animate-spin h-8 w-8 text-gray-400 mx-auto"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">加载文档中...</p>
                </div>
              ) : (
                <ErrorBoundary>
                  <div className="h-full">
                    <CollaborativeRichTextDocumentEditor
                      ref={editorRef}
                      documentId={documentId || ''}
                      initialContent={content}
                      documentTitle={title}
                      onTitleChange={handleTitleChange}
                      onContentChange={handleContentChange}
                      showOutline={false}
                      lastEditTime={lastSaved || undefined}
                      className="w-full Nexus-editor"
                      showComments={showComments}
                      onCommentChange={fetchBlockCommentCounts}
                    />
                  </div>
                </ErrorBoundary>
              )}
            </div>

            {}
            {showComments && !loading && (
              <PageCommentIndicators
                blockComments={commentIndicatorData}
                onIndicatorClick={handleCommentIndicatorClick}
                showIndicators={true}
              />
            )}
          </div>
        </div>

        {}
        <div className="border-t border-gray-100 px-6 py-1.5 bg-white text-xs flex justify-between items-center">
          <div className="text-xs text-gray-400 flex items-center">
            <span>自动保存已启用</span>
            <div className="w-1 h-1 bg-gray-300 rounded-full mx-1.5"></div>
            <span>
              {lastSaved
                ? `上次编辑于 ${lastSaved.toLocaleTimeString()}`
                : '新文档'}
            </span>
          </div>
        </div>

        {}
        <style>
          {`

            .editor-container {
              display: flex;
              height: 100%;
            }


            .Nexus-document-outline + .flex-1 {
              transition: margin-left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .Nexus-document-outline.collapsed + .flex-1 {
              margin-left: 24px;
            }

            .Nexus-document-outline.expanded + .flex-1 {
              margin-left: 0;
            }


            .Nexus-document-outline {
              isolation: isolate; 
              pointer-events: auto; 
            }

            
            .fixed.left-0.top-0.bottom-0.w-1.z-[1001] {
              z-index: 1000 !important; 
              pointer-events: auto !important; 
            }

            
            @media (max-width: 640px) {
              .flex-1.text-sm.text-gray-500.flex.items-center.overflow-hidden.mr-4 {
                max-width: 60%;
              }
            }

            
            .outline-hover-popup {
              position: absolute;
              right: 0;
              top: 100%;
              background: white;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
              border-radius: 6px;
              width: 280px;
              z-index: 1000;
              border: 1px solid #f0f0f0;
              margin-top: 5px;
              margin-right: -8px;
              max-height: calc(100vh - 160px);
              display: flex;
              flex-direction: column;
            }

            .outline-hover-popup .max-h-\\[60vh\\] {
              flex: 1;
              min-height: 0;
            }

            
            .Nexus-editor {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }

            .rich-text-block-editor-block {
              transition: background-color 0.2s;
            }

            .rich-text-block-editor-block:hover {
              background-color: rgba(0, 0, 0, 0.01);
            }

            .rich-text-block-editor-block.active {
              background-color: rgba(0, 0, 0, 0.02);
            }

            
            .rich-text-block-editor-block[data-block-type^="heading-"] {
              margin-top: 1em;
            }

            .rich-text-block-editor-block[data-block-type="heading-1"] {
              font-size: 1.75rem;
              font-weight: 600;
              margin-top: 1.5em;
            }

            .rich-text-block-editor-block[data-block-type="heading-2"] {
              font-size: 1.5rem;
              font-weight: 500;
              margin-top: 1.2em;
            }

            .rich-text-block-editor-block[data-block-type="heading-3"] {
              font-size: 1.25rem;
              font-weight: 500;
            }

            @media (max-width: 768px) {
              .Nexus-document-outline {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                z-index: 50;
              }

              .Nexus-document-outline.collapsed + .flex-1 {
                margin-left: 24px;
              }

              .Nexus-document-outline.expanded + .flex-1 {
                margin-left: 0;
              }
            }

            
            @media (max-width: 992px) {
              .outline-hover-popup {
                width: 240px;
              }
            }

           
            input[type="checkbox"] {
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
              appearance: auto !important;
              display: inline-block !important;
              position: static !important;
            }
          `}
        </style>
      </div>
    </SidebarLayout>
  );
}

export function DocumentViewPage() {
  const { workspaceId, documentId } = useParams<{
    workspaceId: string;
    documentId: string;
  }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        const doc = await DocumentService.getById(documentId);
        setDocument(doc);
      } catch (err) {
        setError('无法加载文档，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  // Parse block-based content if available
  interface Block {
    id?: string;
    type: string;
    content: string;
    level?: number;
    items?: string[];
    url?: string;
    alt?: string;
    language?: string;
    checked?: boolean;
  }

  const parsedBlocks = useMemo(() => {
    try {
      if (!document?.content) return null;
      const blocks = JSON.parse(document.content);
      return Array.isArray(blocks) ? (blocks as Block[]) : null;
    } catch {
      return null;
    }
  }, [document?.content]);

  const renderBlock = (block: Block, index: number) => {
    const blockId = block.id || `block-${index}`;
    switch (block.type) {
      case 'heading':
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
      case 'heading-4':
      case 'heading-5':
      case 'heading-6': {
        let level = block.level || 1;
        if (block.type.startsWith('heading-')) {
          const typeLevel = parseInt(block.type.split('-')[1]);
          if (!isNaN(typeLevel)) level = typeLevel;
        }
        const tag = `h${Math.min(level, 6)}` as any;
        return React.createElement(
          tag,
          {
            key: blockId,
            className: `font-bold mb-4 text-gray-900 ${
              level === 1
                ? 'text-3xl'
                : level === 2
                ? 'text-2xl'
                : level === 3
                ? 'text-xl'
                : level === 4
                ? 'text-lg'
                : 'text-base'
            }`,
          },
          block.content || '无标题'
        );
      }
      case 'paragraph':
        return (
          <p key={blockId} className="mb-4 text-gray-700 leading-relaxed">
            {block.content || ''}
          </p>
        );
      case 'list':
        return (
          <ul
            key={blockId}
            className="mb-4 list-disc list-inside text-gray-700 space-y-1"
          >
            {block.items?.map((item, itemIndex) => (
              <li
                key={`${blockId}-item-${itemIndex}`}
                className="leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        );
      case 'ordered-list':
        return (
          <ol
            key={blockId}
            className="mb-4 list-decimal list-inside text-gray-700 space-y-1"
          >
            {block.items?.map((item, itemIndex) => (
              <li
                key={`${blockId}-item-${itemIndex}`}
                className="leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ol>
        );
      case 'bulleted-list':
        return (
          <div key={blockId} className="mb-2 flex items-start">
            <div className="px-1 text-gray-500 select-none">•</div>
            <div
              className="flex-1 text-gray-700"
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          </div>
        );
      case 'numbered-list': {
        const numberIndex = (parsedBlocks || [])
          .slice(0, index + 1)
          .filter((b) => b.type === 'numbered-list').length;
        return (
          <div key={blockId} className="mb-2 flex items-start">
            <div className="px-1 text-gray-500 min-w-[1.5rem] pt-0.5 select-none">
              {numberIndex}.
            </div>
            <div
              className="flex-1 text-gray-700"
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          </div>
        );
      }
      case 'checklist':
        return (
          <div key={blockId} className="mb-4 space-y-2">
            {block.items?.map((item, itemIndex) => (
              <div
                key={`${blockId}-item-${itemIndex}`}
                className="flex items-center space-x-2"
              >
                <input
                  type="checkbox"
                  checked={block.checked || false}
                  readOnly
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span
                  className={`text-gray-700 ${
                    block.checked ? 'line-through text-gray-500' : ''
                  }`}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        );
      case 'to-do':
        return (
          <div key={blockId} className="mb-3 flex items-start">
            <input
              type="checkbox"
              checked={block.checked || false}
              readOnly
              className="mt-1.5 w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <div
              className={`ml-3 text-gray-700 ${
                block.checked ? 'line-through text-gray-500' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          </div>
        );
      case 'blockquote':
        return (
          <blockquote
            key={blockId}
            className="mb-4 pl-4 border-l-4 border-gray-300 text-gray-600 italic"
          >
            {block.content}
          </blockquote>
        );
      case 'code':
        return (
          <pre
            key={blockId}
            className="mb-4 p-4 bg-gray-100 rounded-lg overflow-x-auto"
          >
            <code
              className={`text-sm ${
                block.language ? `language-${block.language}` : ''
              }`}
            >
              {block.content}
            </code>
          </pre>
        );
      case 'divider':
        return <hr key={blockId} className="mb-4 border-gray-300" />;
      case 'image': {
        if (block.content && /<img\b/i.test(block.content)) {
          return (
            <div key={blockId} className="mb-4">
              <div
                className="max-w-full h-auto rounded-lg shadow-sm"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            </div>
          );
        }
        return (
          <div key={blockId} className="mb-4">
            <img
              src={block.url}
              alt={block.alt || '图片'}
              className="max-w-full h-auto rounded-lg shadow-sm"
            />
            {block.alt && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                {block.alt}
              </p>
            )}
          </div>
        );
      }
      case 'video':
        return (
          <div key={blockId} className="mb-4">
            <div
              className="rounded-lg overflow-hidden shadow-sm [&_video]:max-w-full [&_video]:h-auto"
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          </div>
        );
      case 'embed':
        return (
          <div key={blockId} className="mb-4">
            <div
              className="rounded-lg overflow-hidden shadow-sm [&_iframe]:w-full [&_iframe]:min-h-[200px]"
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          </div>
        );
      case 'table':
        return (
          <div key={blockId} className="mb-4 overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <tbody>
                {block.items?.map((row, rowIndex) => (
                  <tr key={`${blockId}-row-${rowIndex}`}>
                    {(row as any)
                      .split('|')
                      .map((cell: string, cellIndex: number) => (
                        <td
                          key={`${blockId}-cell-${rowIndex}-${cellIndex}`}
                          className="border border-gray-300 px-3 py-2"
                        >
                          {cell.trim()}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return (
          <div
            key={blockId}
            className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-center space-x-2 text-yellow-800">
              <span className="text-sm">未知块类型: {block.type}</span>
            </div>
            <pre className="mt-2 text-xs text-yellow-700 overflow-x-auto">
              {JSON.stringify(block, null, 2)}
            </pre>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (error) {
    return (
      <SidebarLayout>
        <div className="bg-red-50 p-4 rounded-md">
          <div className="text-red-700">{error}</div>
        </div>
      </SidebarLayout>
    );
  }

  if (!document) {
    return (
      <SidebarLayout>
        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="text-yellow-700">文档不存在或您没有访问权限</div>
        </div>
      </SidebarLayout>
    );
  }

  const isHtmlContent =
    document.content &&
    (document.content.includes('<p>') ||
      document.content.includes('<div>') ||
      document.content.includes('<h') ||
      document.content.includes('<br'));

  return (
    <SidebarLayout>
      <div className="h-full flex flex-col">
        {}
        <div className="border-b border-gray-200 px-10 py-3 flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-xl font-medium text-gray-900">
              {document?.title || '无标题'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              上次更新:{' '}
              {document ? new Date(document.updatedAt).toLocaleString() : ''}
            </p>
          </div>
          <div>
            <Link
              to={`/workspaces/${workspaceId}`}
              className="inline-flex items-center px-3 py-1 border border-gray-200 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              返回工作区
            </Link>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-10 py-6">
            {loading ? (
              <div className="py-8 text-center">
                <svg
                  className="animate-spin h-8 w-8 text-gray-400 mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="mt-2 text-sm text-gray-500">加载文档中...</p>
              </div>
            ) : (
              <div className="prose max-w-none">
                {parsedBlocks ? (
                  parsedBlocks.map((block, index) => renderBlock(block, index))
                ) : isHtmlContent ? (
                  <div dangerouslySetInnerHTML={{ __html: document.content }} />
                ) : (
                  <div className="whitespace-pre-wrap">{document.content}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
