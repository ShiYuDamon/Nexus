






export function getTextPosition(
container: HTMLElement,
node: Node,
offset: number)
: number {
  const treeWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let position = 0;
  let currentNode = treeWalker.nextNode();


  while (currentNode) {
    if (currentNode === node) {
      position += offset;
      break;
    }


    position += currentNode.textContent?.length || 0;
    currentNode = treeWalker.nextNode();
  }

  return position;
}




export function findNodeAtPosition(
container: HTMLElement,
targetPosition: number)
: {node: Node | null;offset: number;} {
  if (targetPosition < 0) {
    return { node: null, offset: 0 };
  }

  const treeWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let position = 0;
  let currentNode = treeWalker.nextNode();


  while (currentNode) {
    const nodeLength = currentNode.textContent?.length || 0;


    if (position + nodeLength >= targetPosition) {
      return {
        node: currentNode,
        offset: targetPosition - position
      };
    }


    position += nodeLength;
    currentNode = treeWalker.nextNode();
  }


  const lastNode = treeWalker.lastChild() as Node;
  return {
    node: lastNode,
    offset: lastNode?.textContent?.length || 0
  };
}




export function createSelectionFromPositions(
container: HTMLElement,
start: number,
end: number)
: Range | null {
  const startInfo = findNodeAtPosition(container, start);
  const endInfo = findNodeAtPosition(container, end);

  if (!startInfo.node || !endInfo.node) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startInfo.node, startInfo.offset);
  range.setEnd(endInfo.node, endInfo.offset);

  return range;
}




export function calculateSelectionRects(range: Range): DOMRect[] {
  const rects: DOMRect[] = [];

  const clientRects = range.getClientRects();
  for (let i = 0; i < clientRects.length; i++) {
    rects.push(clientRects[i]);
  }

  return rects;
}




export function throttle<T extends (...args: any[]) => any>(
func: T,
delay: number)
: (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}