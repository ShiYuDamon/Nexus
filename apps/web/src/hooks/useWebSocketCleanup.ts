import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';







export function useWebSocketCleanup(
cleanupFn: () => void,
deps: React.DependencyList = [],
debug: boolean = false)
{
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = useRef(location.pathname);
  const cleanupFnRef = useRef(cleanupFn);


  useEffect(() => {
    cleanupFnRef.current = cleanupFn;
  }, [cleanupFn, ...deps]);


  useEffect(() => {

    if (location.pathname !== currentPath.current) {
      if (debug) {
        
      }

      try {
        cleanupFnRef.current();

        if (debug) {
          
        }
      } catch (error) {
        
      }


      currentPath.current = location.pathname;
    }
  }, [location.pathname, debug]);


  const navigateWithCleanup = useCallback((to: string, options?: any) => {
    if (debug) {
      
    }

    try {
      cleanupFnRef.current();

      if (debug) {
        
      }
    } catch (error) {
      
    }


    navigate(to, options);
  }, [navigate, debug]);

  return navigateWithCleanup;
}