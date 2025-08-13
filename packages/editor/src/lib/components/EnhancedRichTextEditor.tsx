import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useLayoutEffect,
  useMemo } from
'react';
import ReactDOM from 'react-dom';
import {
  RichTextEditor,
  RichTextEditorRef,
  RichTextEditorProps } from
'./RichTextEditor';
import { FloatingToolbar } from './FloatingToolbar';
import {
  getOrCreatePortalContainer,
  removePortalContainer } from
'../utils/portal';

export interface EnhancedRichTextEditorProps extends RichTextEditorProps {
  containerClassName?: string;

  blockId?: string;
  onBlockTypeChange?: (
  blockId: string,
  newType:
  'paragraph' |
  'heading-1' |
  'heading-2' |
  'heading-3' |
  'bulleted-list' |
  'numbered-list' |
  'to-do' |
  'quote' |
  'code')
  => void;

  externalBlockType?:
  'paragraph' |
  'heading-1' |
  'heading-2' |
  'heading-3' |
  'bulleted-list' |
  'numbered-list' |
  'to-do' |
  'quote' |
  'code';
}

export interface EnhancedRichTextEditorRef extends RichTextEditorRef {}


const SHARED_PORTAL_ID = 'rich-text-editor-portal';
const PORTAL_Z_INDEX = 9999;


let portalContainerInstance: HTMLElement | null = null;
let portalRefCount = 0;


function getSharedPortalContainer(): HTMLElement {
  if (!portalContainerInstance) {
    portalContainerInstance = getOrCreatePortalContainer(
      SHARED_PORTAL_ID,
      PORTAL_Z_INDEX
    );
  } else {

    portalRefCount++;
  }
  return portalContainerInstance;
}


function releaseSharedPortalContainer(): void {
  if (portalRefCount > 0) {
    portalRefCount--;
  }

  if (portalRefCount === 0 && portalContainerInstance) {
    removePortalContainer(SHARED_PORTAL_ID);
    portalContainerInstance = null;
  }
}

