import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { nanoid } from 'nanoid';
import { RichTextEditor } from './RichTextEditor';
import { EnhancedRichTextEditor } from './EnhancedRichTextEditor';
import { DocumentOutline } from './DocumentOutline';
import { DocumentSideOutline } from './DocumentSideOutline';
import { useTodoItems } from '../hooks/useTodoItems';
import { MediaInsertDialog } from './MediaInsertDialog';
import { BlockAddMenu } from './BlockAddMenu';

export type BlockType =
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'bulleted-list'
  | 'numbered-list'
  | 'to-do'
  | 'quote'
  | 'code'
  | 'image'
  | 'video'
  | 'embed'
  | 'divider';

export interface RichTextBlock {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  imageUrl?: string;

  highlightVariant?:
    | 'none'
    | 'note'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger';

  highlightTextColor?: string | null;

  highlightTextColorToken?:
    | 'orange'
    | 'blue'
    | 'green'
    | 'amber'
    | 'red'
    | 'purple'
    | null;
  highlightBorderColor?: string | null;
  highlightFillColor?: string | null;
}

export interface RichTextBlockEditorProps {
  initialValue?: RichTextBlock[];
  onChange?: (blocks: RichTextBlock[]) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  debug?: boolean;
  showOutline?: boolean;
  documentTitle?: string;
  onTitleChange?: (title: string) => void;
  lastEditTime?: Date;
  collaborators?: Array<{ name: string; color: string; id: number | string }>;
  onBlockCommentClick?: (blockId: string) => void;
  getBlockCommentCount?: (blockId: string) => number;
  showCommentIndicators?: boolean;
  blockComments?: Array<{ blockId: string; commentCount: number }>;
}

interface CursorInfo {
  position: number;
  hasSelection: boolean;
  selectionStart: number;
  selectionEnd: number;
  range?: Range;
  domPath?: number[];
  nodeType?: number;
  textContent?: string | null;
}

interface CursorPosition {
  blockId: string;
  offset: number;
  range?: Range;

  domPath?: number[];
  nodeType?: number;
  textContent?: string | null;
}

