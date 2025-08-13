import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import CursorPositionManager from '../utils/cursorPositionManager';

interface UseYjsCursorSyncOptions {
  ydoc: Y.Doc;
  ytext?: Y.Text;
  yarray?: Y.Array<any>;
  awareness: any;
  contentEditableRef: React.RefObject<HTMLElement>;
  blockId?: string;
  userInfo: {
    name: string;
    color: string;
    id?: string | number;
    avatar?: string;
    email?: string;
  };
  debug?: boolean;
}

export function useYjsCursorSync({
  ydoc,
  ytext,
  yarray,
  awareness,
  contentEditableRef,
  blockId,
  userInfo,
  debug = false
}: UseYjsCursorSyncOptions) {
  const lastRelativePositionRef = useRef<Y.RelativePosition | null>(null);
  const isComposingRef = useRef(false);
  const isLocalInputRef = useRef(false);

  const log = (...args: any[]) => {
    if (debug) {
      
    }
  };


  const getYText = () => {
    if (ytext) return ytext;
    if (yarray && blockId) {

      const blockIndex = yarray.toArray().findIndex((block: any) => block.id === blockId);
      if (blockIndex >= 0) {
        const block = yarray.get(blockIndex);
        if (block && block.content) {


          return ydoc.getText(`block-${blockId}-content`);
        }
      }
    }
    return null;
  };


  useEffect(() => {
    if (!contentEditableRef.current) return;

    const ytextForBlock = getYText();
    if (!ytextForBlock) {
      return;
    }

    const manager = new CursorPositionManager(ydoc, ytextForBlock, awareness);

    const handleSelectionChange = () => {
      if (!contentEditableRef.current) return;
      if (isComposingRef.current) return;


      isLocalInputRef.current = true;

      const pos = manager.createPositionFromSelection(contentEditableRef.current);
      if (pos) {
        lastRelativePositionRef.current = pos.relativePosition;


        const currentState = awareness.getLocalState() || {};
        awareness.setLocalState({
          ...currentState,
          cursor: {
            relativePosition: pos.relativePosition,
            blockId: blockId,
            timestamp: Date.now()
          }
        });
      }


      setTimeout(() => {
        isLocalInputRef.current = false;
      }, 100);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [ydoc, awareness, contentEditableRef, blockId, userInfo, debug]);


  useEffect(() => {
    if (!contentEditableRef.current) return;

    const ytextForBlock = getYText();
    if (!ytextForBlock) return;

    const manager = new CursorPositionManager(ydoc, ytextForBlock, awareness);

    const restoreCursor = () => {
      if (!contentEditableRef.current) return;
      if (!lastRelativePositionRef.current) return;
      if (!isLocalInputRef.current) return;

      requestAnimationFrame(() => {
        try {
          const success = manager.restorePositionFromRelativePosition(
            lastRelativePositionRef.current!,
            contentEditableRef.current!
          );

          if (success) {
          } else {
          }
        } catch (error) {
        }
      });
    };

    const observer = (event: Y.YTextEvent) => {

      if (lastRelativePositionRef.current && isLocalInputRef.current) {
        restoreCursor();
      }
    };

    ytextForBlock.observe(observer);
    return () => {
      ytextForBlock.unobserve(observer);
    };
  }, [ydoc, awareness, contentEditableRef, blockId, debug]);


  useEffect(() => {
    const el = contentEditableRef.current;
    if (!el) return;

    const handleCompositionStart = () => {
      isComposingRef.current = true;

    };

    const handleCompositionEnd = () => {
      isComposingRef.current = false;
 
    };

    el.addEventListener('compositionstart', handleCompositionStart);
    el.addEventListener('compositionend', handleCompositionEnd);

    return () => {
      el.removeEventListener('compositionstart', handleCompositionStart);
      el.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, [contentEditableRef, debug]);


  const cleanup = () => {

    lastRelativePositionRef.current = null;
    isComposingRef.current = false;
    isLocalInputRef.current = false;
  };

  return { cleanup };
}