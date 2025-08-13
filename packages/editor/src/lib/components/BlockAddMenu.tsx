import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildBlockPalette,
  CommandItem,
  PaletteActions } from
'./block-palette';

export interface BlockAddMenuProps {
  actions: PaletteActions;
  anchorRect: DOMRect | null;
  onClose: () => void;
  initialQuery?: string;
}

export function BlockAddMenu({
  actions,
  anchorRect,
  onClose,
  initialQuery
}: BlockAddMenuProps) {
  const [query, setQuery] = useState(initialQuery || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);

  const items = useMemo<CommandItem[]>(
    () => buildBlockPalette(actions),
    [actions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.label}|${it.description || ''}|${(
      it.keywords || []).
      join('|')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const quickItems = useMemo(
    () => filtered.filter((x) => x.isQuick),
    [filtered]
  );
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach((it) => {
      const key = it.category || '其他';
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    });
    return groups;
  }, [filtered]);


  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = filtered[activeIndex];
        if (target) {
          target.action();
          onClose();
        }
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtered, activeIndex, onClose]);

  const style: React.CSSProperties = useMemo(() => {
    if (!anchorRect) return { visibility: 'hidden' };
    const top = anchorRect.top + window.scrollY + 6;
    const left = anchorRect.left + window.scrollX + 28;
    return { top, left } as React.CSSProperties;
  }, [anchorRect]);

  const isSearching = query.trim().length > 0;


  const byId = (id: string) => items.find((x) => x.id === id);




  const baseList = (
  [
  byId('paragraph'),
  byId('heading-1'),
  byId('heading-2'),
  byId('heading-3')].
  filter(Boolean) as CommandItem[]).
  filter(Boolean);


  const getChip = (
  id: string)
  : {bg: string;fg: string;icon?: string;text?: string;} => {
    switch (id) {
      case 'paragraph':
        return { bg: '#F3F4F6', fg: '#374151', text: 'T' };
      case 'heading-1':
        return { bg: '#EEF2FF', fg: '#6366F1', text: 'H1' };
      case 'heading-2':
        return { bg: '#E0E7FF', fg: '#4F46E5', text: 'H2' };
      case 'heading-3':
        return { bg: '#C7D2FE', fg: '#4338CA', text: 'H3' };
      case 'bulleted-list':
        return { bg: '#ECFEFF', fg: '#06B6D4', icon: 'format_list_bulleted' };
      case 'numbered-list':
        return { bg: '#ECFEFF', fg: '#06B6D4', icon: 'format_list_numbered' };
      case 'to-do':
        return { bg: '#EEF2FF', fg: '#6366F1', icon: 'check_box' };
      case 'quote':
        return { bg: '#FFFBEA', fg: '#F59E0B', icon: 'format_quote' };
      case 'code':
        return { bg: '#FAF5FF', fg: '#8B5CF6', icon: 'code' };
      case 'divider':
        return { bg: '#F3F4F6', fg: '#6B7280', icon: 'horizontal_rule' };
      case 'image':
        return { bg: '#FFF7ED', fg: '#F59E0B', icon: 'image' };
      case 'video':
        return { bg: '#F0F9FF', fg: '#0284C7', icon: 'videocam' };
      case 'embed':
        return {
          bg: '#F5F3FF',
          fg: '#7C3AED',
          icon: 'integration_instructions'
        };
      case 'toggle-highlight':
        return { bg: '#FFF7ED', fg: '#EA580C', icon: 'auto_awesome' };
      default:
        return { bg: '#F3F4F6', fg: '#374151', icon: 'widgets' };
    }
  };

  const renderItemRow = (it: CommandItem) => {
    const chip = getChip(it.id);
    return (
      <button
        key={it.id}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50"
        onClick={() => {
          it.action();
          onClose();
        }}>
        
        <span
          className="w-5 h-5 rounded-sm flex items-center justify-center"
          style={{ backgroundColor: chip.bg, color: chip.fg }}>
          
          {chip.text ?
          <span className="text-[10px] font-semibold leading-none">
              {chip.text}
            </span> :

          <span className="material-icons text-[16px]">{chip.icon}</span>
          }
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="text-[13px] text-gray-800 truncate">{it.label}</div>
          {it.description &&
          <div className="text-[12px] text-gray-500 truncate">
              {it.description}
            </div>
          }
        </div>
      </button>);

  };

  return (
    <div
      ref={containerRef}
      className="fixed z-[1000] w-[240px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
      style={style}
      role="menu"
      aria-label="插入块"
      onMouseEnter={() => {
        if (hoverCloseTimerRef.current) {
          window.clearTimeout(hoverCloseTimerRef.current);
          hoverCloseTimerRef.current = null;
        }
      }}
      onMouseLeave={() => {
        if (hoverCloseTimerRef.current)
        window.clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = window.setTimeout(() => {
          onClose();
        }, 50);
      }}>
      
      {}
      <div className="px-3 py-2 border-b border-gray-100">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索或输入..."
          className="w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
        
      </div>

      {}
      {isSearching ?

      <div className="max-h-[340px] overflow-y-auto py-1">
          {filtered.map((it) => {
          const indexInFiltered = filtered.indexOf(it);
          const active = indexInFiltered === activeIndex;
          return (
            <button
              key={it.id}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 ${
              active ? 'bg-gray-50' : ''}`
              }
              onMouseEnter={() => setActiveIndex(indexInFiltered)}
              onClick={() => {
                it.action();
                onClose();
              }}
              role="menuitem">
              
                {it.icon &&
              <span className="material-icons text-[18px] text-gray-600">
                    {it.icon}
                  </span>
              }
                <div className="flex-1 overflow-hidden">
                  <div className="text-[13px] font-medium truncate">
                    {it.label}
                  </div>
                  {it.description &&
                <div className="text-[12px] text-gray-500 truncate">
                      {it.description}
                    </div>
                }
                </div>
              </button>);

        })}
        </div> :

      <div className="max-h-[360px] overflow-y-auto">
          {}
          <div className="px-3 pt-2 text-[12px] text-gray-400">基础</div>
          {}
          {}
          <div className="py-1">{baseList.map((it) => renderItemRow(it))}</div>

          {}
          {(['列表', '结构', '媒体', '样式'] as const).map((cat) => {
          const list = grouped[cat] || [];
          if (!list.length) return null;
          return (
            <div key={cat} className="py-1">
                <div className="px-3 pt-2 pb-1 text-[12px] text-gray-400">
                  {cat}
                </div>
                {list.map((it) => renderItemRow(it))}
              </div>);

        })}
        </div>
      }
    </div>);

}