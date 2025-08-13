import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';

export interface RichTextEditorProps {
  initialValue?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  debug?: boolean;
  lineHeight?: number;
  readOnly?: boolean;
}

export interface RichTextEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  focus: () => void;
  blur: () => void;
  getCursorPosition: () => number | null;
  setCursorPosition: (position: number) => void;
  getElement: () => HTMLDivElement | null;
}

export const RichTextEditor = forwardRef<
  RichTextEditorRef,
  RichTextEditorProps
>(
  (
    {
      initialValue = '',
      onChange,
      placeholder = '开始编辑...',
      className = '',
      debug = false,
      lineHeight = 1.6,
      readOnly = false,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(
      null
    );
    const [showLinkTooltip, setShowLinkTooltip] = useState(false);
    const [linkTooltipPos, setLinkTooltipPos] = useState<{
      top: number;
      left: number;
    }>({ top: 0, left: 0 });
    const [isOnTooltip, setIsOnTooltip] = useState(false);
    const [isEditingLink, setIsEditingLink] = useState(false);
    const [editingHref, setEditingHref] = useState('');
    const hoverTimerRef = useRef<number | null>(null);
    const copyTimerRef = useRef<number | null>(null);
    const [copied, setCopied] = useState(false);
    const [linkArrowOffset, setLinkArrowOffset] = useState<number>(16);
    const [content, setContent] = useState(initialValue);
    const isComposingRef = useRef(false);
    const lastRangeRef = useRef<Range | null>(null);
    const lastSelectionRef = useRef<{ start: number; end: number } | null>(
      null
    );
    const isInternalChangeRef = useRef(false);

    const debugLog = useCallback(
      (...args: any[]) => {
        if (debug) {
        }
      },
      [debug]
    );

    useImperativeHandle(
      ref,
      () => ({
        getContent: () => editorRef.current?.innerHTML || '',
        setContent: (newContent: string) => {
          if (editorRef.current) {
            isInternalChangeRef.current = true;
            editorRef.current.innerHTML = newContent;
            setContent(newContent);
            isInternalChangeRef.current = false;
          }
        },
        focus: () => {
          if (editorRef.current) {
            editorRef.current.focus();

            if (lastRangeRef.current) {
              try {
                const selection = window.getSelection();
                if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(lastRangeRef.current);
                }
              } catch (e) {
  
              }
            }
          }
        },
        blur: () => {
          if (editorRef.current) {
            editorRef.current.blur();
          }
        },
        getCursorPosition: () => {
          if (!editorRef.current) return null;

          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return null;

          const range = selection.getRangeAt(0);
          if (!editorRef.current.contains(range.startContainer)) return null;

          const preRange = document.createRange();
          preRange.selectNodeContents(editorRef.current);
          preRange.setEnd(range.startContainer, range.startOffset);
          return preRange.toString().length;
        },
        setCursorPosition: (position: number) => {
          if (!editorRef.current) return;

          function findNodeAndOffset(
            node: Node,
            targetOffset: number
          ): { node: Node; offset: number } | null {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent || '';
              if (targetOffset <= text.length) {
                return { node, offset: targetOffset };
              }
              return { node, offset: text.length };
            }

            if (!node.hasChildNodes()) {
              return { node, offset: 0 };
            }

            let currentOffset = 0;
            for (let i = 0; i < node.childNodes.length; i++) {
              const childNode = node.childNodes[i];
              const childText = childNode.textContent || '';

              if (currentOffset + childText.length >= targetOffset) {
                return findNodeAndOffset(
                  childNode,
                  targetOffset - currentOffset
                );
              }

              currentOffset += childText.length;
            }

            const lastChild = node.lastChild;
            return lastChild
              ? {
                  node: lastChild,
                  offset: (lastChild.textContent || '').length,
                }
              : null;
          }

          const nodeInfo = findNodeAndOffset(editorRef.current, position);
          if (nodeInfo) {
            try {
              const range = document.createRange();
              range.setStart(nodeInfo.node, nodeInfo.offset);
              range.collapse(true);

              const selection = window.getSelection();
              if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
                lastRangeRef.current = range.cloneRange();
              }
            } catch (e) {

            }
          }
        },
        getElement: () => editorRef.current,
      }),
      [debugLog]
    );

    useEffect(() => {
      if (editorRef.current && !isInternalChangeRef.current) {
        editorRef.current.innerHTML = initialValue;
      }
    }, [initialValue]);

    const saveSelection = useCallback(() => {
      if (!editorRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (!editorRef.current.contains(range.commonAncestorContainer)) return;

      const preRange = document.createRange();
      preRange.selectNodeContents(editorRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;

      preRange.setEnd(range.endContainer, range.endOffset);
      const end = preRange.toString().length;

      lastSelectionRef.current = { start, end };

    }, [debugLog]);

    const handleContentChange = useCallback(() => {
      if (!editorRef.current) return;

      if (isComposingRef.current) {

        return;
      }

      const selection = window.getSelection();
      const rawContent = editorRef.current.innerHTML;

      let savedCursorInfo = null;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        if (editorRef.current.contains(range.commonAncestorContainer)) {
          const domPath: number[] = [];
          let node: Node | null = range.startContainer;
          while (node && node !== editorRef.current) {
            const parent: Node | null = node.parentNode;
            if (parent) {
              let index = 0;
              let child = parent.firstChild;
              while (child && child !== node) {
                index++;
                child = child.nextSibling;
              }
              domPath.unshift(index);
            }
            node = parent;
          }

          savedCursorInfo = {
            range: range.cloneRange(),
            domPath,
            nodeType: range.startContainer.nodeType,
            nodeValue: range.startContainer.nodeValue,
            offset: range.startOffset,
          };

          const container = range.startContainer;
          const offset = range.startOffset;

          const nodeInfo = {
            type: container.nodeType,
            value: container.nodeValue,
            parentTag: container.parentNode
              ? (container.parentNode as Element).tagName
              : 'none',
            offset,
          };


          lastRangeRef.current = range.cloneRange();

          saveSelection();
        }
      }

      if (content !== rawContent) {
        setContent(rawContent);

        if (onChange) {
          setTimeout(() => {
            onChange(rawContent);
          }, 0);
        }
      }

      if (savedCursorInfo && selection) {
        Promise.resolve().then(() => {
          try {
            if (
              document.activeElement === editorRef.current &&
              editorRef.current
            ) {
              if (
                savedCursorInfo.domPath &&
                savedCursorInfo.domPath.length > 0
              ) {
                try {
                  let currentNode: Node = editorRef.current;
                  for (const index of savedCursorInfo.domPath) {
                    if (
                      currentNode.childNodes &&
                      currentNode.childNodes.length > index
                    ) {
                      const childNode = currentNode.childNodes[index];
                      if (childNode) {
                        currentNode = childNode;
                      } else {
                        throw new Error('子节点为空');
                      }
                    } else {
                      throw new Error('DOM路径无效');
                    }
                  }

                  const isMatchingNode =
                    savedCursorInfo.nodeType === currentNode.nodeType &&
                    (!savedCursorInfo.nodeValue ||
                      currentNode.nodeValue?.includes(
                        savedCursorInfo.nodeValue.substring(0, 10) || ''
                      ));

                  if (isMatchingNode) {
                    const range = document.createRange();
                    range.setStart(
                      currentNode,
                      Math.min(
                        savedCursorInfo.offset,
                        currentNode.nodeValue?.length || 0
                      )
                    );
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    return;
                  }
                } catch (e) {
                
                }
              }

              try {
                selection.removeAllRanges();
                selection.addRange(savedCursorInfo.range);

              } catch (e) {


                if (lastRangeRef.current) {
                  try {
                    selection.removeAllRanges();
                    selection.addRange(lastRangeRef.current);

                  } catch (e) {

                  }
                }
              }
            }
          } catch (e) {

          }
        });
      } else {

      }
    }, [content, onChange, saveSelection, debugLog]);

    const handleCompositionStart = useCallback(() => {
      isComposingRef.current = true;

    }, [debugLog]);

    const handleCompositionEnd = useCallback(() => {
      isComposingRef.current = false;
  

      handleContentChange();
    }, [handleContentChange, debugLog]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }, []);

    return (
      <div className={`rich-text-editor ${className}`} style={{ lineHeight }}>
        <div
          ref={editorRef}
          className="rich-text-editor-content"
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={handleContentChange}
          onBlur={handleContentChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          onClick={(e) => {
            try {
              const target = e.target as HTMLElement | null;
              if (!target) return;
              const anchor = target.closest('a') as HTMLAnchorElement | null;
              if (!anchor) return;

              e.preventDefault();
              const rawHref = anchor.getAttribute('href') || '';
              if (!rawHref) return;
              try {
                const url = new URL(rawHref, window.location.origin);
                window.open(url.toString(), '_blank', 'noopener,noreferrer');
              } catch {
                window.open(rawHref, '_blank', 'noopener,noreferrer');
              }
            } catch {}
          }}
          onMouseOver={(e) => {
            const target = e.target as HTMLElement | null;
            const anchor = target?.closest('a') as HTMLAnchorElement | null;
            if (!anchor) {
              setHoveredLink(null);
              if (!isOnTooltip) setShowLinkTooltip(false);
              if (hoverTimerRef.current) {
                window.clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = null;
              }
              return;
            }

            setHoveredLink(anchor);
            if (hoverTimerRef.current) {
              window.clearTimeout(hoverTimerRef.current);
            }
            const rect = anchor.getBoundingClientRect();
            const tooltipWidth = 320;
            const safePadding = 8;
            const left = Math.max(
              safePadding,
              Math.min(
                rect.left,
                window.innerWidth - tooltipWidth - safePadding
              )
            );
            const centerX = rect.left + rect.width / 2;
            const arrowOffset = Math.max(
              12,
              Math.min(centerX - left, tooltipWidth - 12)
            );
            setLinkArrowOffset(arrowOffset);
            setLinkTooltipPos({ top: rect.bottom + 10, left });
            hoverTimerRef.current = window.setTimeout(() => {
              setShowLinkTooltip(true);
            }, 300);
          }}
          onMouseOut={(e) => {
            const related = e.relatedTarget as HTMLElement | null;
            if (
              related &&
              related.closest &&
              related.closest('#rte-link-tooltip')
            ) {
              return;
            }
            if (hoverTimerRef.current) {
              window.clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = null;
            }

            window.setTimeout(() => {
              if (!isOnTooltip) {
                setShowLinkTooltip(false);
                setHoveredLink(null);
                setIsEditingLink(false);
              }
            }, 120);
          }}
          data-placeholder={content ? '' : placeholder}
          style={{
            minHeight: '1.5rem',
            outline: 'none',
            width: '100%',
            position: 'relative',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        />

        {showLinkTooltip && hoveredLink && (
          <div
            id="rte-link-tooltip"
            onMouseEnter={() => setIsOnTooltip(true)}
            onMouseLeave={() => {
              setIsOnTooltip(false);
              setShowLinkTooltip(false);
              setHoveredLink(null);
              setIsEditingLink(false);
            }}
            style={{
              position: 'fixed',
              top: `${linkTooltipPos.top}px`,
              left: `${linkTooltipPos.left}px`,
              zIndex: 10000,
            }}
            className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-2xl px-3 py-2 w-[320px] text-sm animate-rteFadeIn pointer-events-auto"
          >
            {}
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                left: `${linkArrowOffset - 6}px`,
                width: '12px',
                height: '12px',
                transform: 'rotate(45deg)',
                background: 'white',
                borderLeft: '1px solid rgba(229,231,235,1)',
                borderTop: '1px solid rgba(229,231,235,1)',
              }}
            />

            {!isEditingLink ? (
              <div className="space-y-2">
                {(() => {
                  const raw = hoveredLink.getAttribute('href') || '';
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                          ↗
                        </div>
                        <div className="truncate text-gray-800" title={raw}>
                          {raw}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="h-7 w-7 rounded-md hover:bg-gray-100 text-gray-700 flex items-center justify-center"
                          title="编辑链接"
                          aria-label="编辑链接"
                          onClick={() => {
                            setEditingHref(
                              hoveredLink.getAttribute('href') || ''
                            );
                            setIsEditingLink(true);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3a2 2 0 112.828 2.828l-8.95 8.95A2 2 0 016.05 16H4a1 1 0 01-1-1v-2.05a2 2 0 01.586-1.414l8.95-8.95z" />
                            <path d="M12 5l3 3" />
                          </svg>
                        </button>
                        <button
                          className="h-7 w-7 rounded-md hover:bg-red-50 text-red-600 flex items-center justify-center"
                          title="移除链接"
                          aria-label="移除链接"
                          onClick={() => {
                            const text = document.createTextNode(
                              hoveredLink.textContent || ''
                            );
                            hoveredLink.replaceWith(text);
                            if (editorRef.current && onChange) {
                              onChange(editorRef.current.innerHTML);
                            }
                            setShowLinkTooltip(false);
                            setHoveredLink(null);
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2h.293l1.313 9.192A2 2 0 007.592 17h4.816a2 2 0 001.986-1.808L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-1 6a1 1 0 112 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <div className="w-px h-5 bg-gray-200 mx-1" />
                        <button
                          className="h-7 w-7 rounded-md hover:bg-gray-100 text-gray-700 flex items-center justify-center"
                          title="在新标签页打开"
                          aria-label="在新标签页打开"
                          onClick={() => {
                            const rawHref =
                              hoveredLink.getAttribute('href') || '';
                            if (!rawHref) return;
                            try {
                              const url = new URL(
                                rawHref,
                                window.location.origin
                              );
                              window.open(
                                url.toString(),
                                '_blank',
                                'noopener,noreferrer'
                              );
                            } catch {
                              window.open(
                                rawHref,
                                '_blank',
                                'noopener,noreferrer'
                              );
                            }
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M12.293 2.293a1 1 0 011.414 0l4 4a1 1 0 11-1.414 1.414L14 5.414V13a1 1 0 11-2 0V5.414L9.707 7.707A1 1 0 018.293 6.293l4-4z" />
                            <path d="M3 9a1 1 0 011-1h4a1 1 0 110 2H5v6h10V10a1 1 0 112 0v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        </button>
                        <button
                          className="h-7 w-7 rounded-md hover:bg-gray-100 text-gray-700 flex items-center justify-center"
                          title={copied ? '已复制' : '复制链接'}
                          aria-label={copied ? '已复制' : '复制链接'}
                          onClick={async () => {
                            const rawHref =
                              hoveredLink.getAttribute('href') || '';
                            try {
                              await navigator.clipboard.writeText(rawHref);
                              setCopied(true);
                              if (copyTimerRef.current)
                                window.clearTimeout(copyTimerRef.current);
                              copyTimerRef.current = window.setTimeout(
                                () => setCopied(false),
                                1200
                              );
                            } catch {}
                          }}
                        >
                          {copied ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-green-600"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414L8.5 12.086l6.793-6.793a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M8 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0015.586 5L13 2.414A2 2 0 0011.586 2H8z" />
                              <path d="M4 6a2 2 0 012-2v10h8a2 2 0 11-2 2H6a2 2 0 01-2-2V6z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full h-8 px-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingHref}
                  onChange={(e) => setEditingHref(e.target.value)}
                  placeholder="输入新的链接地址"
                />

                <div className="flex gap-2 justify-end">
                  <button
                    className="px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsEditingLink(false)}
                  >
                    取消
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      if (!hoveredLink) return;
                      hoveredLink.setAttribute('href', editingHref || '');
                      if (editorRef.current && onChange) {
                        onChange(editorRef.current.innerHTML);
                      }
                      setIsEditingLink(false);
                      setShowLinkTooltip(false);
                      setHoveredLink(null);
                    }}
                  >
                    确认
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <style>
          {`
        .rich-text-editor-content[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
        }
        .rich-text-editor-content p {
          margin-bottom: 0.5em; 
          min-height: 1.6em; 
        }
        .rich-text-editor-content p:last-child {
          margin-bottom: 0;
        }
        .rich-text-editor-content br {
          line-height: var(--paragraph-line-height, 1.6); 
        }
        .rich-text-editor-content a {
          color: #3b82f6;
          text-decoration: none;
          border-bottom: 1px solid rgba(59, 130, 246, 0.3);
          cursor: pointer;
        }
        .rich-text-editor-content a:hover {
          border-bottom-color: #3b82f6;
        }
        @keyframes rteFadeInScale { from { opacity: 0; transform: translateY(4px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-rteFadeIn { animation: rteFadeInScale 140ms ease-out; }
        .rich-text-editor-content strong {
          font-weight: 600;
        }
        .rich-text-editor-content em {
          font-style: italic;
        }
        .rich-text-editor-content code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.9em;
          background-color: rgba(0, 0, 0, 0.04);
          padding: 0.2em 0.4em;
          border-radius: 3px;
        }
        `}
        </style>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
