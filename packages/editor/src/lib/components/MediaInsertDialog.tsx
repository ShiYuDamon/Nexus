import React, { useState, useRef, useEffect, useMemo } from 'react';


const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

export interface MediaInsertDialogProps {
  onClose: () => void;
  onInsert: (
  mediaType: string,
  content: string,
  attributes?: Record<string, string>)
  => void;
  initialTab?: 'link' | 'image' | 'video' | 'embed';
  tabs?: Array<'link' | 'image' | 'video' | 'embed'>;
}

export function MediaInsertDialog({
  onClose,
  onInsert,
  initialTab = 'link',
  tabs
}: MediaInsertDialogProps) {
  const allowedTabs = useMemo<('link' | 'image' | 'video' | 'embed')[]>(
    () => tabs && tabs.length ? tabs : ['link', 'image', 'video', 'embed'],
    [tabs]
  );
  const initialActive = useMemo<'link' | 'image' | 'video' | 'embed'>(
    () => allowedTabs.includes(initialTab) ? initialTab : allowedTabs[0],
    [allowedTabs, initialTab]
  );
  const [activeTab, setActiveTab] = useState<
    'link' | 'image' | 'video' | 'embed'>(
    initialActive);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);


  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(true);


  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState('');
  const [imageHeight, setImageHeight] = useState('');
  const [imagePreviewError, setImagePreviewError] = useState(false);


  const [videoUrl, setVideoUrl] = useState('');
  const [videoWidth, setVideoWidth] = useState('640');
  const [videoHeight, setVideoHeight] = useState('360');
  const [videoAutoplay, setVideoAutoplay] = useState(false);


  const [embedCode, setEmbedCode] = useState('');


  const scrollPositionRef = useRef({ x: 0, y: 0 });


  useEffect(() => {

    scrollPositionRef.current = {
      x: window.scrollX,
      y: window.scrollY
    };


    document.documentElement.style.setProperty(
      '--scroll-y',
      `${window.scrollY}px`
    );


    const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;


    document.body.style.top = `-${window.scrollY}px`;
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.paddingRight = `${scrollbarWidth}px`;


    return () => {

      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';


      window.scrollTo(scrollPositionRef.current.x, scrollPositionRef.current.y);


      requestAnimationFrame(() => {

        if (window.scrollY !== scrollPositionRef.current.y) {
          window.scrollTo(
            scrollPositionRef.current.x,
            scrollPositionRef.current.y
          );
        }
      });
    };
  }, []);


  useEffect(() => {
    setImagePreviewError(false);
  }, [imageUrl]);


  const handleImagePreviewError = () => {
    setImagePreviewError(true);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      switch (activeTab) {
        case 'link':
          if (!linkUrl) {
            setError('请输入链接URL');
            return;
          }

          const linkAttributes: Record<string, string> = {
            href: linkUrl
          };

          if (linkTitle) {
            linkAttributes.title = linkTitle;
          }

          if (linkOpenInNewTab) {
            linkAttributes.target = '_blank';
            linkAttributes.rel = 'noopener noreferrer';
          }

          onInsert('link', linkText || linkUrl, linkAttributes);
          break;

        case 'image':
          if (!imageUrl) {
            setError('请输入图片URL');
            return;
          }

          const imageAttributes: Record<string, string> = {
            src: imageUrl,
            alt: imageAlt || ''
          };

          if (imageWidth) imageAttributes.width = imageWidth;
          if (imageHeight) imageAttributes.height = imageHeight;

          onInsert('image', '', imageAttributes);
          break;

        case 'video':
          if (!videoUrl) {
            setError('请输入视频URL');
            return;
          }


          const youtubeMatch = videoUrl.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
          );
          const bilibiliMatch = videoUrl.match(
            /(?:bilibili\.com\/video\/)([\w-]+)/
          );

          if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;
            const iframeAttributes: Record<string, string> = {
              src: embedUrl,
              width: videoWidth || '640',
              height: videoHeight || '360',
              frameborder: '0',
              allowfullscreen: 'true'
            };

            if (videoAutoplay) {
              iframeAttributes.src += '?autoplay=1';
            }

            onInsert('iframe', '', iframeAttributes);
          } else if (bilibiliMatch) {
            const videoId = bilibiliMatch[1];
            const embedUrl = `https://player.bilibili.com/player.html?bvid=${videoId}`;
            const iframeAttributes: Record<string, string> = {
              src: embedUrl,
              width: videoWidth || '640',
              height: videoHeight || '360',
              frameborder: '0',
              allowfullscreen: 'true'
            };

            onInsert('iframe', '', iframeAttributes);
          } else {

            const videoAttributes: Record<string, string> = {
              src: videoUrl,
              width: videoWidth || '640',
              height: videoHeight || '360',
              controls: 'true'
            };

            if (videoAutoplay) {
              videoAttributes.autoplay = 'true';
              videoAttributes.muted = 'true';
            }

            onInsert('video', '', videoAttributes);
          }
          break;

        case 'embed':
          if (!embedCode) {
            setError('请输入嵌入代码');
            return;
          }


          onInsert('html', embedCode);
          break;
      }


      scrollPositionRef.current = {
        x: window.scrollX,
        y: parseInt(
          document.documentElement.style.getPropertyValue('--scroll-y') || '0',
          10
        )
      };

      onClose();
    } catch (err) {
      setError('插入媒体失败，请重试');
      
    }
  };




  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };


  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };


  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-100 media-dialog-backdrop"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog">
      
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden media-dialog-content"
        onClick={handleDialogClick}>
        
        <div className="flex justify-between items-center border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-medium">插入媒体</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="关闭">
            
            <span className="material-icons">close</span>
          </button>
        </div>

        {allowedTabs.length > 1 &&
        <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {allowedTabs.includes('link') &&
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'link' ?
              'border-blue-500 text-blue-600' :
              'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }
              onClick={() => setActiveTab('link')}>
              
                  <span className="material-icons text-sm mr-1">
                    insert_link
                  </span>
                  链接
                </button>
            }
              {allowedTabs.includes('image') &&
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'image' ?
              'border-blue-500 text-blue-600' :
              'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }
              onClick={() => setActiveTab('image')}>
              
                  <span className="material-icons text-sm mr-1">image</span>
                  图片
                </button>
            }
              {allowedTabs.includes('video') &&
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'video' ?
              'border-blue-500 text-blue-600' :
              'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }
              onClick={() => setActiveTab('video')}>
              
                  <span className="material-icons text-sm mr-1">videocam</span>
                  视频
                </button>
            }
              {allowedTabs.includes('embed') &&
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'embed' ?
              'border-blue-500 text-blue-600' :
              'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
              }
              onClick={() => setActiveTab('embed')}>
              
                  <span className="material-icons text-sm mr-1">code</span>
                  嵌入
                </button>
            }
            </nav>
          </div>
        }

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {error &&
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">
              {error}
            </div>
          }

          <form onSubmit={handleSubmit}>
            {activeTab === 'link' &&
            <div className="space-y-3">
                <div>
                  <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="link-url">
                  
                    链接URL
                  </label>
                  <input
                  id="link-url"
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  linkUrl && !isValidUrl(linkUrl) ?
                  'border-red-300' :
                  'border-gray-300'}`
                  }
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://"
                  autoFocus />
                
                  {linkUrl && !isValidUrl(linkUrl) &&
                <p className="mt-1 text-xs text-red-500">
                      请输入有效的URL (例如: https://example.com)
                    </p>
                }
                </div>

                <div>
                  <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="link-text">
                  
                    链接文本 (可选)
                  </label>
                  <input
                  id="link-text"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="显示文本" />
                
                </div>

                <div>
                  <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="link-title">
                  
                    标题 (可选)
                  </label>
                  <input
                  id="link-title"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="鼠标悬停时显示" />
                
                </div>

                <div className="flex items-center">
                  <input
                  id="link-new-tab"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={linkOpenInNewTab}
                  onChange={(e) => setLinkOpenInNewTab(e.target.checked)} />
                
                  <label
                  htmlFor="link-new-tab"
                  className="ml-2 block text-sm text-gray-700">
                  
                    在新标签页中打开
                  </label>
                </div>

                {}
                {linkUrl && isValidUrl(linkUrl) &&
              <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      链接预览：
                    </div>
                    <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();

                    alert(
                      '在编辑器中，您可以使用 Ctrl/Cmd + 点击 来打开链接'
                    );
                  }}>
                  
                      {linkText || linkUrl}
                      <span className="material-icons text-xs ml-1">
                        open_in_new
                      </span>
                    </a>
                    {linkTitle &&
                <div className="mt-1 text-xs text-gray-500 italic">
                        标题提示：{linkTitle}
                      </div>
                }
                    <div className="mt-2 text-xs text-gray-500 flex items-center">
                      <span className="material-icons text-xs mr-1">info</span>
                      提示：在编辑器中使用 Ctrl/Cmd + 点击 可打开链接
                    </div>
                  </div>
              }
              </div>
            }

            {activeTab === 'image' &&
            <div className="space-y-3">
                <div>
                  <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="image-url">
                  
                    图片URL
                  </label>
                  <input
                  id="image-url"
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  imageUrl && !isValidUrl(imageUrl) ?
                  'border-red-300' :
                  'border-gray-300'}`
                  }
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://"
                  autoFocus />
                
                  {imageUrl && !isValidUrl(imageUrl) &&
                <p className="mt-1 text-xs text-red-500">
                      请输入有效的图片URL
                    </p>
                }
                </div>

                {}
                {imageUrl && isValidUrl(imageUrl) &&
              <div className="mt-2 mb-3 flex justify-center">
                    {!imagePreviewError ?
                <img
                  src={imageUrl}
                  alt="预览"
                  className="max-h-40 max-w-full rounded border border-gray-200"
                  onError={handleImagePreviewError} /> :


                <div className="w-full h-24 flex items-center justify-center bg-gray-100 border border-gray-200 rounded">
                        <div className="text-center text-sm text-gray-500">
                          <span className="material-icons text-red-400 mb-1">
                            broken_image
                          </span>
                          <p>图片无法加载</p>
                        </div>
                      </div>
                }
                  </div>
              }

                <div>
                  <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="image-alt">
                  
                    替代文本 (可选，用于无障碍)
                  </label>
                  <input
                  id="image-alt"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="图片描述" />
                
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="image-width">
                    
                      宽度 (可选)
                    </label>
                    <input
                    id="image-width"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(e.target.value)}
                    placeholder="px 或 %" />
                  
                  </div>

                  <div>
                    <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="image-height">
                    
                      高度 (可选)
                    </label>
                    <input
                    id="image-height"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={imageHeight}
                    onChange={(e) => setImageHeight(e.target.value)}
                    placeholder="px 或 auto" />
                  
                  </div>
                </div>

                {}
              </div>
            }

            {activeTab === 'video' &&
            <div className="space-y-3">
                <div>
                  <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="video-url">
                  
                    视频URL (支持YouTube、Bilibili或直接视频文件)
                  </label>
                  <input
                  id="video-url"
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  videoUrl && !isValidUrl(videoUrl) ?
                  'border-red-300' :
                  'border-gray-300'}`
                  }
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://"
                  autoFocus />
                
                  {videoUrl && !isValidUrl(videoUrl) &&
                <p className="mt-1 text-xs text-red-500">
                      请输入有效的视频URL
                    </p>
                }
                  <p className="mt-1 text-xs text-gray-500">
                    输入YouTube、Bilibili链接或直接的视频文件URL(.mp4, .webm等)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="video-width">
                    
                      宽度
                    </label>
                    <input
                    id="video-width"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={videoWidth}
                    onChange={(e) => setVideoWidth(e.target.value)}
                    placeholder="640" />
                  
                  </div>

                  <div>
                    <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="video-height">
                    
                      高度
                    </label>
                    <input
                    id="video-height"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={videoHeight}
                    onChange={(e) => setVideoHeight(e.target.value)}
                    placeholder="360" />
                  
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                  id="video-autoplay"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={videoAutoplay}
                  onChange={(e) => setVideoAutoplay(e.target.checked)} />
                
                  <label
                  htmlFor="video-autoplay"
                  className="ml-2 block text-sm text-gray-700">
                  
                    自动播放 (可能需要静音)
                  </label>
                </div>
              </div>
            }

            {activeTab === 'embed' &&
            <div className="space-y-3">
                <div>
                  <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="embed-code">
                  
                    嵌入HTML代码
                  </label>
                  <textarea
                  id="embed-code"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  value={embedCode}
                  onChange={(e) => setEmbedCode(e.target.value)}
                  placeholder="<iframe src=...></iframe>"
                  autoFocus />
                
                  <p className="mt-1 text-xs text-gray-500">
                    粘贴来自其他网站的嵌入代码，如地图、社交媒体帖子等
                  </p>
                </div>
              </div>
            }

            <div className="mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                
                插入
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>);

}