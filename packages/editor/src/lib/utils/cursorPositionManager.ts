import * as Y from 'yjs';

export interface CursorPosition {
  relativePosition: Y.RelativePosition;
  blockId?: string;
  timestamp: number;
}

export class CursorPositionManager {
  private ydoc: Y.Doc;
  private ytext: Y.Text;
  private awareness: any;

  constructor(ydoc: Y.Doc, ytext: Y.Text, awareness: any) {
    this.ydoc = ydoc;
    this.ytext = ytext;
    this.awareness = awareness;
  }


  createPositionFromSelection(editorElement: HTMLElement): CursorPosition | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!editorElement.contains(range.commonAncestorContainer)) return null;

    const index = this.getTextIndexFromRange(editorElement, range);

    const relativePosition = Y.createRelativePositionFromTypeIndex(this.ytext, index);

    const blockId = this.getBlockIdFromRange(range);
    return {
      relativePosition,
      blockId,
      timestamp: Date.now()
    };
  }


  restorePositionFromRelativePosition(
  relativePosition: Y.RelativePosition,
  editorElement: HTMLElement)
  : boolean {
    try {
      const absolutePosition = Y.createAbsolutePositionFromRelativePosition(
        relativePosition,
        this.ydoc
      );
      if (!absolutePosition) return false;
      const range = this.createRangeFromPosition(editorElement, absolutePosition.index);
      if (!range) return false;
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
      return false;
    } catch (error) {
      
      return false;
    }
  }


  updateAwarenessPosition(position: CursorPosition, userData: any) {
    if (!this.awareness) return;
    const currentState = this.awareness.getLocalState() || {};
    this.awareness.setLocalState({
      ...currentState,
      ...userData,
      cursor: position
    });
  }


  handleRemotePositionChange(remotePosition: CursorPosition, userId: string) {

  }

  private getTextIndexFromRange(editorElement: HTMLElement, range: Range): number {
    const preRange = document.createRange();
    preRange.selectNodeContents(editorElement);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  }

  private getBlockIdFromRange(range: Range): string | undefined {
    let node: Node | null = range.startContainer;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const blockId = element.getAttribute('data-block-id');
      if (blockId) return blockId;
      node = node.parentNode;
    }
    return undefined;
  }

  private createRangeFromPosition(editorElement: HTMLElement, index: number): Range | null {
    let currentIndex = 0;
    const walker = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null
    );
    let node = walker.nextNode();
    while (node) {
      const nodeLength = node.textContent?.length || 0;
      if (currentIndex + nodeLength >= index) {
        const range = document.createRange();
        const offset = index - currentIndex;
        range.setStart(node, offset);
        range.setEnd(node, offset);
        return range;
      }
      currentIndex += nodeLength;
      node = walker.nextNode();
    }
    return null;
  }
}

export default CursorPositionManager;