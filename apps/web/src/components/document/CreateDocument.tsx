import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentService } from '../../services/document.service';
import { CreateDocumentDto } from '@nexus-main/common';

interface CreateDocumentProps {
  workspaceId: string;
}

export function CreateDocument({ workspaceId }: CreateDocumentProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('请输入文档标题');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const documentData: CreateDocumentDto = {
        title: title.trim(),
        workspaceId,
        content: ''
      };

      const newDocument = await DocumentService.create(documentData);
      navigate(`/workspaces/${workspaceId}/documents/${newDocument.id}/edit`);
    } catch (err) {
      
      setError('创建文档失败，请稍后重试');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">创建新文档</h2>

      {error &&
      <div className="mb-4 bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      }

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            文档标题
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="输入文档标题"
            required />
          
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
            className="mr-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
            
            {loading ? '创建中...' : '创建文档'}
          </button>
        </div>
      </form>
    </div>);

}