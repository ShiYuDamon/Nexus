import React, { useState, useEffect, useRef, memo } from 'react';

interface FloatingToolbarProps {
  position: {top: number;left: number;};
  onFormat: (command: string, value?: string) => void;
  selection: Range;
  onMediaInsert: (type: 'link' | 'image' | 'video' | 'embed') => void;
  selectionFontColor?: string;
  selectionBgColor?: string;
  currentBlockType?: string;
  currentTextAlign?: string;

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
  'quote' |
  'code')
  => void;
}


const LinkInputPopover = ({
  isOpen,
  onClose,
  onConfirm




}: {isOpen: boolean;onClose: () => void;onConfirm: (url: string) => void;}) => {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConfirm(url.trim());
      setUrl('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isValid = url.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-[520px] max-w-[92vw]"
      onClick={(e) => e.stopPropagation()}>
      
      <div className="flex items-center gap-4">
        <input
          ref={inputRef}
          id="link-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="粘贴或输入链接"
          className="flex-1 h-10 px-4 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        
        <button
          type="submit"
          disabled={!isValid}
          className={`h-10 px-5 text-sm font-medium rounded-md text-white transition-colors ${
          isValid ?
          'bg-blue-600 hover:bg-blue-700' :
          'bg-gray-300 cursor-not-allowed'}`
          }>
          
          确认
        </button>
      </div>
    </form>);

};


