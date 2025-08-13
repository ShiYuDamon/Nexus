

export type BlockTypeLocal =
'paragraph' |
'heading-1' |
'heading-2' |
'heading-3' |
'bulleted-list' |
'numbered-list' |
'to-do' |
'quote' |
'code' |
'image' |
'video' |
'embed' |
'divider';

export type CommandCategory = '基础' | '列表' | '结构' | '媒体' | '样式';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: CommandCategory;
  keywords?: string[];
  isQuick?: boolean;
  action: () => void;
}

export interface PaletteActions {
  setType: (type: BlockTypeLocal) => void;
  toggleHighlight: () => void;
  openMedia: (tab: 'image' | 'video' | 'embed') => void;
}

export function buildBlockPalette(actions: PaletteActions): CommandItem[] {
  const items: CommandItem[] = [

  {
    id: 'heading-1',
    label: '标题 1',
    description: '大标题',
    icon: 'title',
    category: '基础',
    keywords: ['h1', '标题1', 'heading1'],
    isQuick: true,
    action: () => actions.setType('heading-1')
  },
  {
    id: 'heading-2',
    label: '标题 2',
    description: '中标题',
    icon: 'format_size',
    category: '基础',
    keywords: ['h2', '标题2', 'heading2'],
    isQuick: true,
    action: () => actions.setType('heading-2')
  },
  {
    id: 'heading-3',
    label: '标题 3',
    description: '小标题',
    icon: 'format_overline',
    category: '基础',
    keywords: ['h3', '标题3', 'heading3'],
    isQuick: true,
    action: () => actions.setType('heading-3')
  },
  {
    id: 'paragraph',
    label: '文本',
    description: '富文本段落',
    icon: 'text_fields',
    category: '基础',
    keywords: ['text', 'paragraph', 'p'],
    action: () => actions.setType('paragraph')
  },

  {
    id: 'bulleted-list',
    label: '无序列表',
    description: '项目符号列表',
    icon: 'format_list_bulleted',
    category: '列表',
    keywords: ['list', 'ul'],
    isQuick: true,
    action: () => actions.setType('bulleted-list')
  },
  {
    id: 'numbered-list',
    label: '有序列表',
    description: '数字编号列表',
    icon: 'format_list_numbered',
    category: '列表',
    keywords: ['list', 'ol'],
    isQuick: true,
    action: () => actions.setType('numbered-list')
  },
  {
    id: 'to-do',
    label: '待办事项',
    description: '可勾选的任务',
    icon: 'check_box',
    category: '列表',
    keywords: ['todo', 'task'],
    isQuick: true,
    action: () => actions.setType('to-do')
  },


  {
    id: 'quote',
    label: '引用',
    description: '引用文本',
    icon: 'format_quote',
    category: '结构',
    keywords: ['blockquote', 'quote'],
    isQuick: true,
    action: () => actions.setType('quote')
  },
  {
    id: 'code',
    label: '代码',
    description: '代码片段',
    icon: 'code',
    category: '结构',
    keywords: ['code', 'snippet'],
    isQuick: true,
    action: () => actions.setType('code')
  },
  {
    id: 'divider',
    label: '分割线',
    description: '水平分隔符',
    icon: 'horizontal_rule',
    category: '结构',
    keywords: ['hr', 'divider'],
    action: () => actions.setType('divider')
  },
  {
    id: 'toggle-highlight',
    label: '切换高亮',
    description: '与标题/列表/代办可叠加',
    icon: 'highlight',
    category: '样式',
    keywords: ['highlight', 'note'],
    action: () => actions.toggleHighlight()
  },

  {
    id: 'image',
    label: '图片',
    description: '插入图片',
    icon: 'image',
    category: '媒体',
    keywords: ['image', 'img', 'picture'],
    action: () => actions.openMedia('image')
  },
  {
    id: 'video',
    label: '视频',
    description: '本地/平台视频',
    icon: 'videocam',
    category: '媒体',
    keywords: ['video', 'youtube', 'bilibili'],
    action: () => actions.openMedia('video')
  },
  {
    id: 'embed',
    label: '嵌入',
    description: 'HTML/iframe',
    icon: 'code',
    category: '媒体',
    keywords: ['embed', 'iframe', 'html'],
    action: () => actions.openMedia('embed')
  }];

  return items;
}