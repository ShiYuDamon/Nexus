import { useState, useCallback, useEffect } from 'react';
import { RichTextBlock } from '../components/RichTextBlockEditor';

interface UseTodoItemsProps {
  blocks: RichTextBlock[];
  onBlocksChange: (blocks: RichTextBlock[]) => void;
}

interface UseTodoItemsReturn {
  toggleTodoStatus: (id: string, checked: boolean) => void;
  completedCount: number;
  totalCount: number;
}





export function useTodoItems({
  blocks,
  onBlocksChange
}: UseTodoItemsProps): UseTodoItemsReturn {

  const [stats, setStats] = useState({
    completedCount: 0,
    totalCount: 0
  });


  useEffect(() => {
    const todoBlocks = blocks.filter((block) => block.type === 'to-do');
    const completed = todoBlocks.filter((block) => block.checked).length;

    setStats({
      completedCount: completed,
      totalCount: todoBlocks.length
    });
  }, [blocks]);


  const toggleTodoStatus = useCallback(
    (id: string, checked: boolean) => {
      const newBlocks = blocks.map((block) =>
      block.id === id ? { ...block, checked } : block
      );

      onBlocksChange(newBlocks);
    },
    [blocks, onBlocksChange]
  );

  return {
    toggleTodoStatus,
    completedCount: stats.completedCount,
    totalCount: stats.totalCount
  };
}