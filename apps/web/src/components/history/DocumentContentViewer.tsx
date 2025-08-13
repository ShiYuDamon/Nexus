import React, { useMemo } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

interface Version {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  changeType: 'CREATE' | 'EDIT' | 'TITLE' | 'RESTORE' | 'MERGE';
  changeSummary?: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    color?: string;
  };
}

interface DocumentContentViewerProps {
  version: Version;
  className?: string;
}

interface Block {
  id?: string;
  type: string;
  content: string;
  level?: number;
  items?: string[];
  url?: string;
  alt?: string;
  language?: string;
  checked?: boolean;
}

export const DocumentContentViewer = React.memo(function DocumentContentViewer({
  version,
  className = ''
}: DocumentContentViewerProps) {

  const parsedContent = useMemo(() => {
    try {
      const blocks = JSON.parse(version.content) as Block[];
      return blocks;
    } catch (error) {
      
      return null;
    }
  }, [version.content]);


  const renderBlock = (block: Block, index: number) => {
    const blockId = block.id || `block-${index}`;

    switch (block.type) {
      case 'heading':
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
      case 'heading-4':
      case 'heading-5':
      case 'heading-6':

        let level = block.level || 1;
        if (block.type.startsWith('heading-')) {
          const typeLevel = parseInt(block.type.split('-')[1]);
          if (!isNaN(typeLevel)) {
            level = typeLevel;
          }
        }

        const HeadingTag = `h${Math.min(
          level,
          6
        )}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag
            key={blockId}
            className={`font-bold mb-4 text-gray-900 ${
            level === 1 ?
            'text-3xl' :
            level === 2 ?
            'text-2xl' :
            level === 3 ?
            'text-xl' :
            level === 4 ?
            'text-lg' :
            'text-base'}`
            }>
            
            {block.content || '无标题'}
          </HeadingTag>);


      case 'paragraph':
        return (
          <p key={blockId} className="mb-4 text-gray-700 leading-relaxed">
            {block.content || ''}
          </p>);


      case 'list':
        return (
          <ul
            key={blockId}
            className="mb-4 list-disc list-inside text-gray-700 space-y-1">
            
            {block.items?.map((item, itemIndex) =>
            <li
              key={`${blockId}-item-${itemIndex}`}
              className="leading-relaxed">
              
                {item}
              </li>
            )}
          </ul>);


      case 'ordered-list':
        return (
          <ol
            key={blockId}
            className="mb-4 list-decimal list-inside text-gray-700 space-y-1">
            
            {block.items?.map((item, itemIndex) =>
            <li
              key={`${blockId}-item-${itemIndex}`}
              className="leading-relaxed">
              
                {item}
              </li>
            )}
          </ol>);


      case 'bulleted-list':

        return (
          <div key={blockId} className="mb-2 flex items-start">
            <div className="px-1 text-gray-500 select-none">•</div>
            <div
              className="flex-1 text-gray-700"
              dangerouslySetInnerHTML={{ __html: block.content || '' }} />
            
          </div>);


      case 'numbered-list':

        const numberIndex = (parsedContent || []).
        slice(0, index + 1).
        filter((b) => b.type === 'numbered-list').length;
        return (
          <div key={blockId} className="mb-2 flex items-start">
            <div className="px-1 text-gray-500 min-w-[1.5rem] pt-0.5 select-none">
              {numberIndex}.
            </div>
            <div
              className="flex-1 text-gray-700"
              dangerouslySetInnerHTML={{ __html: block.content || '' }} />
            
          </div>);


      case 'checklist':
        return (
          <div key={blockId} className="mb-4 space-y-2">
            {block.items?.map((item, itemIndex) =>
            <div
              key={`${blockId}-item-${itemIndex}`}
              className="flex items-center space-x-2">
              
                <input
                type="checkbox"
                checked={block.checked || false}
                readOnly
                className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              
                <span
                className={`text-gray-700 ${
                block.checked ? 'line-through text-gray-500' : ''}`
                }>
                
                  {item}
                </span>
              </div>
            )}
          </div>);


      case 'to-do':

        return (
          <div key={blockId} className="mb-3 flex items-start">
            <input
              type="checkbox"
              checked={block.checked || false}
              readOnly
              className="mt-1.5 w-4 h-4 text-blue-600 rounded border-gray-300" />
            
            <div
              className={`ml-3 text-gray-700 ${
              block.checked ? 'line-through text-gray-500' : ''}`
              }
              dangerouslySetInnerHTML={{ __html: block.content || '' }} />
            
          </div>);


      case 'blockquote':
        return (
          <blockquote
            key={blockId}
            className="mb-4 pl-4 border-l-4 border-gray-300 text-gray-600 italic">
            
            {block.content}
          </blockquote>);


      case 'code':
        return (
          <pre
            key={blockId}
            className="mb-4 p-4 bg-gray-100 rounded-lg overflow-x-auto">
            
            <code
              className={`text-sm ${
              block.language ? `language-${block.language}` : ''}`
              }>
              
              {block.content}
            </code>
          </pre>);


      case 'divider':
        return <hr key={blockId} className="mb-4 border-gray-300" />;

      case 'image':



        if (block.content && /<img\b/i.test(block.content)) {
          return (
            <div key={blockId} className="mb-4">
              <div
                className="max-w-full h-auto rounded-lg shadow-sm"
                dangerouslySetInnerHTML={{ __html: block.content }} />
              
            </div>);

        }
        return (
          <div key={blockId} className="mb-4">
            <img
              src={block.url}
              alt={block.alt || '图片'}
              className="max-w-full h-auto rounded-lg shadow-sm" />
            
            {block.alt &&
            <p className="text-sm text-gray-500 mt-2 text-center">
                {block.alt}
              </p>
            }
          </div>);


      case 'video':

        return (
          <div key={blockId} className="mb-4">
            <div
              className="rounded-lg overflow-hidden shadow-sm [&_video]:max-w-full [&_video]:h-auto"
              dangerouslySetInnerHTML={{ __html: block.content || '' }} />
            
          </div>);


      case 'embed':
        return (
          <div key={blockId} className="mb-4">
            <div
              className="rounded-lg overflow-hidden shadow-sm [&_iframe]:w-full [&_iframe]:min-h-[200px]"
              dangerouslySetInnerHTML={{ __html: block.content || '' }} />
            
          </div>);


      case 'table':

        return (
          <div key={blockId} className="mb-4 overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <tbody>
                {block.items?.map((row, rowIndex) =>
                <tr key={`${blockId}-row-${rowIndex}`}>
                    {(row as any).
                  split('|').
                  map((cell: string, cellIndex: number) =>
                  <td
                    key={`${blockId}-cell-${rowIndex}-${cellIndex}`}
                    className="border border-gray-300 px-3 py-2">
                    
                          {cell.trim()}
                        </td>
                  )}
                  </tr>
                )}
              </tbody>
            </table>
          </div>);


      default:
        return (
          <div
            key={blockId}
            className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">未知块类型: {block.type}</span>
            </div>
            <pre className="mt-2 text-xs text-yellow-700 overflow-x-auto">
              {JSON.stringify(block, null, 2)}
            </pre>
          </div>);

    }
  };

  if (!parsedContent) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            内容解析失败
          </h3>
          <p className="text-gray-500">无法解析此版本的文档内容</p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              查看原始内容
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto max-h-40">
              {version.content}
            </pre>
          </details>
        </div>
      </div>);

  }

  return (
    <div className={`document-content-viewer ${className}`}>
      <div className="max-w-4xl mx-auto p-8">
        {}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {version.title}
            </h1>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>版本 {version.versionNumber}</span>
            <span>•</span>
            <span>{version.createdBy.name}</span>
            <span>•</span>
            <span>{new Date(version.createdAt).toLocaleString('zh-CN')}</span>
            {version.changeSummary &&
            <>
                <span>•</span>
                <span className="italic">{version.changeSummary}</span>
              </>
            }
          </div>
        </div>

        {}
        <div className="prose prose-lg max-w-none">
          {parsedContent.length > 0 ?
          parsedContent.map((block, index) => renderBlock(block, index)) :

          <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">此版本没有内容</p>
            </div>
          }
        </div>

        {}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">内容块数量:</span>{' '}
              {parsedContent.length}
            </div>
            <div>
              <span className="font-medium">字符数:</span>{' '}
              {version.content.length}
            </div>
            <div>
              <span className="font-medium">变更类型:</span>{' '}
              {{
                CREATE: '创建',
                EDIT: '编辑',
                TITLE: '标题修改',
                RESTORE: '版本恢复',
                MERGE: '合并'
              }[version.changeType] || version.changeType}
            </div>
          </div>
        </div>
      </div>
    </div>);

});