import { useState, useEffect, useCallback } from 'react';

interface ResponsiveLayoutConfig {



  showSidebar: boolean;



  sidebarWidth?: number;
}

interface ResponsiveLayoutResult {



  documentContainerStyle: React.CSSProperties;



  documentContainerClassName: string;



  sidebarWidth: number;



  screenSize: 'sm' | 'md' | 'lg' | 'xl';



  isSmallScreen: boolean;



  dynamicSpacing: number;



  availableSpace: number;
}





export function useResponsiveLayout({
  showSidebar,
  sidebarWidth: customSidebarWidth
}: ResponsiveLayoutConfig): ResponsiveLayoutResult {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [dynamicSpacing, setDynamicSpacing] = useState(0);
  const [availableSpace, setAvailableSpace] = useState(0);


  const sidebarWidth = customSidebarWidth || (
  windowWidth < 640 ? 280 :
  windowWidth < 768 ? 300 :
  windowWidth < 1024 ? 320 : 320);



  const calculateDynamicSpacing = useCallback(() => {
    if (!showSidebar) {
      setDynamicSpacing(0);
      setAvailableSpace(0);
      return;
    }

    try {

      const documentContainer = document.querySelector('.collaborative-rich-text-document-editor') ||
      document.querySelector('.Nexus-editor') ||
      document.querySelector('#rich-text-editor-container') ||
      document.querySelector('.rich-text-block-editor');

      if (!documentContainer) {
        
        setDynamicSpacing(18);
        setAvailableSpace(0);
        return;
      }


      const containerRect = documentContainer.getBoundingClientRect();
      const viewportWidth = window.innerWidth;


      const containerRightEdge = containerRect.right;
      const availableSpaceValue = viewportWidth - containerRightEdge;


      const sidebarRightMargin = 12;
      const actualSidebarWidth = sidebarWidth + sidebarRightMargin;


      const idealSpacing = 16;
      const minSpacing = 8;
      const maxSpacing = 32;

      let finalSpacing;

      if (availableSpaceValue < actualSidebarWidth + idealSpacing) {

        const shortage = actualSidebarWidth + idealSpacing - availableSpaceValue;
        finalSpacing = Math.min(shortage + minSpacing, maxSpacing);
      } else {

        finalSpacing = idealSpacing;
      }

      const requiredAdjustment = finalSpacing;

      setDynamicSpacing(Math.max(requiredAdjustment, minSpacing));
      setAvailableSpace(availableSpaceValue);

    } catch (error) {
      
      setDynamicSpacing(18);
      setAvailableSpace(0);
    }
  }, [showSidebar, sidebarWidth]);


  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };


    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleResize();

        setTimeout(calculateDynamicSpacing, 100);
      }, 100);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [calculateDynamicSpacing]);


  useEffect(() => {

    const timer = setTimeout(calculateDynamicSpacing, 50);
    return () => clearTimeout(timer);
  }, [showSidebar, calculateDynamicSpacing]);


  const screenSize: 'sm' | 'md' | 'lg' | 'xl' =
  windowWidth < 640 ? 'sm' :
  windowWidth < 768 ? 'md' :
  windowWidth < 1024 ? 'lg' : 'xl';

  const isSmallScreen = windowWidth < 1024;


  const documentContainerStyle: React.CSSProperties = showSidebar ? {

    paddingRight: `${dynamicSpacing}px`,
    maxWidth: `calc(100vw - ${sidebarWidth + dynamicSpacing}px)`,
    transition: 'all 0.3s ease-in-out',

    boxSizing: 'border-box'
  } : {
    paddingRight: 0,
    maxWidth: '100%',
    transition: 'all 0.3s ease-in-out',
    boxSizing: 'border-box'
  };


  const documentContainerClassName = 'transition-all duration-300';

  return {
    documentContainerStyle,
    documentContainerClassName,
    sidebarWidth,
    screenSize,
    isSmallScreen,
    dynamicSpacing,
    availableSpace
  };
}