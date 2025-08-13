import React, { useMemo } from 'react';
import { FileText, Plus, Minus, AlertCircle, ArrowRight } from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';

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

interface VersionDiffViewerProps {
  version: Version;
  previousVersion?: Version;
  className?: string;
}

interface DiffBlock {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  content: string;
  blockType: string;
  index: number;
  author?: {
    id: string;
    name: string;
    color?: string;
  };
  changes?: TextChange[];
}

interface TextChange {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  author?: {
    id: string;
    name: string;
    color?: string;
  };
}

interface Block {
  id?: string;
  type: string;
  content: string;
  level?: number;
  items?: string[];
}

export const VersionDiffViewer = React.memo(function VersionDiffViewer({
  version,
  previousVersion,
  className = ''
}: VersionDiffViewerProps) {

  const diffBlocks = useMemo(() => {
    if (!previousVersion) {

      try {
        const blocks = JSON.parse(version.content) as Block[];
        return blocks.map((block, index) => ({
          type: 'added' as const,
          content: block.content || '',
          blockType: block.type,
          index,
          author: version.createdBy
        }));
      } catch (error) {
        return [];
      }
    }

    try {
      const currentBlocks = JSON.parse(version.content) as Block[];
      const previousBlocks = JSON.parse(previousVersion.content) as Block[];

      return computeBlockDiff(previousBlocks, currentBlocks, version.createdBy);
    } catch (error) {
      
      return [];
    }
  }, [version, previousVersion]);


  function computeBlockDiff(
  previousBlocks: Block[],
  currentBlocks: Block[],
  author: Version['createdBy'])
  : DiffBlock[] {
    const result: DiffBlock[] = [];
    const maxLength = Math.max(previousBlocks.length, currentBlocks.length);

    for (let i = 0; i < maxLength; i++) {
      const prevBlock = previousBlocks[i];
      const currBlock = currentBlocks[i];

      if (!prevBlock && currBlock) {

        result.push({
          type: 'added',
          content: currBlock.content || '',
          blockType: currBlock.type,
          index: i,
          author
        });
      } else if (prevBlock && !currBlock) {

        result.push({
          type: 'removed',
          content: prevBlock.content || '',
          blockType: prevBlock.type,
          index: i
        });
      } else if (prevBlock && currBlock) {
        if (
        prevBlock.content !== currBlock.content ||
        prevBlock.type !== currBlock.type)
        {

          const textChanges = computeTextDiff(
            prevBlock.content || '',
            currBlock.content || '',
            author
          );

          result.push({
            type: 'modified',
            content: currBlock.content || '',
            blockType: currBlock.type,
            index: i,
            author,
            changes: textChanges
          });
        } else {

          result.push({
            type: 'unchanged',
            content: currBlock.content || '',
            blockType: currBlock.type,
            index: i
          });
        }
      }
    }

    return result;
  }


  function computeTextDiff(
  oldText: string,
  newText: string,
  author: Version['createdBy'])
  : TextChange[] {
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);
    const changes: TextChange[] = [];


    const lcs = computeLCS(oldWords, newWords);

    let oldIndex = 0;
    let newIndex = 0;
    let lcsIndex = 0;

    while (oldIndex < oldWords.length || newIndex < newWords.length) {
      if (
      lcsIndex < lcs.length &&
      oldIndex < oldWords.length &&
      newIndex < newWords.length &&
      oldWords[oldIndex] === newWords[newIndex] &&
      oldWords[oldIndex] === lcs[lcsIndex])
      {

        changes.push({
          type: 'unchanged',
          text: oldWords[oldIndex]
        });
        oldIndex++;
        newIndex++;
        lcsIndex++;
      } else if (
      oldIndex < oldWords.length && (
      lcsIndex >= lcs.length || oldWords[oldIndex] !== lcs[lcsIndex]))
      {

        changes.push({
          type: 'removed',
          text: oldWords[oldIndex]
        });
        oldIndex++;
      } else if (newIndex < newWords.length) {

        changes.push({
          type: 'added',
          text: newWords[newIndex],
          author
        });
        newIndex++;
      }
    }

    return changes;
  }


  function computeLCS(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).
    fill(null).
    map(() => Array(n + 1).fill(0));


    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }


    const lcs: string[] = [];
    let i = m,
      j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }


  const renderDiffBlock = (diffBlock: DiffBlock, index: number) => {
    const { type, content, blockType, author, changes } = diffBlock;

    const getBlockIcon = () => {
      switch (type) {
        case 'added':
          return <Plus className="w-4 h-4 text-green-600" />;
        case 'removed':
          return <Minus className="w-4 h-4 text-red-600" />;
        case 'modified':
          return <ArrowRight className="w-4 h-4 text-blue-600" />;
        default:
          return null;
      }
    };

    const getBlockStyle = () => {
      switch (type) {
        case 'added':
          return 'bg-green-50 border-l-4 border-green-400';
        case 'removed':
          return 'bg-red-50 border-l-4 border-red-400';
        case 'modified':
          return 'bg-blue-50 border-l-4 border-blue-400';
        default:
          return 'bg-white';
      }
    };

    const getAuthorColor = () => {
      if (!author?.color) return '#3b82f6';
      return author.color;
    };

    return (
      <div
        key={`diff-${index}`}
        className={`mb-4 p-4 rounded-lg transition-all ${getBlockStyle()}`}>
        
        {}
        {type !== 'unchanged' &&
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getBlockIcon()}
              <span className="text-sm font-medium text-gray-700">
                {type === 'added' && '新增'}
                {type === 'removed' && '删除'}
                {type === 'modified' && '修改'}
                {blockType && ` • ${getBlockTypeName(blockType)}`}
              </span>
            </div>

            {author && type !== 'removed' &&
          <div className="flex items-center space-x-2">
                <UserAvatar user={author} size="xs" />
                <span
              className="text-xs font-medium"
              style={{ color: getAuthorColor() }}>
              
                  {author.name}
                </span>
              </div>
          }
          </div>
        }

        {}
        <div
          className={`${
          type === 'removed' ? 'line-through text-gray-500' : ''}`
          }>
          
          {type === 'modified' && changes ?
          renderTextDiff(changes) :
          renderBlockContent(blockType, content)}
        </div>
      </div>);

  };


  const renderTextDiff = (changes: TextChange[]) => {
    return (
      <div className="text-diff-container">
        {changes.map((change, index) => {
          const { type, text, author } = change;

          if (type === 'unchanged') {
            return (
              <span key={index} className="text-gray-700">
                {text}
              </span>);

          } else if (type === 'removed') {
            return (
              <span
                key={index}
                className="bg-red-100 text-red-800 line-through px-1 rounded"
                title="删除的内容">
                
                {text}
              </span>);

          } else if (type === 'added') {
            const authorColor = author?.color || '#3b82f6';
            return (
              <span
                key={index}
                className="bg-green-100 text-green-800 px-1 rounded font-medium"
                style={{
                  borderLeft: `3px solid ${authorColor}`,
                  paddingLeft: '6px'
                }}
                title={`${author?.name || '未知用户'} 添加的内容`}
                onMouseEnter={(e) => {

                  if (author) {
                    e.currentTarget.setAttribute(
                      'data-tooltip',
                      `由 ${author.name} 添加`
                    );
                  }
                }}>
                
                {text}
              </span>);

          }

          return null;
        })}
      </div>);

  };


  const renderBlockContent = (blockType: string, content: string) => {
    switch (blockType) {
      case 'heading':
      case 'heading-1':
      case 'heading-2':
      case 'heading-3':
      case 'heading-4':
      case 'heading-5':
      case 'heading-6':

        let level = 1;
        if (blockType.startsWith('heading-')) {
          const typeLevel = parseInt(blockType.split('-')[1]);
          if (!isNaN(typeLevel)) {
            level = typeLevel;
          }
        }

        const className =
        level === 1 ?
        'text-xl font-bold text-gray-900' :
        level === 2 ?
        'text-lg font-semibold text-gray-900' :
        'text-base font-medium text-gray-900';

        return <div className={className}>{content || '无标题'}</div>;
      case 'paragraph':
        return <p className="text-gray-700 leading-relaxed">{content}</p>;
      case 'list':
      case 'ordered-list':
        try {
          const items = JSON.parse(content) as string[];
          const ListTag = blockType === 'ordered-list' ? 'ol' : 'ul';
          const listClass =
          blockType === 'ordered-list' ? 'list-decimal' : 'list-disc';
          return (
            <ListTag
              className={`${listClass} list-inside text-gray-700 space-y-1`}>
              
              {items.map((item, index) =>
              <li key={index}>{item}</li>
              )}
            </ListTag>);

        } catch {
          return <p className="text-gray-700">{content}</p>;
        }
      case 'blockquote':
        return (
          <blockquote className="pl-4 border-l-4 border-gray-300 text-gray-600 italic">
            {content}
          </blockquote>);

      case 'code':
        return (
          <pre className="p-3 bg-gray-100 rounded text-sm overflow-x-auto">
            <code>{content}</code>
          </pre>);

      case 'to-do':
        return (
          <div className="flex items-start">
            <input
              type="checkbox"
              disabled
              className="mt-1.5 w-4 h-4 text-blue-600 rounded border-gray-300" />
            
            <div
              className="ml-3 text-gray-700"
              dangerouslySetInnerHTML={{ __html: content || '' }} />
            
          </div>);

      case 'image':
        if (content && /<img\b/i.test(content)) {
          return (
            <div
              className="rounded-lg overflow-hidden shadow-sm"
              dangerouslySetInnerHTML={{ __html: content }} />);


        }

        return <p className="text-gray-700">{content}</p>;
      case 'bulleted-list':
        return (
          <div className="flex items-start">
            <div className="px-1 text-gray-500 select-none">•</div>
            <div
              className="flex-1 text-gray-700"
              dangerouslySetInnerHTML={{ __html: content || '' }} />
            
          </div>);

      case 'numbered-list':
        return (
          <div className="flex items-start">
            <div className="px-1 text-gray-500 min-w-[1.5rem] pt-0.5 select-none">
              1.
            </div>
            <div
              className="flex-1 text-gray-700"
              dangerouslySetInnerHTML={{ __html: content || '' }} />
            
          </div>);

      case 'video':
        return (
          <div
            className="rounded-lg overflow-hidden shadow-sm [&_video]:max-w-full [&_video]:h-auto"
            dangerouslySetInnerHTML={{ __html: content || '' }} />);


      case 'embed':
        return (
          <div
            className="rounded-lg overflow-hidden shadow-sm [&_iframe]:w-full [&_iframe]:min-h-[140px]"
            dangerouslySetInnerHTML={{ __html: content || '' }} />);


      default:
        return <p className="text-gray-700">{content}</p>;
    }
  };


  const getBlockTypeName = (blockType: string) => {
    const names: Record<string, string> = {
      heading: '标题',
      'heading-1': '一级标题',
      'heading-2': '二级标题',
      'heading-3': '三级标题',
      'heading-4': '四级标题',
      'heading-5': '五级标题',
      'heading-6': '六级标题',
      paragraph: '段落',
      list: '列表',
      'ordered-list': '有序列表',
      blockquote: '引用',
      code: '代码',
      image: '图片',
      video: '视频',
      embed: '嵌入',
      table: '表格',
      divider: '分割线'
    };
    return names[blockType] || blockType;
  };


  const diffStats = useMemo(() => {
    const stats = {
      added: 0,
      removed: 0,
      modified: 0,
      unchanged: 0
    };

    diffBlocks.forEach((block) => {
      stats[block.type]++;
    });

    return stats;
  }, [diffBlocks]);

  if (diffBlocks.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            无法显示差异
          </h3>
          <p className="text-gray-500">
            {!previousVersion ?
            '这是第一个版本，没有可比较的内容' :
            '内容解析失败'}
          </p>
        </div>
      </div>);

  }

  return (
    <div className={`version-diff-viewer ${className}`}>
      <div className="max-w-4xl mx-auto p-8">
        {}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">版本差异对比</h1>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>版本 {previousVersion?.versionNumber || 0}</span>
              <ArrowRight className="w-4 h-4" />
              <span>版本 {version.versionNumber}</span>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Plus className="w-4 h-4 text-green-600" />
                <span className="text-green-700">{diffStats.added} 新增</span>
              </div>
              <div className="flex items-center space-x-1">
                <Minus className="w-4 h-4 text-red-600" />
                <span className="text-red-700">{diffStats.removed} 删除</span>
              </div>
              <div className="flex items-center space-x-1">
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700">{diffStats.modified} 修改</span>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="space-y-4">
          {diffBlocks.map((diffBlock, index) =>
          renderDiffBlock(diffBlock, index)
          )}
        </div>

        {}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {previousVersion &&
            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  版本 {previousVersion.versionNumber}
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>作者: {previousVersion.createdBy.name}</div>
                  <div>
                    时间:{' '}
                    {new Date(previousVersion.createdAt).toLocaleString(
                    'zh-CN'
                  )}
                  </div>
                  {previousVersion.changeSummary &&
                <div>说明: {previousVersion.changeSummary}</div>
                }
                </div>
              </div>
            }

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                版本 {version.versionNumber}
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>作者: {version.createdBy.name}</div>
                <div>
                  时间: {new Date(version.createdAt).toLocaleString('zh-CN')}
                </div>
                {version.changeSummary &&
                <div>说明: {version.changeSummary}</div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

});