export const FloatingToolbar = memo(
  function FloatingToolbar({
    position,
    onFormat,
    selection,
    onMediaInsert,
    selectionFontColor,
    selectionBgColor,
    currentBlockType,
    currentTextAlign,
    blockId,
    onBlockTypeChange
  }: FloatingToolbarProps) {
    const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
    const [showAlignDropdown, setShowAlignDropdown] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const linkPopoverRef = useRef<HTMLDivElement>(null);
    const savedSelectionRef = useRef<Range | null>(null);

    useEffect(() => {
      try {
        if (selection && selection.cloneRange) {
          savedSelectionRef.current = selection.cloneRange();
        }
      } catch {}
    }, [selection]);
    const headingDropdownRef = useRef<HTMLDivElement>(null);
    const alignDropdownRef = useRef<HTMLDivElement>(null);


    const headingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const alignTimerRef = useRef<NodeJS.Timeout | null>(null);


    useEffect(() => {

      if (!document.querySelector('link[href*="material-icons"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
        document.head.appendChild(link);
      }
    }, []);


    useEffect(() => {
      return () => {
        if (headingTimerRef.current) clearTimeout(headingTimerRef.current);
        if (alignTimerRef.current) clearTimeout(alignTimerRef.current);
      };
    }, []);


    useEffect(() => {

      if (showLinkModal) {
        return;
      }


      if (!showHeadingDropdown && !showAlignDropdown) {
        return;
      }

      const handleClickOutside = (event: MouseEvent) => {

        if (
        showHeadingDropdown &&
        headingDropdownRef.current &&
        !headingDropdownRef.current.contains(event.target as Node))
        {
          setShowHeadingDropdown(false);
        }


        if (
        showAlignDropdown &&
        alignDropdownRef.current &&
        !alignDropdownRef.current.contains(event.target as Node))
        {
          setShowAlignDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showHeadingDropdown, showAlignDropdown, showLinkModal]);


    useEffect(() => {

      if (showLinkModal) {

      }
    }, [showLinkModal]);


    useEffect(() => {
      if (!showLinkModal) return;


      const html = document.documentElement as HTMLElement;
      const body = document.body as HTMLElement;
      const scrollContainer = document.getElementById(
        'document-scroll-container'
      );

      const prevHtmlOverflow = html.style.overflow;
      const prevBodyOverflow = body.style.overflow;
      const prevHtmlPaddingRight = html.style.paddingRight;
      const prevBodyPaddingRight = body.style.paddingRight;
      const prevScrollContainerOverflow = scrollContainer?.style.overflow;

      const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      if (scrollContainer) scrollContainer.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        html.style.paddingRight = `${scrollbarWidth}px`;
        body.style.paddingRight = `${scrollbarWidth}px`;
      }

      const prevent = (e: Event) => e.preventDefault();
      const preventKey = (e: KeyboardEvent) => {
        const keys = [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
        'Spacebar'];

        if (keys.includes(e.key)) e.preventDefault();
      };
      window.addEventListener('wheel', prevent, { passive: false });
      window.addEventListener('touchmove', prevent, { passive: false });
      window.addEventListener('keydown', preventKey, { passive: false });


      const handleOutside = (ev: MouseEvent) => {
        const target = ev.target as Node;
        if (
        linkPopoverRef.current &&
        !linkPopoverRef.current.contains(target))
        {
          (window as any).__nexusLinkModalOpen = false;
          setShowLinkModal(false);
        }
      };
      document.addEventListener('mousedown', handleOutside);

      return () => {
        html.style.overflow = prevHtmlOverflow;
        body.style.overflow = prevBodyOverflow;
        html.style.paddingRight = prevHtmlPaddingRight;
        body.style.paddingRight = prevBodyPaddingRight;
        if (scrollContainer && prevScrollContainerOverflow !== undefined) {
          scrollContainer.style.overflow = prevScrollContainerOverflow;
        }
        window.removeEventListener('wheel', prevent as EventListener);
        window.removeEventListener('touchmove', prevent as EventListener);
        window.removeEventListener('keydown', preventKey as EventListener);
        document.removeEventListener('mousedown', handleOutside);
      };
    }, [showLinkModal]);


    const applyHeadingFormat = (tag: string) => {

      if (
      typeof (blockId as any) === 'string' &&
      typeof (onBlockTypeChange as any) === 'function')
      {
        const id = blockId as string;
        const map: Record<
          string,
          FloatingToolbarProps['onBlockTypeChange'] extends ((
          ...args: any[])
          => any) ?
          Parameters<FloatingToolbarProps['onBlockTypeChange']>[1] :
          any> =
        {
          p: 'paragraph',
          h1: 'heading-1',
          h2: 'heading-2',
          h3: 'heading-3',
          blockquote: 'quote',
          pre: 'code'
        } as any;
        const newType = (map as any)[tag] || 'paragraph';
        (onBlockTypeChange as any)(id, newType);
        setShowHeadingDropdown(false);
        return;
      }

      const sel = window.getSelection();
      if (sel) {
        try {
          sel.removeAllRanges();
          if (savedSelectionRef.current) {
            sel.addRange(savedSelectionRef.current);
          }
          const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
          if (range) {
            let node: Node | null = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            const element = (node as Element | null)?.closest?.(
              'h1,h2,h3,h4,h5,h6,p,div,li,blockquote,pre'
            ) as HTMLElement | null;
            if (element) {
              const blockRange = document.createRange();
              blockRange.selectNodeContents(element);
              sel.removeAllRanges();
              sel.addRange(blockRange);
            }
          }
        } catch {}
      }
      onFormat('formatBlock', `<${tag}>`);
      setShowHeadingDropdown(false);
    };


    const applyListFormat = (
    command: 'insertUnorderedList' | 'insertOrderedList') =>
    {

      if (
      typeof (blockId as any) === 'string' &&
      typeof (onBlockTypeChange as any) === 'function')
      {
        const id = blockId as string;
        const newType =
        command === 'insertUnorderedList' ? 'bulleted-list' : 'numbered-list';
        (onBlockTypeChange as any)(id, newType);
        setShowHeadingDropdown(false);
        return;
      }
      const sel = window.getSelection();
      if (sel) {
        try {
          sel.removeAllRanges();
          if (savedSelectionRef.current) {
            sel.addRange(savedSelectionRef.current);
          }
          const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
          if (range) {
            let node: Node | null = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            const element = (node as Element | null)?.closest?.(
              'h1,h2,h3,h4,h5,h6,p,div,li,blockquote,pre'
            ) as HTMLElement | null;
            if (element) {
              const blockRange = document.createRange();
              blockRange.selectNodeContents(element);
              sel.removeAllRanges();
              sel.addRange(blockRange);
            }
          }
        } catch {}
      }
      onFormat(command);
      setShowHeadingDropdown(false);
    };


    const handleLinkInsert = (url: string) => {

      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        if (savedSelectionRef.current) {
          sel.addRange(savedSelectionRef.current);
        }
      }

      document.execCommand('createLink', false, url);
    };


    const applyAlignFormat = (command: string) => {

      const sel = window.getSelection();
      if (sel) {
        try {
          sel.removeAllRanges();
          if (savedSelectionRef.current) {
            sel.addRange(savedSelectionRef.current);
          }
        } catch {}
      }
      onFormat(command);
      setShowAlignDropdown(false);
    };


    const handleHeadingMouseEnter = () => {
      if (headingTimerRef.current) clearTimeout(headingTimerRef.current);
      if (alignTimerRef.current) clearTimeout(alignTimerRef.current);
      if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
      setShowHeadingDropdown(true);
      setShowAlignDropdown(false);
      setShowColorDropdown(false);
    };


    const handleHeadingMouseLeave = () => {
      headingTimerRef.current = setTimeout(() => {
        setShowHeadingDropdown(false);
      }, 300);
    };


    const handleAlignMouseEnter = () => {
      if (alignTimerRef.current) clearTimeout(alignTimerRef.current);
      if (headingTimerRef.current) clearTimeout(headingTimerRef.current);
      if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
      setShowAlignDropdown(true);
      setShowHeadingDropdown(false);
      setShowColorDropdown(false);
    };


    const handleAlignMouseLeave = () => {
      alignTimerRef.current = setTimeout(() => {
        setShowAlignDropdown(false);
      }, 300);
    };


    useEffect(() => {
      setShowHeadingDropdown(false);
      setShowAlignDropdown(false);

    }, [position.top, position.left]);


    const [showColorDropdown, setShowColorDropdown] = useState(false);
    const [textColor, setTextColor] = useState('');
    const [bgColor, setBgColor] = useState('');
    const colorPalette = [
    '#1f2329',
    '#e53935',
    '#fb8c00',
    '#fdd835',
    '#43a047',
    '#1e88e5',
    '#3949ab',
    '#8e24aa',
    '#d81b60',
    '#00897b',
    '#c0c4cc',
    '#f5f5f5',
    '#ffd600',
    '#00bcd4',
    '#ffb300',
    '#ff7043',
    '#bdbdbd',
    '#757575',
    '#607d8b',
    '#ffeb3b',
    '#4caf50',
    '#2196f3',
    '#9c27b0',
    '#f44336'];


    const backgroundPalette = [
    'transparent',
    '#fdeaea',
    '#fff4e6',
    '#fffbe6',
    '#eafbea',
    '#e6f4ff',
    '#f0e6ff',
    '#f5f5f5',
    '#ffd6d6',
    '#ffe7ba',
    '#fff9c4',
    '#c8e6c9',
    '#b3e5fc',
    '#e1bee7'];



    const colorNameMap: Record<string, string> = {
      '#1f2329': '黑色',
      '#e53935': '红色',
      '#fb8c00': '橙色',
      '#fdd835': '黄色',
      '#43a047': '绿色',
      '#1e88e5': '蓝色',
      '#3949ab': '靛蓝',
      '#8e24aa': '紫色',
      '#d81b60': '玫红',
      '#00897b': '青色',
      '#c0c4cc': '灰色',
      '#f5f5f5': '浅灰',
      '#ffd600': '亮黄',
      '#00bcd4': '天蓝',
      '#ffb300': '金色',
      '#ff7043': '珊瑚',
      '#bdbdbd': '银灰',
      '#757575': '深灰',
      '#607d8b': '蓝灰',
      '#ffeb3b': '柠檬黄',
      '#4caf50': '草绿',
      '#2196f3': '亮蓝',
      '#9c27b0': '深紫',
      '#f44336': '亮红',
      transparent: '透明',
      '#fdeaea': '淡粉',
      '#fff4e6': '米色',
      '#fffbe6': '奶黄',
      '#eafbea': '薄荷',
      '#e6f4ff': '淡蓝',
      '#f0e6ff': '淡紫',
      '#ffd6d6': '浅红',
      '#ffe7ba': '浅橙',
      '#fff9c4': '浅黄',
      '#c8e6c9': '浅绿',
      '#b3e5fc': '浅天蓝',
      '#e1bee7': '浅紫'
    };

    const colorDropdownRef = useRef<HTMLDivElement>(null);
    const colorTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleColorMouseEnter = () => {
      if (colorTimerRef.current) clearTimeout(colorTimerRef.current);
      if (headingTimerRef.current) clearTimeout(headingTimerRef.current);
      if (alignTimerRef.current) clearTimeout(alignTimerRef.current);
      setShowColorDropdown(true);
      setShowHeadingDropdown(false);
      setShowAlignDropdown(false);
    };
    const handleColorMouseLeave = () => {
      colorTimerRef.current = setTimeout(() => {
        setShowColorDropdown(false);
      }, 300);
    };


    const buttonBaseClass =
    'h-9 w-9 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700';
    const iconBaseStyle = { fontSize: '20px' };

    return (
      <>
        {}
        {!showLinkModal &&
        <div
          ref={toolbarRef}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex items-center transition-all duration-100 transform opacity-100 z-[1000] animate-toolbarFadeIn shadow-toolbar"
          style={{ willChange: 'transform' }}>
          
            {}
            <button
            className={buttonBaseClass}
            onClick={() => onFormat('bold')}
            title="加粗">
            
              <span className="material-icons text-base" style={iconBaseStyle}>
                format_bold
              </span>
            </button>
            <button
            className={buttonBaseClass}
            onClick={() => onFormat('italic')}
            title="斜体">
            
              <span className="material-icons text-base" style={iconBaseStyle}>
                format_italic
              </span>
            </button>
            <button
            className={buttonBaseClass}
            onClick={() => onFormat('underline')}
            title="下划线">
            
              <span className="material-icons text-base" style={iconBaseStyle}>
                format_underlined
              </span>
            </button>
            <button
            className={buttonBaseClass}
            onClick={() => onFormat('strikeThrough')}
            title="删除线">
            
              <span className="material-icons text-base" style={iconBaseStyle}>
                strikethrough_s
              </span>
            </button>
            {}
            <div
            className="relative group"
            onMouseEnter={handleColorMouseEnter}
            onMouseLeave={handleColorMouseLeave}>
            
              <button
              className={`p-1.5 rounded flex items-center ${
              showColorDropdown ?
              'bg-blue-100 text-blue-600' :
              'hover:bg-gray-100 text-gray-700'}`
              }
              onClick={() => {
                setShowColorDropdown(!showColorDropdown);
                setShowHeadingDropdown(false);
                setShowAlignDropdown(false);
              }}
              title="颜色"
              type="button"
              style={{
                color: textColor || undefined,
                fontWeight: 'bold'
              }}>
              
                <span
                className="material-icons text-base"
                style={{
                  ...iconBaseStyle,
                  color: selectionFontColor || undefined,
                  backgroundColor: selectionBgColor || undefined,
                  padding: selectionBgColor ? '2px 4px' : undefined,
                  borderRadius: selectionBgColor ? '2px' : undefined
                }}>
                
                  format_color_text
                </span>
                <span
                className="material-icons text-base ml-0.5"
                style={iconBaseStyle}>
                
                  arrow_drop_down
                </span>
              </button>
              {showColorDropdown &&
            <div
              className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-3 z-10 w-72 animate-dropdownFadeIn flex flex-col"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
              
                  <div className="px-4 pb-1 text-xs font-semibold text-gray-500">
                    字体颜色
                  </div>
                  <div className="grid grid-cols-7 gap-2 px-4 pb-3">
                    {colorPalette.slice(0, 7).map((color) =>
                <button
                  key={color}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  textColor === color ?
                  'border-blue-500 ring-2 ring-blue-200' :
                  'border-gray-200 hover:border-blue-400'}`
                  }
                  style={{ backgroundColor: '#fff' }}
                  onClick={() => {
                    onFormat('foreColor', color);
                    setShowColorDropdown(false);
                    setTextColor(color);
                  }}
                  title={colorNameMap[color] || color}
                  aria-label={colorNameMap[color] || color}>
                  
                        <span
                    style={{
                      color,
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                    
                          A
                        </span>
                      </button>
                )}
                  </div>
                  <div className="px-4 pb-1 text-xs font-semibold text-gray-500">
                    背景颜色
                  </div>
                  <div className="grid grid-cols-7 gap-2 px-4 pb-1">
                    {backgroundPalette.slice(0, 7).map((color, idx) =>
                <button
                  key={color}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  bgColor === color ?
                  'border-blue-500 ring-2 ring-blue-200' :
                  'border-gray-200 hover:border-blue-400'}`
                  }
                  style={{
                    backgroundColor:
                    color === 'transparent' ? '#fff' : color
                  }}
                  onClick={() => {
                    onFormat(
                      'hiliteColor',
                      color === 'transparent' ? 'transparent' : color
                    );
                    setShowColorDropdown(false);
                    setBgColor(color);
                  }}
                  title={colorNameMap[color] || color}
                  aria-label={colorNameMap[color] || color}>
                  
                        {color === 'transparent' ?

                  <svg width="16" height="16" viewBox="0 0 16 16">
                            <rect width="16" height="16" fill="#eee" />
                            <rect width="8" height="8" fill="#fff" />
                            <rect
                      x="8"
                      y="8"
                      width="8"
                      height="8"
                      fill="#fff" />
                    
                            <rect
                      x="2"
                      y="2"
                      width="12"
                      height="12"
                      rx="3"
                      stroke="#e5e7eb"
                      strokeWidth="1.2" />
                    
                            <path
                      d="M4 12L12 4"
                      stroke="#bdbdbd"
                      strokeWidth="1.2" />
                    
                          </svg> :

                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none">
                    
                            <rect
                      x="2"
                      y="2"
                      width="12"
                      height="12"
                      rx="3"
                      fill="white" />
                    
                            <rect
                      x="2"
                      y="2"
                      width="12"
                      height="12"
                      rx="3"
                      stroke="#e5e7eb"
                      strokeWidth="1.2" />
                    
                            <path
                      d="M4 12L12 4"
                      stroke="#bdbdbd"
                      strokeWidth="1.2" />
                    
                          </svg>
                  }
                      </button>
                )}
                  </div>
                  <div className="grid grid-cols-7 gap-2 px-4 pb-3">
                    {backgroundPalette.slice(7, 14).map((color) =>
                <button
                  key={color}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  bgColor === color ?
                  'border-blue-500 ring-2 ring-blue-200' :
                  'border-gray-200 hover:border-blue-400'}`
                  }
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onFormat('hiliteColor', color);
                    setShowColorDropdown(false);
                    setBgColor(color);
                  }}
                  title={colorNameMap[color] || color}
                  aria-label={colorNameMap[color] || color}>
                  
                        <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none">
                    
                          <rect
                      x="2"
                      y="2"
                      width="12"
                      height="12"
                      rx="3"
                      fill="white" />
                    
                          <rect
                      x="2"
                      y="2"
                      width="12"
                      height="12"
                      rx="3"
                      stroke="#e5e7eb"
                      strokeWidth="1.2" />
                    
                          <path
                      d="M4 12L12 4"
                      stroke="#bdbdbd"
                      strokeWidth="1.2" />
                    
                        </svg>
                      </button>
                )}
                  </div>
                  <button
                className="mx-4 mt-1 mb-2 py-1.5 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 font-medium transition"
                onClick={() => {
                  onFormat('foreColor', '#1f2329');
                  onFormat('hiliteColor', 'transparent');
                  setTextColor('');
                  setBgColor('');
                  setShowColorDropdown(false);
                }}>
                
                    恢复默认
                  </button>
                </div>
            }
            </div>

            <div className="h-5 border-r border-gray-200 mx-1.5"></div>

            {}
            <div
            className="relative group"
            ref={headingDropdownRef}
            onMouseEnter={handleHeadingMouseEnter}
            onMouseLeave={handleHeadingMouseLeave}>
            
              <button
              className={`p-1.5 rounded flex items-center ${
              showHeadingDropdown ?
              'bg-blue-100 text-blue-600' :
              'hover:bg-gray-100 text-gray-700'}`
              }
              onClick={() => setShowHeadingDropdown(!showHeadingDropdown)}
              title="标题">
              
                <span
                className="material-icons text-base"
                style={iconBaseStyle}>
                
                  title
                </span>
                <span
                className="material-icons text-base ml-0.5"
                style={iconBaseStyle}>
                
                  arrow_drop_down
                </span>
              </button>
              {showHeadingDropdown &&
            <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 w-44 animate-dropdownFadeIn">
                  {}
                  {[
              { label: '正文', tag: 'p' } as const,
              { label: '标题1', tag: 'h1' } as const,
              { label: '标题2', tag: 'h2' } as const,
              { label: '标题3', tag: 'h3' } as const].
              map((item) => {
                const isActive = currentBlockType === item.label;
                const className = `w-full text-left px-3 py-1.5 text-sm flex items-center hover:bg-blue-50 ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold' : ''}`;

                const iconName =
                item.tag === 'p' ?
                'text_format' :
                item.tag === 'h1' ?
                'looks_one' :
                item.tag === 'h2' ?
                'looks_two' :
                'looks_3';
                return (
                  <button
                    key={item.label}
                    className={className}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHeadingFormat(item.tag)}>
                    
                        <span
                      className="material-icons text-sm mr-2"
                      style={iconBaseStyle}>
                      
                          {iconName}
                        </span>
                        {item.label}
                        {isActive &&
                    <span className="material-icons text-sm ml-auto text-blue-600">
                            done
                          </span>
                    }
                      </button>);

              })}
                  <div className="my-1 border-t border-gray-100" />
                  {}
                  {[
              {
                label: '无序列表',
                list: 'insertUnorderedList' as const
              } as const,
              {
                label: '有序列表',
                list: 'insertOrderedList' as const
              } as const].
              map((item) => {
                const isActive = currentBlockType === item.label;
                const className = `w-full text-left px-3 py-1.5 text-sm flex items-center hover:bg-blue-50 ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold' : ''}`;

                const iconName =
                item.list === 'insertUnorderedList' ?
                'format_list_bulleted' :
                'format_list_numbered';
                return (
                  <button
                    key={item.label}
                    className={className}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyListFormat(item.list)}>
                    
                        <span
                      className="material-icons text-sm mr-2"
                      style={iconBaseStyle}>
                      
                          {iconName}
                        </span>
                        {item.label}
                        {isActive &&
                    <span className="material-icons text-sm ml-auto text-blue-600">
                            done
                          </span>
                    }
                      </button>);

              })}
                  <div className="my-1 border-t border-gray-100" />
                  {}
                  {[
              { label: '代办', custom: 'to-do' as const } as const,
              { label: '引用', tag: 'blockquote' } as const,
              { label: '代码', tag: 'pre' } as const].
              map((item) => {
                const isActive = currentBlockType === item.label;
                const className = `w-full text-left px-3 py-1.5 text-sm flex items-center hover:bg-blue-50 ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold' : ''}`;

                const iconName =
                'custom' in item ?
                'check_box' :
                item.tag === 'blockquote' ?
                'format_quote' :
                'code';
                const handleClick = () => {
                  if ('custom' in item) {
                    if (
                    typeof (onBlockTypeChange as any) === 'function' &&
                    typeof (blockId as any) === 'string')
                    {
                      (onBlockTypeChange as any)(
                        blockId as string,
                        'to-do'
                      );
                      setShowHeadingDropdown(false);
                      return;
                    }
                  } else if ('tag' in item) {
                    applyHeadingFormat(item.tag);
                  }
                };
                return (
                  <button
                    key={item.label}
                    className={className}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleClick}>
                    
                        <span
                      className="material-icons text-sm mr-2"
                      style={iconBaseStyle}>
                      
                          {iconName}
                        </span>
                        {item.label}
                        {isActive &&
                    <span className="material-icons text-sm ml-auto text-blue-600">
                            done
                          </span>
                    }
                      </button>);

              })}
                </div>
            }
            </div>
            {}
            <div
            className="relative group"
            ref={alignDropdownRef}
            onMouseEnter={handleAlignMouseEnter}
            onMouseLeave={handleAlignMouseLeave}>
            
              <button
              className={`p-1.5 rounded flex items-center ${
              showAlignDropdown ?
              'bg-blue-100 text-blue-600' :
              'hover:bg-gray-100 text-gray-700'}`
              }
              onClick={() => setShowAlignDropdown(!showAlignDropdown)}
              title="对齐">
              
                <span
                className="material-icons text-base"
                style={iconBaseStyle}>
                
                  format_align_left
                </span>
                <span
                className="material-icons text-base ml-0.5"
                style={iconBaseStyle}>
                
                  arrow_drop_down
                </span>
              </button>
              {showAlignDropdown &&
            <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 w-32 animate-dropdownFadeIn">
                  {[
              {
                label: '左对齐',
                command: 'justifyLeft',
                icon: 'format_align_left'
              },
              {
                label: '居中',
                command: 'justifyCenter',
                icon: 'format_align_center'
              },
              {
                label: '右对齐',
                command: 'justifyRight',
                icon: 'format_align_right'
              },
              {
                label: '两端对齐',
                command: 'justifyFull',
                icon: 'format_align_justify'
              }].
              map((item) =>
              <button
                key={item.label}
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center hover:bg-blue-50 ${
                currentTextAlign === item.label ?
                'bg-blue-50 text-blue-600 font-bold' :
                ''}`
                }
                onClick={() => applyAlignFormat(item.command)}>
                
                      <span
                  className="material-icons text-sm mr-2"
                  style={iconBaseStyle}>
                  
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
              )}
                </div>
            }
            </div>

            <div className="h-5 border-r border-gray-200 mx-1.5"></div>

            {}
            {typeof (blockId as any) === 'string' &&
          <button
            className={buttonBaseClass}
            onClick={() => {
              const event = new CustomEvent('nexus-toggle-highlight', {
                detail: { blockId }
              });
              window.dispatchEvent(event);
            }}
            title="切换高亮">
            
                <span
              className="material-icons text-base"
              style={{ color: '#111827' }}>
              
                  auto_awesome
                </span>
              </button>
          }

            {}
            <button
            className={buttonBaseClass}
            onMouseDown={(e) => {

              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (window as any).__nexusLinkModalOpen = true;

              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                try {
                  savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
                } catch {}
              }
              setTimeout(() => {
                setShowLinkModal(true);
              }, 0);
            }}
            title="插入链接">
            
              <span className="material-icons text-base" style={iconBaseStyle}>
                insert_link
              </span>
            </button>

            <div className="h-5 border-r border-gray-200 mx-1.5"></div>

          </div>
        }

        {}
        {showLinkModal &&
        <div ref={linkPopoverRef} className="pointer-events-auto">
            <LinkInputPopover
            isOpen={true}
            onClose={() => {
              (window as any).__nexusLinkModalOpen = false;
              setShowLinkModal(false);
            }}
            onConfirm={(url) => {
              (window as any).__nexusLinkModalOpen = false;
              handleLinkInsert(url);
              setShowLinkModal(false);
            }} />
          
          </div>
        }
      </>);

  },
  (prevProps, nextProps) => {

    return (
      prevProps.selection === nextProps.selection &&
      prevProps.onFormat === nextProps.onFormat &&
      prevProps.onMediaInsert === nextProps.onMediaInsert &&
      Math.abs(prevProps.position.top - nextProps.position.top) < 2 &&
      Math.abs(prevProps.position.left - nextProps.position.left) < 2);

  }
);