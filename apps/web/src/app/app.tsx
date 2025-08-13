import { Route, Routes } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { WorkspacePage } from '../pages/WorkspacePage';
import { CreateWorkspacePage } from '../pages/CreateWorkspacePage';
import { EditWorkspacePage } from '../pages/EditWorkspacePage';
import { InviteMemberPage } from '../pages/InviteMemberPage';
import { CreateDocumentPage } from '../pages/CreateDocumentPage';
import {
  DocumentEditorPage,
  DocumentViewPage } from
'../pages/DocumentEditorPage';
import { PrivateRoute } from '../components/PrivateRoute';
import { AuthProvider } from '../contexts/AuthContext';
import { UserSettingsPage } from '../pages/UserSettingsPage';

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {}
          <Route
            path="/dashboard"
            element={
            <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } />

          <Route
            path="/settings"
            element={
            <PrivateRoute>
                <UserSettingsPage />
              </PrivateRoute>
            } />


          <Route
            path="/workspaces/new"
            element={
            <PrivateRoute>
                <CreateWorkspacePage />
              </PrivateRoute>
            } />

          <Route
            path="/workspaces/:id"
            element={
            <PrivateRoute>
                <WorkspacePage />
              </PrivateRoute>
            } />

          <Route
            path="/workspaces/:id/edit"
            element={
            <PrivateRoute>
                <EditWorkspacePage />
              </PrivateRoute>
            } />

          <Route
            path="/workspaces/:id/members/invite"
            element={
            <PrivateRoute>
                <InviteMemberPage />
              </PrivateRoute>
            } />

          <Route
            path="/workspaces/:workspaceId/documents/new"
            element={
            <PrivateRoute>
                <CreateDocumentPage />
              </PrivateRoute>
            } />

          <Route
            path="/workspaces/:workspaceId/documents/:documentId/edit"
            element={
            <PrivateRoute>
                <DocumentEditorPage />
              </PrivateRoute>
            } />


          <Route
            path="/workspaces/:workspaceId/documents/:documentId"
            element={
            <PrivateRoute>
                <DocumentViewPage />
              </PrivateRoute>
            } />



          <Route path="*" element={<div>页面未找到</div>} />
        </Routes>
      </AuthProvider>
    </div>);

}

export default App;