export function RichTextBlockEditor({
  initialValue = [],
  onChange,
  readOnly = false,
  className = '',
  placeholder = '输入 / 快速创建各种内容...',
  debug = false,
  showOutline = false,
  documentTitle = '',
  onTitleChange,
  lastEditTime,
  collaborators = [],
  onBlockCommentClick,
  getBlockCommentCount,
  showCommentIndicators = false,
  blockComments = [],
}: RichTextBlockEditorProps) {
  const [blocks, setBlocks] = useState<RichTextBlock[]>(
    initialValue.length > 0
      ? initialValue
      : [{ id: nanoid(), type: 'paragraph', content: '' }]
  );

  const prevInitialValueRef = useRef<RichTextBlock[]>(initialValue);

  const isLocalEditingRef = useRef<boolean>(false);

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const stripInlineTextColors = useCallback((html: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html || '', 'text/html');
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
      let node = walker.nextNode() as HTMLElement | null;
      while (node) {
        if (node.hasAttribute && node.hasAttribute('style')) {
          const style = (node.getAttribute('style') || '')
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s && !/^color\s*:/.test(s))
            .join('; ');
          if (style) node.setAttribute('style', style);
          else node.removeAttribute('style');
        }

        if (node.tagName === 'FONT' && (node as any).getAttribute('color')) {
          (node as any).removeAttribute('color');
        }
        node = walker.nextNode() as HTMLElement | null;
      }
      return doc.body.innerHTML;
    } catch {
      return html || '';
    }
  }, []);

  const applyTextColorToBlock = useCallback(
    (blockId: string, color: string) => {
      setBlocks((prev) => {
        const next = prev.map((b) => {
          if (b.id !== blockId) return b;

          const cleaned = stripInlineTextColors(b.content);

          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(cleaned || '', 'text/html');
            const walker = doc.createTreeWalker(
              doc.body,
              NodeFilter.SHOW_ELEMENT
            );
            let node = walker.nextNode() as HTMLElement | null;
            while (node) {
              const hasText = Array.from(node.childNodes).some(
                (n) =>
                  n.nodeType === Node.TEXT_NODE &&
                  (n.nodeValue || '').trim().length > 0
              );
              if (hasText) {
                const prevStyle = node.getAttribute('style') || '';
                const filtered = prevStyle
                  .split(';')
                  .map((s) => s.trim())
                  .filter((s) => s && !/^color\s*:/.test(s))
                  .join('; ');
                const nextStyle = filtered
                  ? `${filtered}; color: ${color}`
                  : `color: ${color}`;
                node.setAttribute('style', nextStyle);
              }
              node = walker.nextNode() as HTMLElement | null;
            }
            const unified = doc.body.innerHTML;
            return { ...b, content: unified, highlightTextColor: color };
          } catch {
            return { ...b, content: cleaned, highlightTextColor: color };
          }
        });

        const ed = richTextEditorsRef.current.get(blockId);
        if (ed && ed.setContent) {
          try {
            const newContent =
              next.find((b) => b.id === blockId)?.content || '';
            ed.setContent(newContent);
          } catch {}
        }
        if (onChange) onChange(next);
        return next;
      });
    },
    [onChange, stripInlineTextColors]
  );

  const [showAddMenuBlockId, setShowAddMenuBlockId] = useState<string | null>(
    null
  );

  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const addMenuRef = useRef<HTMLDivElement>(null);
  const [addMenuAnchorRect, setAddMenuAnchorRect] = useState<DOMRect | null>(
    null
  );

  const cursorPositionRef = useRef<CursorPosition | null>(null);

  const richTextEditorsRef = useRef<Map<string, any>>(new Map());

  const [mediaDialog, setMediaDialog] = useState<{
    open: boolean;
    blockId: string | null;
    initialTab: 'link' | 'image' | 'video' | 'embed';
  }>({ open: false, blockId: null, initialTab: 'image' });

  const handleInsertMedia = useCallback(
    (
      mediaType: string,
      textContent: string,
      attributes?: Record<string, string>
    ) => {
      const targetBlockId = mediaDialog.blockId;
      if (!targetBlockId) return;

      const escapeAttr = (v?: string) => (v || '').replace(/"/g, '&quot;');

      isLocalEditingRef.current = true;

      setBlocks((prevBlocks) => {
        const newBlocks = prevBlocks.map((block) => {
          if (block.id !== targetBlockId) return block;

          let html = '';
          let nextType: BlockType = block.type;

          if (mediaType === 'image') {
            const src = attributes?.src || '';
            const alt = attributes?.alt || '';
            const width = attributes?.width;
            const height = attributes?.height;
            html = `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${
              width ? ` width="${escapeAttr(width)}"` : ''
            }${height ? ` height="${escapeAttr(height)}"` : ''} />`;
            nextType = 'image';
            return { ...block, type: nextType, content: html, imageUrl: src };
          }

          if (mediaType === 'video') {
            const src = attributes?.src || '';
            const width = attributes?.width;
            const height = attributes?.height;
            const autoplay = attributes?.autoplay ? 'autoplay' : '';
            const muted = attributes?.muted ? 'muted' : '';
            const controls = attributes?.controls ? 'controls' : 'controls';
            html = `<video ${controls} ${autoplay} ${muted}${
              width ? ` width="${escapeAttr(width)}"` : ''
            }${
              height ? ` height="${escapeAttr(height)}"` : ''
            } src="${escapeAttr(src)}"></video>`;
            nextType = 'video';
            return { ...block, type: nextType, content: html };
          }

          if (mediaType === 'iframe') {
            const src = attributes?.src || '';
            const width = attributes?.width;
            const height = attributes?.height;
            const frameborder = attributes?.frameborder;
            const allowfullscreen = attributes?.allowfullscreen
              ? 'allowfullscreen'
              : '';
            html = `<iframe src="${escapeAttr(src)}"${
              width ? ` width="${escapeAttr(width)}"` : ''
            }${height ? ` height="${escapeAttr(height)}"` : ''}${
              frameborder ? ` frameborder="${escapeAttr(frameborder)}"` : ''
            } ${allowfullscreen}></iframe>`;
            nextType = 'embed';
            return { ...block, type: nextType, content: html };
          }

          if (mediaType === 'html') {
            html = textContent || '';
            nextType = 'embed';
            return { ...block, type: nextType, content: html };
          }

          if (mediaType === 'link') {
            const href = attributes?.href || '';
            const title = attributes?.title;
            const target = attributes?.target;
            const rel = attributes?.rel;
            const link = `<a href="${escapeAttr(href)}"${
              title ? ` title="${escapeAttr(title)}"` : ''
            }${target ? ` target="${escapeAttr(target)}"` : ''}${
              rel ? ` rel="${escapeAttr(rel)}"` : ''
            }>${textContent || escapeAttr(href)}</a>`;
            return { ...block, content: (block.content || '') + link };
          }

          return block;
        });

        if (onChange) onChange(newBlocks);
        return newBlocks;
      });

      setMediaDialog({ open: false, blockId: null, initialTab: 'image' });

      setTimeout(() => {
        isLocalEditingRef.current = false;
      }, 100);
    },
    [onChange, mediaDialog.blockId]
  );

  const [outlineVisible, setOutlineVisible] = useState(showOutline);

  const [title, setTitle] = useState(documentTitle);
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  const { toggleTodoStatus, completedCount, totalCount } = useTodoItems({
    blocks,
    onBlocksChange: (newBlocks) => {
      isLocalEditingRef.current = true;

      setBlocks(newBlocks);

      if (onChange) {
        onChange(newBlocks);
      }

      setTimeout(() => {
        isLocalEditingRef.current = false;
      }, 100);
    },
  });

  useEffect(() => {
    if (documentTitle !== title) {
      setTitle(documentTitle);
    }
  }, [documentTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const log = useCallback(
    (...args: any[]) => {
      if (debug) {
      }
    },
    [debug]
  );

  useEffect(() => {
    if (isLocalEditingRef.current) {
      return;
    }

    const prevValue = prevInitialValueRef.current;
    const currentValue = initialValue;

    if (prevValue.length !== currentValue.length) {
      setBlocks(
        currentValue.length > 0
          ? currentValue
          : [{ id: nanoid(), type: 'paragraph', content: '' }]
      );
      prevInitialValueRef.current = currentValue;
      return;
    }

    let hasChanged = false;
    for (let i = 0; i < currentValue.length; i++) {
      const prev = prevValue[i];
      const curr = currentValue[i];

      if (
        prev.content !== curr.content ||
        prev.type !== curr.type ||
        prev.checked !== curr.checked ||
        prev.imageUrl !== curr.imageUrl
      ) {
        hasChanged = true;
        break;
      }
    }

    if (hasChanged) {

      setBlocks(
        currentValue.length > 0
          ? currentValue
          : [{ id: nanoid(), type: 'paragraph', content: '' }]
      );
      prevInitialValueRef.current = currentValue;
    }
  }, [initialValue, log]);

  const getCursorInfo = useCallback(
    (element: HTMLElement): CursorInfo => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return {
          position: 0,
          hasSelection: false,
          selectionStart: 0,
          selectionEnd: 0,
        };
      }

      const range = selection.getRangeAt(0);

      if (!element.contains(range.startContainer)) {
        return {
          position: 0,
          hasSelection: false,
          selectionStart: 0,
          selectionEnd: 0,
        };
      }

      const preRange = range.cloneRange();
      preRange.selectNodeContents(element);
      preRange.setEnd(range.startContainer, range.startOffset);
      const position = preRange.toString().length;

      const hasSelection = !range.collapsed;
      let selectionStart = position;
      let selectionEnd = position;

      if (hasSelection) {
        const selRange = range.cloneRange();
        selRange.selectNodeContents(element);
        selRange.setEnd(range.endContainer, range.endOffset);
        selectionEnd = selRange.toString().length;
      }

      const domPath: number[] = [];
      let node: Node | null = range.startContainer;
      while (node && node !== element) {
        const parent = node.parentNode as Node;
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



      return {
        position,
        hasSelection,
        selectionStart,
        selectionEnd,
        range: range.cloneRange(),
        domPath,
        nodeType: range.startContainer.nodeType,
        textContent: range.startContainer.textContent,
      };
    },
    [log]
  );

  const setCursorInfo = useCallback(
    (element: HTMLElement, cursorInfo: CursorInfo) => {
      if (!element) return;

      try {
        const selection = window.getSelection();
        if (!selection) return;

        if (cursorInfo.domPath && cursorInfo.domPath.length > 0) {
          try {
            let node: Node = element;
            for (const index of cursorInfo.domPath) {
              if (node.childNodes && node.childNodes.length > index) {
                node = node.childNodes[index];
              } else {
                throw new Error('DOM路径无效');
              }
            }

            const isMatchingNode =
              cursorInfo.nodeType === node.nodeType &&
              (!cursorInfo.textContent ||
                node.textContent?.includes(
                  cursorInfo.textContent.substring(0, 10)
                ));

            if (isMatchingNode) {
              const range = document.createRange();

              if (node.nodeType === Node.TEXT_NODE) {
                const offset = Math.min(
                  cursorInfo.position,
                  node.textContent?.length || 0
                );
                range.setStart(node, offset);
                if (cursorInfo.hasSelection) {
                  const endOffset = Math.min(
                    cursorInfo.selectionEnd,
                    node.textContent?.length || 0
                  );
                  range.setEnd(node, endOffset);
                } else {
                  range.collapse(true);
                }
              } else {
                range.selectNode(node);
                range.collapse(true);
              }

              selection.removeAllRanges();
              selection.addRange(range);

              return;
            } else {

            }
          } catch (e) {

          }
        }

        if (cursorInfo.range) {
          try {
            selection.removeAllRanges();
            selection.addRange(cursorInfo.range);

            return;
          } catch (e) {

          }
        }

        const position = cursorInfo.hasSelection
          ? cursorInfo.selectionStart
          : cursorInfo.position;

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
              return findNodeAndOffset(childNode, targetOffset - currentOffset);
            }

            currentOffset += childText.length;
          }

          const lastChild = node.lastChild;
          return lastChild
            ? { node: lastChild, offset: (lastChild.textContent || '').length }
            : null;
        }

        const nodeInfo = findNodeAndOffset(element, position);

        if (nodeInfo) {
          const range = document.createRange();
          range.setStart(nodeInfo.node, nodeInfo.offset);

          if (cursorInfo.hasSelection) {
            const endNodeInfo = findNodeAndOffset(
              element,
              cursorInfo.selectionEnd
            );
            if (endNodeInfo) {
              range.setEnd(endNodeInfo.node, endNodeInfo.offset);
            } else {
              range.collapse(true);
            }
          } else {
            range.collapse(true);
          }

          selection.removeAllRanges();
          selection.addRange(range);

        }
      } catch (e) {

      }
    },
    [log]
  );

  const handleBlockContentChange = useCallback(
    (id: string, content: string) => {
      isLocalEditingRef.current = true;

      const blockElement = blockRefs.current.get(id);
      const contentElement = blockElement?.querySelector(
        '[contenteditable=true]'
      ) as HTMLElement;
      let cursorInfo: CursorInfo = {
        position: 0,
        hasSelection: false,
        selectionStart: 0,
        selectionEnd: 0,
      };

      if (contentElement && document.activeElement === contentElement) {
        cursorInfo = getCursorInfo(contentElement);
        cursorPositionRef.current = {
          blockId: id,
          offset: cursorInfo.position,
          range: cursorInfo.range,
          domPath: cursorInfo.domPath,
          nodeType: cursorInfo.nodeType,
          textContent: cursorInfo.textContent,
        };

      }

      setBlocks((prevBlocks) => {
        const newBlocks = prevBlocks.map((block) => {
          if (block.id === id) {
            return { ...block, content };
          }
          return block;
        });

        setTimeout(() => {
          if (onChange) {
            onChange(newBlocks);
          }

          if (content === '/' && !showAddMenuBlockId) {
            setShowAddMenuBlockId(id);
          }
        }, 0);

        return newBlocks;
      });

      if (contentElement && document.activeElement === contentElement) {
        requestAnimationFrame(() => {
          Promise.resolve().then(() => {
            try {
              const updatedBlockElement = blockRefs.current.get(id);
              const updatedContentElement = updatedBlockElement?.querySelector(
                '[contenteditable=true]'
              ) as HTMLElement;

              if (
                updatedContentElement &&
                document.activeElement === updatedContentElement
              ) {
                setCursorInfo(updatedContentElement, cursorInfo);

              }
            } catch (e) {
            }
          });
        });
      }

      setTimeout(() => {
        isLocalEditingRef.current = false;
      }, 100);
    },
    [onChange, getCursorInfo, setCursorInfo, showAddMenuBlockId, log]
  );

  const handleBlockTypeChange = useCallback(
    (id: string, newType: BlockType) => {
      isLocalEditingRef.current = true;

      setBlocks((prevBlocks) => {
        const newBlocks = prevBlocks.map((block) => {
          if (block.id === id) {
            const newContent = block.content === '/' ? '' : block.content;
            return { ...block, type: newType, content: newContent };
          }
          return block;
        });

        if (onChange) {
          onChange(newBlocks);
        }

        return newBlocks;
      });

      setShowAddMenuBlockId(null);

      setTimeout(() => {
        const blockElement = blockRefs.current.get(id);
        if (blockElement) {
          const contentEditable = blockElement.querySelector(
            '[contenteditable="true"]'
          );
          if (contentEditable) {
            (contentEditable as HTMLElement).focus();
          }
        }

        isLocalEditingRef.current = false;
      }, 10);
    },
    [onChange]
  );

  const handleBlockFocus = useCallback((id: string) => {
    setActiveBlockId(id);
  }, []);

  const [openHlPopoverBlockId, setOpenHlPopoverBlockId] = useState<
    string | null
  >(null);
  const hlHoverTimerRef = useRef<number | null>(null);
  const hlHoverOutTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const onTogglePopover = (e: Event) => {
      const detail = (e as CustomEvent).detail as { blockId?: string };
      if (!detail?.blockId) return;
      setOpenHlPopoverBlockId((prev) =>
        prev === detail.blockId ? null : (detail.blockId as string)
      );
    };
    const onDocClick = () => setOpenHlPopoverBlockId(null);
    window.addEventListener(
      'nexus-toggle-hl-popover',
      onTogglePopover as EventListener
    );
    document.addEventListener('mousedown', onDocClick);
    return () => {
      window.removeEventListener(
        'nexus-toggle-hl-popover',
        onTogglePopover as EventListener
      );
      document.removeEventListener('mousedown', onDocClick);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hlHoverTimerRef.current) window.clearTimeout(hlHoverTimerRef.current);
      if (hlHoverOutTimerRef.current)
        window.clearTimeout(hlHoverOutTimerRef.current);
    };
  }, []);

  const handleBlockBlur = useCallback(() => {
    setTimeout(() => {
      if (document.activeElement?.closest('.rich-text-block-editor-block')) {
        return;
      }
      setActiveBlockId(null);
    }, 100);
  }, []);

  const handleAddMenuClick = useCallback((id: string) => {
    setShowAddMenuBlockId((prevId) => {
      const nextId = prevId === id ? null : id;

      const el = blockRefs.current.get(id);
      if (nextId && el) {
        const btn = el.querySelector('.block-add-button') as HTMLElement | null;
        const rect = (btn || el).getBoundingClientRect();
        setAddMenuAnchorRect(rect);
      } else {
        setAddMenuAnchorRect(null);
      }
      return nextId;
    });
  }, []);

  useEffect(() => {
    if (!showAddMenuBlockId) return;
    const el = blockRefs.current.get(showAddMenuBlockId);
    if (el) {
      const btn = el.querySelector('.block-add-button') as HTMLElement | null;
      const rect = (btn || el).getBoundingClientRect();
      setAddMenuAnchorRect(rect);
    }
  }, [showAddMenuBlockId]);

  const handleAddBlock = useCallback(
    (index: number, type: BlockType = 'paragraph') => {
      isLocalEditingRef.current = true;

      const newBlock: RichTextBlock = {
        id: nanoid(),
        type,
        content: '',
      };

      setBlocks((prevBlocks) => {
        const newBlocks = [...prevBlocks];
        newBlocks.splice(index + 1, 0, newBlock);

        if (onChange) {
          onChange(newBlocks);
        }

        return newBlocks;
      });

      setShowAddMenuBlockId(null);

      setActiveBlockId(newBlock.id);

      setTimeout(() => {
        const newBlockElement = blockRefs.current.get(newBlock.id);
        if (newBlockElement) {
          const contentEditable = newBlockElement.querySelector(
            '[contenteditable="true"]'
          );
          if (contentEditable) {
            (contentEditable as HTMLElement).focus();
          }
        }

        isLocalEditingRef.current = false;
      }, 10);
    },
    [onChange]
  );

  useEffect(() => {
    const toggleHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { blockId?: string };
      if (!detail || !detail.blockId) return;
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === detail.blockId
            ? {
                ...b,
                highlightVariant:
                  b.highlightVariant && b.highlightVariant !== 'none'
                    ? 'none'
                    : 'note',
              }
            : b
        )
      );
    };
    window.addEventListener(
      'nexus-toggle-highlight',
      toggleHandler as EventListener
    );
    return () =>
      window.removeEventListener(
        'nexus-toggle-highlight',
        toggleHandler as EventListener
      );
  }, []);

  const handleDeleteBlock = useCallback(
    (id: string) => {
      isLocalEditingRef.current = true;

      setBlocks((prevBlocks) => {
        if (prevBlocks.length <= 1) {
          return [{ id: nanoid(), type: 'paragraph', content: '' }];
        }

        const index = prevBlocks.findIndex((block) => block.id === id);
        const newBlocks = prevBlocks.filter((block) => block.id !== id);

        if (onChange) {
          onChange(newBlocks);
        }

        if (index > 0) {
          const prevBlockId = newBlocks[index - 1]?.id;
          if (prevBlockId) {
            setActiveBlockId(prevBlockId);
            setTimeout(() => {
              const prevBlockElement = blockRefs.current.get(prevBlockId);
              if (prevBlockElement) {
                const contentEditable = prevBlockElement.querySelector(
                  '[contenteditable="true"]'
                );
                if (contentEditable) {
                  (contentEditable as HTMLElement).focus();
                }
              }

              isLocalEditingRef.current = false;
            }, 10);
          }
        }

        return newBlocks;
      });
    },
    [onChange]
  );

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingBlockId(id);
    e.dataTransfer.effectAllowed = 'move';

    const blockElement = blockRefs.current.get(id);
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      const dragImage = blockElement.cloneNode(true) as HTMLElement;

      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.opacity = '0.5';
      dragImage.style.width = `${rect.width}px`;

      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);

      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingBlockId(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();

      if (!draggingBlockId) return;

      setBlocks((prevBlocks) => {
        const sourceIndex = prevBlocks.findIndex(
          (block) => block.id === draggingBlockId
        );
        if (sourceIndex === -1) return prevBlocks;

        const newBlocks = [...prevBlocks];
        const [movedBlock] = newBlocks.splice(sourceIndex, 1);

        const adjustedTargetIndex =
          sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        newBlocks.splice(adjustedTargetIndex, 0, movedBlock);

        if (onChange) {
          onChange(newBlocks);
        }

        return newBlocks;
      });

      setDraggingBlockId(null);
      setDragOverIndex(null);
    },
    [draggingBlockId, onChange]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showAddMenuBlockId &&
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('.block-add-button')
      ) {
        setShowAddMenuBlockId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddMenuBlockId]);

  const handleOutlineItemClick = useCallback(
    (blockId: string) => {
      const blockElement = blockRefs.current.get(blockId);
      if (blockElement) {
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

        handleBlockFocus(blockId);

        const editor = richTextEditorsRef.current.get(blockId);
        if (editor) {
          setTimeout(() => {
            editor.focus();
          }, 100);
        }
      }
    },
    [handleBlockFocus]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, blockId: string, index: number) => {
      if (
        e.key === 'ArrowUp' &&
        (e.target as HTMLElement).textContent?.length === 0
      ) {
        e.preventDefault();

        if (index > 0) {
          const prevBlockId = blocks[index - 1]?.id;
          if (prevBlockId) {
            const prevBlockElement = blockRefs.current.get(prevBlockId);
            if (prevBlockElement) {
              const contentEditable = prevBlockElement.querySelector(
                '[contenteditable="true"]'
              );
              if (contentEditable) {
                (contentEditable as HTMLElement).focus();

                const selection = window.getSelection();
                if (selection) {
                  const range = document.createRange();
                  range.selectNodeContents(contentEditable as HTMLElement);
                  range.collapse(false);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            }
          }
        }
      } else if (e.key === 'ArrowDown') {
        const target = e.target as HTMLElement;
        const selection = window.getSelection();

        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const endContainer = range.endContainer;
          const endOffset = range.endOffset;

          if (
            endContainer.nodeType === Node.TEXT_NODE &&
            endOffset === endContainer.textContent?.length &&
            !range.endContainer.nextSibling
          ) {
            if (index < blocks.length - 1) {
              e.preventDefault();
              const nextBlockId = blocks[index + 1]?.id;
              if (nextBlockId) {
                const nextBlockElement = blockRefs.current.get(nextBlockId);
                if (nextBlockElement) {
                  const contentEditable = nextBlockElement.querySelector(
                    '[contenteditable="true"]'
                  );
                  if (contentEditable) {
                    (contentEditable as HTMLElement).focus();

                    const selection = window.getSelection();
                    if (selection) {
                      const range = document.createRange();
                      range.selectNodeContents(contentEditable as HTMLElement);
                      range.collapse(true);
                      selection.removeAllRanges();
                      selection.addRange(range);
                    }
                  }
                }
              }
            }
          }
        }
      } else if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleAddBlock(index);
      } else if (
        e.key === 'Backspace' &&
        (e.target as HTMLElement).textContent === ''
      ) {
        e.preventDefault();
        handleDeleteBlock(blockId);
      }
    },
    [blocks, handleAddBlock, handleDeleteBlock]
  );

  const isComposingRef = useRef<boolean>(false);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const AddMenu = ({ blockId, index }: { blockId: string; index: number }) => (
    <div className="hidden">
      <div className="grid grid-cols-2 gap-1">
        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'paragraph')}
        >
          <span className="material-icons text-gray-600 mr-2">text_fields</span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">文本</div>
            <div className="text-xs text-gray-500 truncate">富文本段落</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'heading-1')}
        >
          <span className="material-icons text-gray-600 mr-2">title</span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">标题 1</div>
            <div className="text-xs text-gray-500 truncate">大标题</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'heading-2')}
        >
          <span className="material-icons text-gray-600 mr-2">format_size</span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">标题 2</div>
            <div className="text-xs text-gray-500 truncate">中标题</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'heading-3')}
        >
          <span className="material-icons text-gray-600 mr-2">
            format_overline
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">标题 3</div>
            <div className="text-xs text-gray-500 truncate">小标题</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'bulleted-list')}
        >
          <span className="material-icons text-gray-600 mr-2">
            format_list_bulleted
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">无序列表</div>
            <div className="text-xs text-gray-500 truncate">项目符号列表</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'numbered-list')}
        >
          <span className="material-icons text-gray-600 mr-2">
            format_list_numbered
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">有序列表</div>
            <div className="text-xs text-gray-500 truncate">数字编号列表</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'to-do')}
        >
          <span className="material-icons text-gray-600 mr-2">check_box</span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">待办事项</div>
            <div className="text-xs text-gray-500 truncate">可勾选的任务</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'quote')}
        >
          <span className="material-icons text-gray-600 mr-2">
            format_quote
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">引用</div>
            <div className="text-xs text-gray-500 truncate">引用文本</div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => {
            setBlocks((prev) =>
              prev.map((b) =>
                b.id === blockId
                  ? {
                      ...b,
                      highlightVariant:
                        b.highlightVariant && b.highlightVariant !== 'none'
                          ? 'none'
                          : 'note',
                    }
                  : b
              )
            );
            setShowAddMenuBlockId(null);
          }}
        >
          <span className="material-icons text-gray-600 mr-2">highlight</span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">切换高亮</div>
            <div className="text-xs text-gray-500 truncate">
              与标题/列表/代办可叠加
            </div>
          </div>
        </button>

        <button
          className="flex items-center p-2 hover:bg-gray-100 rounded text-left"
          onClick={() => handleBlockTypeChange(blockId, 'code')}
        >
          <span className="material-icons text-gray-600 mr-2">code</span>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium truncate">代码</div>
            <div className="text-xs text-gray-500 truncate">代码片段</div>
          </div>
        </button>

        <button className="hidden" />
      </div>
    </div>
  );

  const getControlButtonOffset = useCallback((blockType: BlockType) => {
    switch (blockType) {
      case 'heading-1':
        return 'calc(var(--block-padding-y) + 1.05rem)';
      case 'heading-2':
        return 'calc(var(--block-padding-y) + 0.8rem)';
      case 'heading-3':
        return 'calc(var(--block-padding-y) + 0.5rem)';
      case 'code':
        return 'calc(var(--block-padding-y) + 0.8rem)';
      case 'quote':
        return 'calc(var(--block-padding-y) + 0.38rem)';
      case 'divider':
        return 'calc(var(--block-padding-y) + 0rem)';
      default:
        return 'calc(var(--block-padding-y) + 0.28rem)';
    }
  }, []);

  const renderBlockContent = (block: RichTextBlock) => {
    const wrapWithHighlight = (inner: React.ReactNode) => {
      const variant =
        block.highlightVariant && block.highlightVariant !== 'none'
          ? block.highlightVariant
          : null;
      if (!variant) return inner;
      const stylesByVariant: Record<
        string,
        { container: string; bar: string; icon: string; color: string }
      > = {
        note: {
          container: 'bg-yellow-50 border-yellow-200',
          bar: 'bg-yellow-400',
          icon: 'lightbulb',
          color: '#f59e0b',
        },
        info: {
          container: 'bg-blue-50 border-blue-200',
          bar: 'bg-blue-400',
          icon: 'info',
          color: '#3b82f6',
        },
        success: {
          container: 'bg-green-50 border-green-200',
          bar: 'bg-green-400',
          icon: 'check_circle',
          color: '#10b981',
        },
        warning: {
          container: 'bg-amber-50 border-amber-200',
          bar: 'bg-amber-400',
          icon: 'warning',
          color: '#f59e0b',
        },
        danger: {
          container: 'bg-red-50 border-red-200',
          bar: 'bg-red-400',
          icon: 'error',
          color: '#ef4444',
        },
      };
      const style = stylesByVariant[variant];
      const fill = block.highlightFillColor || undefined;
      const border = block.highlightBorderColor || undefined;
      const text = block.highlightTextColor || undefined;
      return (
        <div
          className={`relative ml-2 my-1 border ${style.container} rounded-md group`}
          style={{
            backgroundColor: fill || undefined,
            borderColor: border || undefined,
            color: text || undefined,
          }}
        >
          {}
          <div className="pl-3 pr-2 py-2">
            {inner}
            {!readOnly && (
              <div className="absolute -top-11 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity delay-200 pointer-events-auto z-[1000]">
                <div className="relative">
                  {}
                  <div
                    className="mb-1 flex items-center gap-1.5 bg-white/95 backdrop-blur border border-gray-200 rounded-full shadow-sm px-2 py-[6px]"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {}
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 active:shadow-inner"
                      title="字体与颜色"
                      onClick={() => setOpenHlPopoverBlockId(block.id)}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3a9 9 0 0 0 0 18h4a2 2 0 0 0 2-2c0-.94-.66-1.72-1.55-1.93-1.31-.3-1.45-2.03-.24-2.59A4 4 0 0 0 14 6h-1" />
                        <circle cx="7.5" cy="10.5" r="1.25" />
                        <circle cx="12" cy="7.5" r="1.25" />
                        <circle cx="16.5" cy="10.5" r="1.25" />
                        <circle cx="9.5" cy="14.5" r="1.25" />
                      </svg>
                    </button>
                    {}
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 active:shadow-inner"
                      title="评论"
                      onClick={() => {
                        if (onBlockCommentClick) onBlockCommentClick(block.id);
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 11.5a8.5 8.5 0 1 1-4.2-7.4" />
                        <path d="M22 2l-5 5" />
                      </svg>
                    </button>
                    {}
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 active:shadow-inner"
                      title="分享"
                      onClick={() => {
                        const evt = new CustomEvent('nexus-share-block', {
                          detail: { blockId: block.id },
                        });
                        window.dispatchEvent(evt);
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 3h7v7" />
                        <path d="M10 14L21 3" />
                        <path d="M21 14v7h-7" />
                        <path d="M3 10h7V3" />
                      </svg>
                    </button>
                  </div>

                  {}
                  {openHlPopoverBlockId === block.id && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[1000]"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <div
                          className="w-80 bg-white rounded-xl shadow-xl p-3 border"
                          style={{ borderColor: '#E5E6EB' }}
                        >
                          {}
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500">
                              字体颜色
                            </div>
                            <button
                              className="text-xs text-blue-500 hover:text-blue-600"
                              onClick={() => {
                                const palette = [
                                  '#111827',
                                  '#374151',
                                  '#6B7280',
                                  '#EF4444',
                                  '#F59E0B',
                                  '#10B981',
                                  '#3B82F6',
                                  '#8B5CF6',
                                ];

                                const c =
                                  palette[
                                    Math.floor(Math.random() * palette.length)
                                  ];

                                applyTextColorToBlock(block.id, c);
                              }}
                            >
                              随机
                            </button>
                          </div>
                          {}
                          <div className="flex items-center gap-2 mb-3">
                            {[
                              '#111827',
                              '#EF4444',
                              '#F59E0B',
                              '#10B981',
                              '#3B82F6',
                              '#8B5CF6',
                            ].map((c) => {
                              const active = block.highlightTextColor === c;
                              return (
                                <button
                                  key={c}
                                  className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                                    active
                                      ? 'outline outline-2 outline-blue-500 border-white'
                                      : 'border-gray-200'
                                  } bg-white hover:border-gray-300`}
                                  onClick={() =>
                                    applyTextColorToBlock(block.id, c)
                                  }
                                  title={c}
                                >
                                  <span
                                    className="text-[12px] font-semibold"
                                    style={{ color: c }}
                                  >
                                    A
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {}
                          <div className="text-xs text-gray-500 mb-2">
                            边框颜色
                          </div>
                          <div className="grid grid-cols-9 gap-2 mb-3">
                            <button
                              className={`w-6 h-6 rounded-md border ${
                                !block.highlightBorderColor
                                  ? 'outline outline-2 outline-blue-500 border-white'
                                  : 'border-gray-200'
                              }`}
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, #eee 0, #eee 6px, #fff 6px, #fff 12px)',
                              }}
                              onClick={() =>
                                setBlocks((prev) =>
                                  prev.map((b) =>
                                    b.id === block.id
                                      ? { ...b, highlightBorderColor: null }
                                      : b
                                  )
                                )
                              }
                              title="透明"
                            />

                            {[
                              '#E5E7EB',
                              '#D1D5DB',
                              '#F59E0B',
                              '#10B981',
                              '#3B82F6',
                              '#8B5CF6',
                              '#EF4444',
                              '#A855F7',
                              '#F97316',
                            ].map((c) => {
                              const active = block.highlightBorderColor === c;
                              return (
                                <button
                                  key={c}
                                  className={`w-6 h-6 rounded-md border ${
                                    active
                                      ? 'outline outline-2 outline-blue-500 border-white'
                                      : 'border-gray-200'
                                  } hover:border-gray-300`}
                                  style={{ backgroundColor: c }}
                                  onClick={() =>
                                    setBlocks((prev) =>
                                      prev.map((b) =>
                                        b.id === block.id
                                          ? { ...b, highlightBorderColor: c }
                                          : b
                                      )
                                    )
                                  }
                                  title={c}
                                />
                              );
                            })}
                          </div>

                          {}
                          <div className="text-xs text-gray-500 mb-2">
                            填充颜色
                          </div>
                          <div className="grid grid-cols-9 gap-2 mb-3">
                            <button
                              className={`w-6 h-6 rounded-md border ${
                                !block.highlightFillColor
                                  ? 'outline outline-2 outline-blue-500 border-white'
                                  : 'border-gray-200'
                              }`}
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, #eee 0, #eee 6px, #fff 6px, #fff 12px)',
                              }}
                              onClick={() =>
                                setBlocks((prev) =>
                                  prev.map((b) =>
                                    b.id === block.id
                                      ? { ...b, highlightFillColor: null }
                                      : b
                                  )
                                )
                              }
                              title="透明"
                            />

                            {[
                              '#FEF3C7',
                              '#ECFDF5',
                              '#EFF6FF',
                              '#EEF2FF',
                              '#FEE2E2',
                              '#F3F4F6',
                              '#E0F2FE',
                              '#FAE8FF',
                              '#FFF7ED',
                            ].map((c) => {
                              const active = block.highlightFillColor === c;
                              return (
                                <button
                                  key={c}
                                  className={`w-6 h-6 rounded-md border ${
                                    active
                                      ? 'outline outline-2 outline-blue-500 border-white'
                                      : 'border-gray-200'
                                  } hover:border-gray-300`}
                                  style={{ backgroundColor: c }}
                                  onClick={() =>
                                    setBlocks((prev) =>
                                      prev.map((b) =>
                                        b.id === block.id
                                          ? { ...b, highlightFillColor: c }
                                          : b
                                      )
                                    )
                                  }
                                  title={c}
                                />
                              );
                            })}
                          </div>

                          {}
                          <div className="text-xs text-gray-500 mb-2">
                            快速默认
                          </div>
                          <div className="flex gap-2">
                            {(
                              [
                                ['note', '橙色', '#f59e0b', 'orange'],
                                ['info', '蓝色', '#3b82f6', 'blue'],
                                ['success', '绿色', '#10b981', 'green'],
                                ['warning', '琥珀', '#f59e0b', 'amber'],
                                ['danger', '红色', '#ef4444', 'red'],
                              ] as const
                            ).map(([v, label, color, token]) => (
                              <button
                                key={v}
                                className="px-3 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                                style={{ color }}
                                onClick={() =>
                                  setBlocks((prev) =>
                                    prev.map((b) =>
                                      b.id === block.id
                                        ? {
                                            ...b,
                                            highlightVariant: v as any,
                                            highlightTextColor: color,
                                            highlightTextColorToken:
                                              token as any,
                                          }
                                        : b
                                    )
                                  )
                                }
                              >
                                {label}
                              </button>
                            ))}
                            <button
                              className="absolute top-1/2 -right-10 -translate-y-1/2 h-28 w-8 bg-white border border-gray-200 rounded-md shadow text-xs text-gray-700 hover:bg-gray-50 [writing-mode:vertical-rl]"
                              onClick={() => {
                                setBlocks((prev) => {
                                  const next = prev.map((b) => {
                                    if (b.id !== block.id) return b;
                                    const cleaned = stripInlineTextColors(
                                      b.content
                                    );
                                    return {
                                      ...b,
                                      content: cleaned,
                                      highlightVariant: 'none' as const,
                                      highlightTextColor: null,
                                      highlightBorderColor: null,
                                      highlightFillColor: null,
                                    };
                                  });
                                  const ed = richTextEditorsRef.current.get(
                                    block.id
                                  );
                                  if (ed && ed.setContent) {
                                    try {
                                      ed.setContent(
                                        next.find((x) => x.id === block.id)
                                          ?.content || ''
                                      );
                                    } catch {}
                                  }
                                  if (onChange) onChange(next);
                                  return next;
                                });
                              }}
                            >
                              恢复默认
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };
    switch (block.type) {
      case 'paragraph':
        return wrapWithHighlight(
          <div className="py-1 px-1">
            {readOnly ? (
              <div
                className="min-h-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <EnhancedRichTextEditor
                ref={(el) => {
                  if (el) richTextEditorsRef.current.set(block.id, el);
                  else richTextEditorsRef.current.delete(block.id);
                }}
                initialValue={block.content}
                onChange={(content) =>
                  handleBlockContentChange(block.id, content)
                }
                blockId={block.id}
                onBlockTypeChange={handleBlockTypeChange}
                externalBlockType={block.type}
                placeholder={placeholder}
                className="min-h-[1.5rem]"
                debug={debug}
              />
            )}
          </div>
        );

      case 'image':
        return wrapWithHighlight(
          <div className="py-2 px-1">
            <div
              className="min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        );

      case 'video':
        return wrapWithHighlight(
          <div className="py-2 px-1">
            <div
              className="min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        );

      case 'embed':
        return wrapWithHighlight(
          <div className="py-2 px-1">
            <div
              className="min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        );

      case 'heading-1':
        return wrapWithHighlight(
          <div className="py-1 px-1" id={block.id}>
            {readOnly ? (
              <div
                className="text-3xl font-bold min-h-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <EnhancedRichTextEditor
                ref={(el) => {
                  if (el) richTextEditorsRef.current.set(block.id, el);
                  else richTextEditorsRef.current.delete(block.id);
                }}
                initialValue={block.content}
                onChange={(content) =>
                  handleBlockContentChange(block.id, content)
                }
                blockId={block.id}
                onBlockTypeChange={handleBlockTypeChange}
                externalBlockType={block.type}
                placeholder="标题 1"
                className="text-3xl font-bold min-h-[1.5rem]"
                debug={debug}
              />
            )}
          </div>
        );

      case 'heading-2':
        return wrapWithHighlight(
          <div className="py-1 px-1" id={block.id}>
            {readOnly ? (
              <div
                className="text-2xl font-bold min-h-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <EnhancedRichTextEditor
                ref={(el) => {
                  if (el) richTextEditorsRef.current.set(block.id, el);
                  else richTextEditorsRef.current.delete(block.id);
                }}
                initialValue={block.content}
                onChange={(content) =>
                  handleBlockContentChange(block.id, content)
                }
                blockId={block.id}
                onBlockTypeChange={handleBlockTypeChange}
                externalBlockType={block.type}
                placeholder="标题 2"
                className="text-2xl font-bold min-h-[1.5rem]"
                debug={debug}
              />
            )}
          </div>
        );

      case 'heading-3':
        return wrapWithHighlight(
          <div className="py-1 px-1" id={block.id}>
            {readOnly ? (
              <div
                className="text-xl font-bold min-h-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <EnhancedRichTextEditor
                ref={(el) => {
                  if (el) richTextEditorsRef.current.set(block.id, el);
                  else richTextEditorsRef.current.delete(block.id);
                }}
                initialValue={block.content}
                onChange={(content) =>
                  handleBlockContentChange(block.id, content)
                }
                blockId={block.id}
                onBlockTypeChange={handleBlockTypeChange}
                externalBlockType={block.type}
                placeholder="标题 3"
                className="text-xl font-bold min-h-[1.5rem]"
                debug={debug}
              />
            )}
          </div>
        );

      case 'bulleted-list':
        return wrapWithHighlight(
          <div className="flex items-start py-0.5">
            <div className="px-1 text-gray-500">•</div>
            <div className="flex-1">
              {readOnly ? (
                <div
                  className="min-h-[1.5rem]"
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              ) : (
                <EnhancedRichTextEditor
                  ref={(el) => {
                    if (el) richTextEditorsRef.current.set(block.id, el);
                    else richTextEditorsRef.current.delete(block.id);
                  }}
                  initialValue={block.content}
                  onChange={(content) =>
                    handleBlockContentChange(block.id, content)
                  }
                  blockId={block.id}
                  onBlockTypeChange={handleBlockTypeChange}
                  externalBlockType={block.type}
                  placeholder="列表项"
                  className="min-h-[1.5rem]"
                  debug={debug}
                />
              )}
            </div>
          </div>
        );

      case 'numbered-list':
        return wrapWithHighlight(
          <div className="flex items-start py-0.5">
            <div className="px-1 text-gray-500 min-w-[1.5rem] pt-0.5">
              {blocks.filter((b) => b.type === 'numbered-list').indexOf(block) +
                1}
              .
            </div>
            <div className="flex-1">
              {readOnly ? (
                <div
                  className="min-h-[1.5rem]"
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              ) : (
                <EnhancedRichTextEditor
                  ref={(el) => {
                    if (el) richTextEditorsRef.current.set(block.id, el);
                    else richTextEditorsRef.current.delete(block.id);
                  }}
                  initialValue={block.content}
                  onChange={(content) =>
                    handleBlockContentChange(block.id, content)
                  }
                  blockId={block.id}
                  onBlockTypeChange={handleBlockTypeChange}
                  externalBlockType={block.type}
                  placeholder="列表项"
                  className="min-h-[1.5rem]"
                  debug={debug}
                />
              )}
            </div>
          </div>
        );

      case 'to-do':
        return wrapWithHighlight(
          <div className="flex items-start py-0.5">
            <div className="flex items-center justify-center w-6 h-6 mt-[0.15rem]">
              <input
                type="checkbox"
                checked={block.checked || false}
                onChange={(e) => toggleTodoStatus(block.id, e.target.checked)}
                className="rounded h-3.5 w-3.5 border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={readOnly}
              />
            </div>
            <div className="flex-1">
              {readOnly ? (
                <div
                  className={`min-h-[1.5rem] ${
                    block.checked ? 'line-through text-gray-500' : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              ) : (
                <div
                  className={`todo-editor-wrapper ${
                    block.checked ? 'todo-checked' : ''
                  }`}
                >
                  <EnhancedRichTextEditor
                    ref={(el) => {
                      if (el) richTextEditorsRef.current.set(block.id, el);
                      else richTextEditorsRef.current.delete(block.id);
                    }}
                    initialValue={block.content}
                    onChange={(content) =>
                      handleBlockContentChange(block.id, content)
                    }
                    blockId={block.id}
                    onBlockTypeChange={handleBlockTypeChange}
                    externalBlockType={block.type}
                    placeholder="待办事项"
                    className="min-h-[1.5rem]"
                    debug={debug}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'quote':
        return wrapWithHighlight(
          <blockquote className="border-l-4 border-gray-200 pl-2 py-1 italic text-gray-600 ml-2">
            {readOnly ? (
              <div
                className="min-h-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <EnhancedRichTextEditor
                ref={(el) => {
                  if (el) richTextEditorsRef.current.set(block.id, el);
                  else richTextEditorsRef.current.delete(block.id);
                }}
                initialValue={block.content}
                onChange={(content) =>
                  handleBlockContentChange(block.id, content)
                }
                blockId={block.id}
                onBlockTypeChange={handleBlockTypeChange}
                externalBlockType={block.type}
                placeholder="引用文本"
                className="min-h-[1.5rem]"
                debug={debug}
              />
            )}
          </blockquote>
        );

      case 'code':
        return wrapWithHighlight(
          <pre className="bg-gray-50 p-3 rounded font-mono text-sm ml-2">
            {readOnly ? (
              <div
                className="whitespace-pre-wrap min-h-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <EnhancedRichTextEditor
                ref={(el) => {
                  if (el) richTextEditorsRef.current.set(block.id, el);
                  else richTextEditorsRef.current.delete(block.id);
                }}
                initialValue={block.content}
                onChange={(content) =>
                  handleBlockContentChange(block.id, content)
                }
                blockId={block.id}
                onBlockTypeChange={handleBlockTypeChange}
                externalBlockType={block.type}
                placeholder="输入代码"
                className="whitespace-pre-wrap min-h-[1.5rem]"
                debug={debug}
              />
            )}
          </pre>
        );

      case 'divider':
        return (
          <div
            className="flex items-center justify-center py-3"
            style={{ minHeight: '22px' }}
          >
            <hr className="w-full border-t border-gray-200" />
          </div>
        );

      default:
        return (
          <div className="py-1 px-1">
            {readOnly ? (
              <div
                className="min-h-[1.5rem]"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ) : (
              <EnhancedRichTextEditor
                ref={(el) => {
                  if (el) richTextEditorsRef.current.set(block.id, el);
                  else richTextEditorsRef.current.delete(block.id);
                }}
                initialValue={block.content}
                onChange={(content) =>
                  handleBlockContentChange(block.id, content)
                }
                blockId={block.id}
                onBlockTypeChange={handleBlockTypeChange}
                placeholder={placeholder}
                className="min-h-[1.5rem]"
                debug={debug}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div
      className={`rich-text-block-editor w-full ${className} ${
        showOutline ? 'with-outline' : ''
      }`}
    >
      {}
      <div className="document-title-area mb-6 pb-4 border-b border-gray-100 w-full px-[3.25rem]">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onFocus={() => setIsTitleFocused(true)}
          onBlur={() => setIsTitleFocused(false)}
          className={`
            w-full text-3xl font-bold text-gray-900 border-0 p-0 mb-2
            focus:outline-none focus:ring-0 placeholder-gray-300
            ${isTitleFocused ? 'bg-blue-50/30' : 'bg-transparent'}
            transition-colors duration-150
          `}
          placeholder="无标题文档"
          disabled={readOnly}
        />

        {}
        <div className="flex items-center text-sm text-gray-500">
          {}
          {totalCount > 0 && (
            <div className="flex items-center mr-4 bg-gray-50 px-2 py-0.5 rounded-md">
              <span className="material-icons text-gray-400 text-sm mr-1">
                check_circle
              </span>
              <span>
                {completedCount}/{totalCount}
              </span>
            </div>
          )}

          {lastEditTime && (
            <span className="mr-4">
              最后编辑于{' '}
              {lastEditTime.toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              })}
            </span>
          )}

          {}
          {collaborators.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-2 mr-2">
                {collaborators.slice(0, 3).map((user, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-white"
                    style={{ backgroundColor: user.color || '#6366F1' }}
                    title={user.name}
                  >
                    {user.name ? user.name.substring(0, 1).toUpperCase() : '?'}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
              <span>{collaborators.length}人正在协作</span>
            </div>
          )}
        </div>
      </div>

      {}
      <div className="editor-content-with-outline w-full">
        {}
        {showOutline && (
          <DocumentSideOutline
            blocks={blocks}
            onItemClick={handleOutlineItemClick}
            docTitle={title}
          />
        )}

        {}
        <div className="editor-main-content w-full">
          {}

          <div className="blocks-container w-full relative">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                ref={(el) => {
                  if (el) blockRefs.current.set(block.id, el);
                  else blockRefs.current.delete(block.id);
                }}
                data-block-id={block.id}
                data-block-type={block.type}
                className={`
                  rich-text-block-editor-block group relative w-full
                  ${activeBlockId === block.id ? 'active' : ''}
                  ${dragOverIndex === index ? 'border-t-2 border-blue-500' : ''}
                  transition-colors pl-2
                `}
                onFocus={() => handleBlockFocus(block.id)}
                onBlur={handleBlockBlur}
                onKeyDown={(e) => handleKeyDown(e, block.id, index)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                draggable={!readOnly}
                onDragStart={(e) => handleDragStart(e, block.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                {}
                <div
                  className={`
                    absolute left-[-1.75rem] top-0 flex flex-row items-center
                    opacity-0 group-hover:opacity-100 transition-opacity
                    ${activeBlockId === block.id ? 'opacity-100' : ''}
                  `}
                  style={{
                    transform: `translateY(${getControlButtonOffset(
                      block.type
                    )})`,
                  }}
                >
                  {}
                  <button
                    className="block-add-button w-5 h-5 rounded-sm hover:bg-gray-100 flex items-center justify-center"
                    onClick={() => handleAddMenuClick(block.id)}
                    title="添加块"
                  >
                    <span
                      className="material-icons text-gray-400 hover:text-gray-600"
                      style={{ fontSize: '22px' }}
                    >
                      add
                    </span>
                  </button>

                  {}
                  <div
                    className="w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing ml-0"
                    title="拖动调整顺序"
                  >
                    <span
                      className="material-icons text-gray-300 group-hover:text-gray-400"
                      style={{ fontSize: '20px' }}
                    >
                      drag_indicator
                    </span>
                  </div>
                </div>

                {}
                <div className="min-h-[22px] w-full relative">
                  {renderBlockContent(block)}

                  {}
                  {!readOnly && onBlockCommentClick && (
                    <div
                      className="absolute right-0 top-0 h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{}}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onBlockCommentClick(block.id);
                        }}
                        className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        title={
                          getBlockCommentCount &&
                          getBlockCommentCount(block.id) > 0
                            ? `${getBlockCommentCount(block.id)} 条评论`
                            : '添加评论'
                        }
                      >
                        {}
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {}
                {showAddMenuBlockId === block.id &&
                  createPortal(
                    <BlockAddMenu
                      actions={{
                        setType: (t) =>
                          handleBlockTypeChange(block.id, t as any),
                        toggleHighlight: () => {
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id
                                ? {
                                    ...b,
                                    highlightVariant:
                                      b.highlightVariant &&
                                      b.highlightVariant !== 'none'
                                        ? 'none'
                                        : 'note',
                                  }
                                : b
                            )
                          );
                          setShowAddMenuBlockId(null);
                        },
                        openMedia: (tab) => {
                          setMediaDialog({
                            open: true,
                            blockId: block.id,
                            initialTab: tab,
                          });
                          setShowAddMenuBlockId(null);
                        },
                      }}
                      anchorRect={addMenuAnchorRect}
                      onClose={() => setShowAddMenuBlockId(null)}
                    />,

                    document.body
                  )}
              </div>
            ))}

            {}
            {!readOnly && (
              <button
                className="mt-1 w-full py-1.5 px-4 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-center"
                onClick={() => handleAddBlock(blocks.length - 1)}
              >
                <span
                  className="material-icons mr-1"
                  style={{ fontSize: '16px' }}
                >
                  add
                </span>
                添加块
              </button>
            )}
          </div>
        </div>
      </div>

      {}
      <style>
        {`
        .rich-text-block-editor {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .editor-content-with-outline {
          display: flex;
          flex-direction: column;
          flex: 1;
          width: 100%;
        }

        .editor-main-content {
          width: 100%;
          padding: 0;
          transition: padding-left 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .blocks-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 0 2rem;
        }

        [id].rich-text-block-editor-block {
          scroll-margin-top: 80px;
        }

        .rich-text-block-editor-block {
          transition: background-color 0.15s ease;
        }

        .rich-text-block-editor-block:hover {
          background-color: rgba(250, 250, 250, 0.8);
        }

        .rich-text-block-editor-block.active {
          background-color: rgba(245, 247, 250, 0.85);
        }

        .rich-text-block-editor-block[data-block-type="heading-1"] {
          margin-top: 28px;
          margin-bottom: 12px;
        }

        .rich-text-block-editor-block[data-block-type="heading-2"] {
          margin-top: 22px;
          margin-bottom: 10px;
        }

        .rich-text-block-editor-block[data-block-type="heading-3"] {
          margin-top: 18px;
          margin-bottom: 8px;
        }

        .block-add-button {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .rich-text-block-editor-block:hover .block-add-button,
        .rich-text-block-editor-block.active .block-add-button {
          opacity: 1;
        }

        input, [contenteditable] {
          -webkit-appearance: none;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .rich-text-block-editor [contenteditable] {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2329;
          outline: none !important;
        }

        .document-title-area {
          padding-bottom: 16px;
          margin-bottom: 24px;
          border-bottom: 1px solid #eaecef;
        }

        .document-title-area input {
          font-size: 28px;
          font-weight: 600;
          color: #1f2329;
          line-height: 1.4;
        }

        .document-title-area input::placeholder {
          color: #c0c4cc;
          opacity: 0.6;
        }

        .todo-editor-wrapper {
          position: relative;
          transition: all 0.2s ease;
        }

        .todo-checked .rich-text-editor-content {
          text-decoration: line-through;
          color: #6b7280;
          opacity: 0.8;
          transition: all 0.2s ease;
        }

        .todo-checked .rich-text-editor-content * {
          text-decoration: line-through;
          color: #6b7280;
        }

        .todo-editor-wrapper::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 1px;
          background-color: #6b7280;
          transition: width 0.3s ease;
        }

        .todo-checked .rich-text-editor-content::after {
          width: 100%;
        }
        `}
      </style>
      {}
      {!readOnly && mediaDialog.open && (
        <MediaInsertDialog
          onClose={() =>
            setMediaDialog({ open: false, blockId: null, initialTab: 'image' })
          }
          onInsert={handleInsertMedia}
          initialTab={mediaDialog.initialTab}
          tabs={
            mediaDialog.initialTab === 'image'
              ? ['image']
              : mediaDialog.initialTab === 'video'
              ? ['video']
              : mediaDialog.initialTab === 'embed'
              ? ['embed']
              : ['link', 'image', 'video', 'embed']
          }
        />
      )}
    </div>
  );
}
