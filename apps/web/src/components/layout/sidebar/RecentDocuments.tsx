import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DocumentService } from '../../../services/document.service';


interface DocumentWithWorkspace {
  id: string;
  title: string;
  workspaceId: string;
  updatedAt: string;
  createdAt: string;
  workspace?: {
    id: string;
    name: string;
  };
}


type DocumentGroup = {
  label: string;
  documents: DocumentWithWorkspace[];
};




export function RecentDocuments() {
  const [documents, setDocuments] = useState<DocumentWithWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [groupedDocs, setGroupedDocs] = useState<DocumentGroup[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    '收藏': true,
    '今天': true,
    '昨天': true,
    '本周': false,
    '更早': false
  });


  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        setLoading(true);
        const response = await DocumentService.getRecent(10);
        setDocuments(response.items);


        const storedFavorites = localStorage.getItem('favoriteDocuments');
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    };

    fetchRecentDocuments();
  }, []);


  useEffect(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = new Date(today - 86400000).getTime();
    const thisWeek = new Date(today - 6 * 86400000).getTime();


    const favoriteDocs = documents.filter((doc) => favorites.includes(doc.id));


    const todayDocs = documents.filter((doc) => {
      const updatedAt = new Date(doc.updatedAt).getTime();
      return updatedAt >= today;
    });

    const yesterdayDocs = documents.filter((doc) => {
      const updatedAt = new Date(doc.updatedAt).getTime();
      return updatedAt >= yesterday && updatedAt < today;
    });

    const thisWeekDocs = documents.filter((doc) => {
      const updatedAt = new Date(doc.updatedAt).getTime();
      return updatedAt >= thisWeek && updatedAt < yesterday;
    });

    const earlierDocs = documents.filter((doc) => {
      const updatedAt = new Date(doc.updatedAt).getTime();
      return updatedAt < thisWeek;
    });


    const groups: DocumentGroup[] = [];

    if (favoriteDocs.length > 0) {
      groups.push({ label: '收藏', documents: favoriteDocs });
    }

    if (todayDocs.length > 0) {
      groups.push({ label: '今天', documents: todayDocs });
    }

    if (yesterdayDocs.length > 0) {
      groups.push({ label: '昨天', documents: yesterdayDocs });
    }

    if (thisWeekDocs.length > 0) {
      groups.push({ label: '本周', documents: thisWeekDocs });
    }

    if (earlierDocs.length > 0) {
      groups.push({ label: '更早', documents: earlierDocs });
    }

    setGroupedDocs(groups);
  }, [documents, favorites]);


  const toggleFavorite = (docId: string) => {
    let newFavorites: string[];

    if (favorites.includes(docId)) {
      newFavorites = favorites.filter((id) => id !== docId);
    } else {
      newFavorites = [...favorites, docId];
    }

    setFavorites(newFavorites);
    localStorage.setItem('favoriteDocuments', JSON.stringify(newFavorites));
  };


  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };


  const toggleGroupExpanded = (groupLabel: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };


  const getDocumentIcon = (title: string) => {

    const hash = title.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const hue = Math.abs(hash % 360);
    const saturation = 80 + hash % 20;
    const lightness = 55 + hash % 10;

    return (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium flex-shrink-0 shadow-sm"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, ${saturation}%, ${lightness}%), hsl(${(hue + 40) % 360}, ${saturation}%, ${lightness - 10}%))`
        }}>
        
        {title.charAt(0).toUpperCase()}
      </div>);

  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">最近访问</h3>
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors duration-150"
            onClick={toggleExpanded}
            aria-label={isExpanded ? '收起' : '展开'}>
            
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) =>
          <div key={i} className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="ml-3 flex-1">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-100 rounded w-1/2 mt-1"></div>
              </div>
            </div>
          )}
        </div>
      </div>);

  }

  if (documents.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">最近访问</h3>
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors duration-150"
            onClick={toggleExpanded}
            aria-label={isExpanded ? '收起' : '展开'}>
            
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {isExpanded &&
        <p className="text-sm text-gray-500 py-2">暂无最近文档</p>
        }
      </div>);

  }

  return (
    <div className="px-4 py-2 mb-1">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">最近访问</h3>
        <button
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors duration-150"
          onClick={toggleExpanded}
          aria-label={isExpanded ? '收起' : '展开'}>
          
          <svg className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isExpanded &&
      <div className="space-y-2">
          {groupedDocs.map((group) =>
        <div key={group.label} className="space-y-2">
              <div
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => toggleGroupExpanded(group.label)}>
            
                <h4 className="text-xs text-gray-400 font-medium ml-1">{group.label}</h4>
                <button className="p-0.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <svg
                className={`w-3.5 h-3.5 transform transition-transform duration-200 ${expandedGroups[group.label] ? 'rotate-0' : '-rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {expandedGroups[group.label] &&
          <ul className="space-y-2">
                  {group.documents.map((doc) =>
            <li key={doc.id} className="group">
                      <div className="flex items-center p-1 rounded-lg hover:bg-gray-100/80 transition-colors duration-150">
                        <Link
                  to={`/workspaces/${doc.workspaceId}/documents/${doc.id}/edit`}
                  className="flex items-center flex-1 min-w-0">
                  
                          {getDocumentIcon(doc.title || '无标题')}

                          <div className="ml-3 overflow-hidden flex-1">
                            <div className="truncate text-sm font-medium text-gray-700">
                              {doc.title || '无标题文档'}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {doc.workspace?.name || '未知工作区'}
                            </div>
                          </div>
                        </Link>

                        <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(doc.id);
                  }}
                  className={`
                            p-1.5 rounded-md transition-all duration-150
                            ${favorites.includes(doc.id) ?
                  'text-amber-500 hover:bg-amber-50' :
                  'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100'}
                          `}>
                  
                          {favorites.includes(doc.id) ?
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg> :

                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                  }
                        </button>
                      </div>
                    </li>
            )}
                </ul>
          }
            </div>
        )}
        </div>
      }
    </div>);

}