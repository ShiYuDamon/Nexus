


const portalRefs: Record<string, number> = {};




const lastLoggedCount: Record<string, number> = {};







export function getOrCreatePortalContainer(
id: string = 'editor-portal',
zIndex: number = 9999)
: HTMLElement {
  let container = document.getElementById(id);


  portalRefs[id] = (portalRefs[id] || 0) + 1;


  const shouldLog =
  !container ||
  portalRefs[id] % 5 === 0 ||
  portalRefs[id] === 1 ||
  (lastLoggedCount[id] || 0) !== portalRefs[id];

  if (!container) {
    if (shouldLog) {
      
      lastLoggedCount[id] = portalRefs[id];
    }
    container = document.createElement('div');
    container.id = id;

    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = zIndex.toString();
    container.style.overflow = 'visible';
    container.style.maxWidth = 'none';
    container.style.maxHeight = 'none';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.transform = 'none';
    container.setAttribute('aria-hidden', 'true');
    document.body.appendChild(container);
  } else if (shouldLog) {
    
    lastLoggedCount[id] = portalRefs[id];
  }

  return container;
}





export function removePortalContainer(id: string = 'editor-portal'): void {

  if (portalRefs[id]) {
    portalRefs[id] -= 1;
  }


  const shouldLog =
  portalRefs[id] === 0 ||
  portalRefs[id] % 5 === 0 ||
  (lastLoggedCount[id] || 0) !== portalRefs[id];


  if (portalRefs[id] <= 0) {
    const container = document.getElementById(id);
    if (container && document.body.contains(container)) {
      
      document.body.removeChild(container);
      delete portalRefs[id];
      delete lastLoggedCount[id];
    }
  } else if (shouldLog) {
    
    lastLoggedCount[id] = portalRefs[id];
  }
}