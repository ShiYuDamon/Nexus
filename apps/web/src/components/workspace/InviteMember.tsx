import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkspaceService } from '../../services/workspace.service';
import { AddWorkspaceMemberDto, WorkspaceRole } from '@nexus-main/common';

export function InviteMember() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<AddWorkspaceMemberDto>({
    email: '',
    role: WorkspaceRole.MEMBER,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;
    if (!formData.email?.trim()) {
      setError('邮箱地址不能为空');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await WorkspaceService.addMember(id, formData);
      navigate(`/workspaces/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '邀请成员失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-6">邀请成员</h2>

      {error && (
        <div className="mb-4 bg-red-50 p-4 rounded-md">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            邮箱地址 *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="输入成员的邮箱地址"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            角色 *
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value={WorkspaceRole.ADMIN}>管理员</option>
            <option value={WorkspaceRole.MEMBER}>成员</option>
            <option value={WorkspaceRole.GUEST}>访客</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            管理员可以管理工作区和成员，成员可以创建和编辑文档，访客只能查看文档
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(`/workspaces/${id}`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? '邀请中...' : '发送邀请'}
          </button>
        </div>
      </form>
    </div>
  );
}
