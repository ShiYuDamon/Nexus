import { create } from 'zustand';
import { DocumentDto } from '@nexus-main/common';
import { DocumentService } from '../services/document.service';

interface DocumentState {

  documents: Record<string, DocumentDto>;

  workspaceDocuments: Record<string, string[]>;

  loading: Record<string, boolean>;

  errors: Record<string, string | null>;


  fetchWorkspaceDocuments: (workspaceId: string) => Promise<void>;

  fetchDocument: (documentId: string) => Promise<DocumentDto | null>;

  updateDocumentTitle: (documentId: string, title: string) => void;

  getDocument: (documentId: string) => DocumentDto | undefined;

  getWorkspaceDocuments: (workspaceId: string) => DocumentDto[];
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: {},
  workspaceDocuments: {},
  loading: {},
  errors: {},

  fetchWorkspaceDocuments: async (workspaceId: string) => {
    try {
      set((state) => ({
        loading: { ...state.loading, [workspaceId]: true },
        errors: { ...state.errors, [workspaceId]: null }
      }));

      const response = await DocumentService.getByWorkspace(workspaceId);
      const docs = response.items;


      const newDocuments = { ...get().documents };
      docs.forEach((doc) => {
        newDocuments[doc.id] = doc;
      });


      set((state) => ({
        documents: newDocuments,
        workspaceDocuments: {
          ...state.workspaceDocuments,
          [workspaceId]: docs.map((doc) => doc.id)
        },
        loading: { ...state.loading, [workspaceId]: false }
      }));

      
      return;
    } catch (error) {
      
      set((state) => ({
        loading: { ...state.loading, [workspaceId]: false },
        errors: { ...state.errors, [workspaceId]: '获取文档失败，请稍后重试' }
      }));
      return;
    }
  },

  fetchDocument: async (documentId: string) => {
    try {
      set((state) => ({
        loading: { ...state.loading, [documentId]: true },
        errors: { ...state.errors, [documentId]: null }
      }));

      const document = await DocumentService.getById(documentId);

      set((state) => ({
        documents: { ...state.documents, [documentId]: document },
        loading: { ...state.loading, [documentId]: false }
      }));

      return document;
    } catch (error) {
      
      set((state) => ({
        loading: { ...state.loading, [documentId]: false },
        errors: {
          ...state.errors,
          [documentId]: '获取文档详情失败，请稍后重试'
        }
      }));
      return null;
    }
  },

  updateDocumentTitle: (documentId: string, title: string) => {

    const currentDoc = get().documents[documentId];
    if (currentDoc) {
      
      set((state) => ({
        documents: {
          ...state.documents,
          [documentId]: { ...currentDoc, title }
        }
      }));
    }
  },

  getDocument: (documentId: string) => {
    return get().documents[documentId];
  },

  getWorkspaceDocuments: (workspaceId: string) => {
    const docIds = get().workspaceDocuments[workspaceId] || [];
    return docIds.map((id) => get().documents[id]).filter(Boolean);
  }
}));