export const EnhancedRichTextEditor = forwardRef<
  EnhancedRichTextEditorRef,
  EnhancedRichTextEditorProps>(

  (
  {
    initialValue = '',
    onChange,
    placeholder = '开始编辑...',
    className = '',
    containerClassName = '',
    debug = false,
    lineHeight = 1.6,
    readOnly = false,
    blockId,
    onBlockTypeChange,
    externalBlockType
  },
  ref) =>
  {
    const editorRef = useRef<RichTextEditorRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selection, setSelection] = useState<Range | null>(null);
    const [toolbarPosition, setToolbarPosition] = useState<{
      top: number;
      left: number;
    } | null>(null);
    const [showToolbar, setShowToolbar] = useState<boolean>(false);
    const portalRoot = useRef<HTMLElement | null>(null);
    const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);
    const isUpdatingToolbarRef = useRef<boolean>(false);
    const toolbarElementRef = useRef<HTMLElement | null>(null);
    const [selectionFontColor, setSelectionFontColor] = useState<
      string | undefined>(
      undefined);
    const [selectionBgColor, setSelectionBgColor] = useState<
      string | undefined>(
      undefined);
    const [currentBlockType, setCurrentBlockType] = useState<string>('正文');
    const [currentTextAlign, setCurrentTextAlign] = useState<string>('左对齐');

    useEffect(() => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail as {blockId?: string;};
        if (!detail || !detail.blockId) return;
        if (!blockId || detail.blockId !== blockId) return;
        try {

        } catch {}
      };
      window.addEventListener(
        'nexus-toggle-highlight',
        handler as EventListener
      );
      return () =>
      window.removeEventListener(
        'nexus-toggle-highlight',
        handler as EventListener
      );
    }, [blockId]);


    const THROTTLE_DELAY = 50;


    const log = useCallback((..._args: unknown[]) => {}, []);


    useEffect(() => {
      try {

        portalRoot.current = getSharedPortalContainer();
      } catch (error) {
        
      }

      return () => {
        try {

          releaseSharedPortalContainer();
          portalRoot.current = null;
        } catch (error) {
          
        }
      };
    }, [log]);


    const updateToolbar = useCallback(() => {
      if (readOnly) {
        setShowToolbar(false);
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setShowToolbar(false);
        return;
      }

      const range = selection.getRangeAt(0);


      if (
      containerRef.current &&
      !containerRef.current.contains(range.commonAncestorContainer))
      {
        setShowToolbar(false);
        return;
      }


      if (range.collapsed) {
        setShowToolbar(false);
        return;
      }


      const rect = range.getBoundingClientRect();
      if (!rect || rect.width === 0) {

        setShowToolbar(false);
        return;
      }


      const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (
      window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (
      window.innerWidth || document.documentElement.clientWidth);

      if (!isInViewport) {
       

        return;
      }


      const newPosition = {
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      };


      setSelection(() => range);
      setToolbarPosition(() => newPosition);
      setShowToolbar(true);


      let fontColor: string | undefined = undefined;
      let bgColor: string | undefined = undefined;
      if (range && range.startContainer) {
        let node = range.startContainer;

        if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          node = node.parentElement;
        }
        if (node instanceof HTMLElement) {
          const style = window.getComputedStyle(node);
          fontColor = style.color;
          bgColor = style.backgroundColor;
        }
      }
      setSelectionFontColor(fontColor);
      setSelectionBgColor(bgColor);


      let blockType = ((): string => {
        switch (
        externalBlockType as
        'paragraph' |
        'heading-1' |
        'heading-2' |
        'heading-3' |
        'bulleted-list' |
        'numbered-list' |
        'to-do' |
        'quote' |
        'code' |
        undefined) {

          case 'paragraph':
            return '正文';
          case 'heading-1':
            return '标题1';
          case 'heading-2':
            return '标题2';
          case 'heading-3':
            return '标题3';
          case 'bulleted-list':
            return '无序列表';
          case 'numbered-list':
            return '有序列表';
          case 'quote':
            return '引用';
          case 'code':
            return '代码';
          case 'to-do':
            return '代办';
          default:
            return '正文';
        }
      })();
      let textAlign = '左对齐';
      if (range && range.startContainer) {
        let node = range.startContainer as Node | null;
        if (node && node.nodeType === Node.TEXT_NODE) {
          node = node.parentElement as Node | null;
        }


        if (!externalBlockType) {
          try {
            if (document.queryCommandState('insertOrderedList')) {
              blockType = '有序列表';
            } else if (document.queryCommandState('insertUnorderedList')) {
              blockType = '无序列表';
            }
          } catch {}
          if (node instanceof HTMLElement && blockType === '正文') {
            const tag = node.closest('h1,h2,h3,p,blockquote,pre');
            if (tag) {
              switch (tag.tagName) {
                case 'H1':
                  blockType = '标题1';
                  break;
                case 'H2':
                  blockType = '标题2';
                  break;
                case 'H3':
                  blockType = '标题3';
                  break;
                case 'BLOCKQUOTE':
                  blockType = '引用';
                  break;
                case 'PRE':
                  blockType = '代码';
                  break;
              }
            }
          }
        }


        if (node instanceof HTMLElement) {
          const tag = node.closest(
            'h1,h2,h3,h4,h5,h6,p,div,li,blockquote,pre'
          ) as HTMLElement | null;
          if (tag) {
            const align = window.getComputedStyle(tag).textAlign;
            switch (align) {
              case 'center':
                textAlign = '居中';
                break;
              case 'right':
                textAlign = '右对齐';
                break;
              case 'justify':
                textAlign = '两端对齐';
                break;
              default:
                textAlign = '左对齐';
            }
          }
        }
      }

      const allowed = new Set([
      '正文',
      '标题1',
      '标题2',
      '标题3',
      '有序列表',
      '无序列表',
      '代办',
      '引用',
      '代码']
      );
      setCurrentBlockType(allowed.has(blockType) ? blockType : '');
      setCurrentTextAlign(textAlign);

    }, [readOnly, log]);


    useLayoutEffect(() => {
      if (!showToolbar || !toolbarPosition || !portalRoot.current) return;
      if (!toolbarElementRef.current) return;
      const toolbar = toolbarElementRef.current;
      const toolbarRect = toolbar.getBoundingClientRect();
      const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
      const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
      let left = toolbarPosition.left;

      let transform = 'translateX(-50%) translateY(-100%) translateY(-10px)';

      const selectionTop = toolbarPosition.top - window.scrollY;
      const needBelow = selectionTop - toolbarRect.height - 12 < 8;
      if (needBelow) {
        transform = 'translateX(-50%) translateY(10px)';

        const projectedBottom = selectionTop + 10 + toolbarRect.height;
        if (projectedBottom > viewportHeight - 8) {
          transform = 'translateX(-50%) translateY(-100%) translateY(-10px)';
        }
      }

      if (left - toolbarRect.width / 2 < 8) {
        left = 8 + toolbarRect.width / 2;

      }

      if (left + toolbarRect.width / 2 > viewportWidth - 8) {
        left = viewportWidth - 8 - toolbarRect.width / 2;

      }

      if (left - toolbarRect.width / 2 < 0) {
        left = toolbarRect.width / 2;

      }
      if (left + toolbarRect.width / 2 > viewportWidth) {
        left = viewportWidth - toolbarRect.width / 2;

      }
      toolbar.style.left = `${left}px`;
      toolbar.style.transform = transform;
    }, [showToolbar, toolbarPosition]);


    useEffect(() => {
      let lastSelectionText = '';

      const handleSelectionChange = () => {

        const selection = window.getSelection();
        const currentSelectionText = selection ? selection.toString() : '';


        if (
        currentSelectionText === lastSelectionText &&
        showToolbar &&
        currentSelectionText.length > 0)
        {
          return;
        }


        lastSelectionText = currentSelectionText;


        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }

        selectionTimeoutRef.current = setTimeout(() => {

          if (currentSelectionText === '' && !showToolbar) {
            return;
          }
          updateToolbar();
        }, 100);
      };

      document.addEventListener('selectionchange', handleSelectionChange);


      document.addEventListener('mouseup', handleSelectionChange);

      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        document.removeEventListener('mouseup', handleSelectionChange);

        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
      };
    }, [updateToolbar, showToolbar]);


    useEffect(() => {
      if (!selection) return;


      const marker = document.createElement('div');
      marker.style.position = 'fixed';
      marker.style.width = '5px';
      marker.style.height = '5px';

      const rect = selection.getBoundingClientRect();
      marker.style.top = `${rect.top}px`;
      marker.style.left = `${rect.left}px`;
      marker.style.pointerEvents = 'none';
      marker.style.opacity = '0';
      marker.style.zIndex = '-1';
      marker.setAttribute('data-purpose', 'selection-visibility-marker');
      document.body.appendChild(marker);


      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {

            if (!showToolbar) {
              updateToolbar();
            }
          } else {

            setShowToolbar(false);
          }
        },
        {
          threshold: 0.05,
          rootMargin: '20px'
        }
      );


      observer.observe(marker);


      const cleanup = () => {
        observer.disconnect();
        if (document.body.contains(marker)) {
          document.body.removeChild(marker);
        }
      };


      let scrollTimeout: NodeJS.Timeout | null = null;
      const handleScrollEnd = () => {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {

          if (selection) {
            const newRect = selection.getBoundingClientRect();
            marker.style.top = `${newRect.top}px`;
            marker.style.left = `${newRect.left}px`;
          }
        }, 100);
      };

      window.addEventListener('scroll', handleScrollEnd, { passive: true });

      return () => {
        cleanup();
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        window.removeEventListener('scroll', handleScrollEnd);
      };
    }, [selection, showToolbar, updateToolbar, log]);


    const updateToolbarPositionOptimized = useCallback(() => {

      const now = performance.now();
      if (now - lastUpdateTimeRef.current < THROTTLE_DELAY) {
        return;
      }


      if (isUpdatingToolbarRef.current) {
        return;
      }

      isUpdatingToolbarRef.current = true;

      try {

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          setShowToolbar(false);
          return;
        }

        const range = selection.getRangeAt(0);


        if (
        range.collapsed ||
        !containerRef.current?.contains(range.commonAncestorContainer))
        {
          setShowToolbar(false);
          return;
        }


        const rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0) {
          setShowToolbar(false);
          return;
        }


        const newPosition = {
          top: rect.top + window.scrollY,
          left: rect.left + rect.width / 2 + window.scrollX
        };


        if (portalRoot.current) {
          const toolbarElement = portalRoot.current.querySelector(
            '.toolbar-container'
          ) as HTMLElement;
          if (toolbarElement) {
            toolbarElement.style.top = `${newPosition.top}px`;
            toolbarElement.style.left = `${newPosition.left}px`;
            toolbarElementRef.current = toolbarElement;
          }
        }


        setToolbarPosition(newPosition);

        lastUpdateTimeRef.current = now;
      } finally {
        isUpdatingToolbarRef.current = false;
      }
    }, []);


    useEffect(() => {

      if (!selection) return;

      const handleScroll = () => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {

          if (showToolbar) {
            updateToolbarPositionOptimized();
          } else {


            updateToolbar();
          }
          rafIdRef.current = null;
        });
      };


      window.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: true });


      window.addEventListener('resize', handleScroll, { passive: true });


      if (showToolbar) {
        updateToolbarPositionOptimized();
      }


      const intervalId = setInterval(() => {
        if (document.hasFocus()) {
          if (showToolbar) {
            updateToolbarPositionOptimized();
          } else {

            updateToolbar();
          }
        }
      }, 300);

      return () => {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
        clearInterval(intervalId);
      };
    }, [showToolbar, selection, updateToolbarPositionOptimized, updateToolbar]);


    useEffect(() => {
      if (!containerRef.current) return;

      const handleMouseUp = () => {

        setTimeout(updateToolbar, 10);
      };

      containerRef.current.addEventListener('mouseup', handleMouseUp);
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('mouseup', handleMouseUp);
        }
      };
    }, [updateToolbar, log]);


    const handleFormat = useCallback(
      (command: string, value?: string) => {
        if (!editorRef.current) return;


        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && containerRef.current) {
          try {

            document.execCommand(command, false, value);


            if (editorRef.current.getContent) {
              const content = editorRef.current.getContent();
              if (onChange) {
                onChange(content);
              }
            }
          } catch (e) {
            
          }
        }
      },
      [onChange]
    );


    const handleMediaInsert = useCallback(
      (type: 'link' | 'image' | 'video' | 'embed') => {
        if (!editorRef.current) return;

        let value = '';

        switch (type) {
          case 'link':
            value = prompt('请输入链接URL:', 'https://') || '';
            if (value) {
              const text = window.getSelection()?.toString() || '链接文本';
              document.execCommand(
                'insertHTML',
                false,
                `<a href="${value}" target="_blank">${text}</a>`
              );
            }
            break;
          case 'image':
            value = prompt('请输入图片URL:', 'https://') || '';
            if (value) {
              document.execCommand(
                'insertHTML',
                false,
                `<img src="${value}" alt="图片" style="max-width: 100%;" />`
              );
            }
            break;
          case 'video':
            value = prompt('请输入视频URL:', 'https://') || '';
            if (value) {
              document.execCommand(
                'insertHTML',
                false,
                `<div class="video-embed"><iframe src="${value}" frameborder="0" allowfullscreen></iframe></div>`
              );
            }
            break;
          case 'embed':
            value = prompt('请输入嵌入代码:') || '';
            if (value) {
              document.execCommand('insertHTML', false, value);
            }
            break;
        }


        if (editorRef.current.getContent) {
          const content = editorRef.current.getContent();
          if (onChange) {
            onChange(content);
          }
        }
      },
      [onChange]
    );


    const toolbarComponent = useMemo(() => {
      const forceShow = (window as any).__nexusLinkModalOpen === true;
      if (!portalRoot.current) {
        return null;
      }
      if (!showToolbar && !forceShow || !toolbarPosition) {
        return null;
      }

      return ReactDOM.createPortal(
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none"
          style={{ position: 'fixed', overflow: 'visible' }}>
          
          <div
            className="absolute pointer-events-auto will-change-transform toolbar-container"
            style={{
              position: 'fixed',
              top: `${toolbarPosition.top}px`,
              left: `${toolbarPosition.left}px`,
              transform: 'translateX(-50%) translateY(-100%) translateY(-10px)',
              transition: 'top 0.1s ease-out, left 0.1s ease-out',
              zIndex: 9999,
              maxWidth: 'calc(100vw - 20px)',
              boxSizing: 'border-box'
            }}>
            
            <FloatingToolbar
              position={toolbarPosition}
              onFormat={handleFormat}
              selection={selection ?? {} as Range}
              onMediaInsert={handleMediaInsert}
              selectionFontColor={selectionFontColor}
              selectionBgColor={selectionBgColor}
              currentBlockType={currentBlockType}
              currentTextAlign={currentTextAlign}
              blockId={blockId}
              onBlockTypeChange={onBlockTypeChange} />
            
          </div>
        </div>,
        portalRoot.current
      );
    }, [
    showToolbar,
    toolbarPosition,
    selection,
    handleFormat,
    handleMediaInsert,
    selectionFontColor,
    selectionBgColor,
    currentBlockType,
    currentTextAlign]
    );

    return (
      <div
        ref={containerRef}
        className={`relative ${containerClassName}`}
        onMouseUp={() => {
        }}>
        
        <RichTextEditor
          ref={(el) => {
            if (el) {

              if (ref) {
                if (typeof ref === 'function') {
                  ref(el);
                } else {
                  ref.current = el;
                }
              }

              editorRef.current = el;
            }
          }}
          initialValue={initialValue}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
          debug={debug}
          lineHeight={lineHeight}
          readOnly={readOnly} />
        

        {}
        {toolbarComponent}
      </div>);

  }
);

EnhancedRichTextEditor.displayName = 'EnhancedRichTextEditor';