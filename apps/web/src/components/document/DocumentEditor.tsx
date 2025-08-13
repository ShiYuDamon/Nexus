import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentService } from '../../services/document.service';
import { DocumentDetailDto, UpdateDocumentDto } from '@nexus-main/common';

interface DocumentEditorProps {
  documentId: string;
  workspaceId: string;
}

export function DocumentEditor({ documentId, workspaceId }: DocumentEditorProps) {
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDetailDto | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);


  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const data = await DocumentService.getById(documentId);
        setDocument(data);
        setTitle(data.title);
        setContent(data.content || '');
      } catch (err) {
        
        setError('无法加载文档，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);


  const saveDocument = async () => {
    if (!title.trim()) {
      setError('请输入文档标题');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateDocumentDto = {
        title: title.trim(),
        content
      };

      await DocumentService.update(documentId, updateData);

      setSaveMessage('保存成功');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      
      setError('保存文档失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };


  useEffect(() => {
    const timer = setTimeout(() => {
      if (document && (title !== document.title || content !== document.content) && !saving) {
        saveDocument();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [title, content, document, saving]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>);

  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="text-red-700">{error}</div>
      </div>);

  }

  if (!document) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <div className="text-yellow-700">文档不存在或您没有访问权限</div>
      </div>);

  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4 flex justify-between items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md px-2 py-1 w-full max-w-2xl"
          placeholder="文档标题" />
        
        <div className="flex items-center">
          {saveMessage &&
          <span className="text-green-600 text-sm mr-3">{saveMessage}</span>
          }
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
            className="mr-3 px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            
            返回
          </button>
          <button
            onClick={saveDocument}
            disabled={saving}
            className="px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
            
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="border rounded-md p-2 min-h-[400px]">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full min-h-[400px] focus:outline-none p-2"
          placeholder="开始编辑文档内容..." />
        
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>最后编辑: {new Date(document.updatedAt).toLocaleString()}</p>
        <p>创建者: {document.author.name || document.author.email}</p>
      </div>
    </div>);

}