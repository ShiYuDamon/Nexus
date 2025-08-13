import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle } from
'react';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import { nanoid } from 'nanoid';
import ReactDOM from 'react-dom';
import { RichTextBlockEditor } from './RichTextBlockEditor';
import { RichTextBlock } from './RichTextBlockEditor';
import { getRandomColor } from '../utils/colors';
import {
  getOrCreatePortalContainer,
  removePortalContainer } from
'../utils/portal';
import { RemoteCursorWithAvatar } from './RemoteCursorWithAvatar';


const BLOCK_CURSORS_PORTAL_ID = 'collaborative-block-cursors-portal';
const BLOCK_CURSORS_PORTAL_Z_INDEX = 9998;


type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';


interface UserInfo {
  name: string;
  color: string;
}


interface UserCursor {
  blockId: string;
  position: number;
  selection?: {start: number;end: number;};
  timestamp?: number;
}


interface RemoteCursor extends UserInfo {
  id: number;
  email?: string;
  avatar?: string;
  cursor?: UserCursor;
}


const wsProviders = new Map<
  string,
  {provider: WebsocketProvider;refCount: number;}>(
);
const ydocs = new Map<string, {doc: Y.Doc;refCount: number;}>();
const persistences = new Map<
  string,
  {persistence: IndexeddbPersistence;refCount: number;}>(
);


function getOrCreateYDoc(key: string): {doc: Y.Doc;isNew: boolean;} {
  if (ydocs.has(key)) {
    const entry = ydocs.get(key)!;
    entry.refCount++;
    return { doc: entry.doc, isNew: false };
  } else {
    const doc = new Y.Doc();
    ydocs.set(key, { doc, refCount: 1 });
    return { doc, isNew: true };
  }
}

function getOrCreatePersistence(
key: string,
doc: Y.Doc)
: {persistence: IndexeddbPersistence;isNew: boolean;} {
  if (persistences.has(key)) {
    const entry = persistences.get(key)!;
    entry.refCount++;
    return { persistence: entry.persistence, isNew: false };
  } else {
    const persistence = new IndexeddbPersistence(key, doc);
    persistences.set(key, { persistence, refCount: 1 });
    return { persistence, isNew: true };
  }
}

function getOrCreateProvider(
key: string,
wsUrl: string,
roomId: string,
doc: Y.Doc,
opts: any)
: {provider: WebsocketProvider;isNew: boolean;} {
  if (wsProviders.has(key)) {
    const entry = wsProviders.get(key)!;
    entry.refCount++;
    return { provider: entry.provider, isNew: false };
  } else {
    const provider = new WebsocketProvider(wsUrl, roomId, doc, opts);
    wsProviders.set(key, { provider, refCount: 1 });
    return { provider, isNew: true };
  }
}


function shouldConnectWebSocket(provider: WebsocketProvider): boolean {


  if (provider.ws && provider.ws.readyState === 2) {

    return false;
  }
  return true;
}

function releaseYDoc(key: string) {
  if (ydocs.has(key)) {
    const entry = ydocs.get(key)!;
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.doc.destroy();
      ydocs.delete(key);
    }
    return entry.refCount;
  }
  return 0;
}

function releasePersistence(key: string) {
  if (persistences.has(key)) {
    const entry = persistences.get(key)!;
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.persistence.destroy();
      persistences.delete(key);
    }
    return entry.refCount;
  }
  return 0;
}

function releaseProvider(key: string) {
  if (wsProviders.has(key)) {
    const entry = wsProviders.get(key)!;
    entry.refCount--;
    if (entry.refCount <= 0) {

      if (
      entry.provider.ws && (
      entry.provider.ws.readyState === 0 ||
      entry.provider.ws.readyState === 1))
      {

        entry.provider.disconnect();
      }
      wsProviders.delete(key);
    }
    return entry.refCount;
  }
  return 0;
}

export interface CollaborativeRichTextBlockEditorProps {
  documentId: string;
  roomName?: string;
  userName?: string;
  initialValue?: RichTextBlock[];
  wsServerUrl?: string;
  debug?: boolean;
  readOnly?: boolean;
  disablePersistence?: boolean;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onConnectedUsersChange?: (
  users: {name: string;color: string;id: number;}[])
  => void;
  onLocalEdit?: (blocks: RichTextBlock[]) => void;
  onRemoteEdit?: (blocks: RichTextBlock[]) => void;
  className?: string;
  placeholder?: string;
  showOutline?: boolean;
  documentTitle?: string;
  onTitleChange?: (title: string) => void;
  lastEditTime?: Date;
  onBlockCommentClick?: (blockId: string) => void;
  getBlockCommentCount?: (blockId: string) => number;
  showCommentIndicators?: boolean;
  blockComments?: Array<{blockId: string;commentCount: number;}>;
}


export interface CollaborativeRichTextBlockEditorRef {
  getBlocks: () => RichTextBlock[];
  setBlocks: (blocks: RichTextBlock[]) => void;
  getYDoc: () => Y.Doc | null;
  getProvider: () => WebsocketProvider | null;
  getConnectionStatus: () => ConnectionStatus;
  getConnectedUsers: () => Array<{name: string;color: string;id: number;}>;
  setTitle: (title: string) => void;
  getTitle: () => string;
  cleanup: () => void;
}

export const CollaborativeRichTextBlockEditor = forwardRef<
  CollaborativeRichTextBlockEditorRef,
  CollaborativeRichTextBlockEditorProps>(

  (
  {
    documentId,
    roomName = 'default-room',
    userName = `用户-${nanoid(4)}`,
    initialValue = [],
    wsServerUrl = 'ws://localhost:1234',
    debug = false,
    readOnly = false,
    disablePersistence = false,
    onConnectionStatusChange,
    onConnectedUsersChange,
    onLocalEdit,
    onRemoteEdit,
    className = '',
    placeholder = '输入 / 快速创建各种内容...',
    showOutline = false,
    documentTitle = '',
    onTitleChange,
    lastEditTime,
    onBlockCommentClick,
    getBlockCommentCount,
    showCommentIndicators = false,
    blockComments = []
  },
  ref) =>
  {

    const ydocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const persistenceRef = useRef<IndexeddbPersistence | null>(null);
    const blocksRef = useRef<RichTextBlock[]>(initialValue);
    const yblockArrayRef = useRef<Y.Array<any> | null>(null);
    const ignoreRemoteChangesRef = useRef<boolean>(false);
    const reconnectAttemptsRef = useRef<number>(0);
    const maxReconnectAttempts = 5;
    const isInitialSyncRef = useRef<boolean>(true);
    const hasSyncedRef = useRef<boolean>(false);
    const userColorRef = useRef<string>(getRandomColor());
    const ytitleRef = useRef<Y.Text | null>(null);
    const cursorUpdateTimeoutRef = useRef<number | null>(null);
    const lastCursorPositionRef = useRef<UserCursor | null>(null);
    const cursorHeartbeatIntervalRef = useRef<number | null>(null);
    const cursorsPortalRef = useRef<HTMLElement | null>(null);


    const wsServerUrlRef = useRef<string>(wsServerUrl);
    const roomNameRef = useRef<string>(roomName);
    const documentIdRef = useRef<string>(documentId);
    const userNameRef = useRef<string>(userName);
    const disablePersistenceRef = useRef<boolean>(disablePersistence);
    const initialValueRef = useRef<RichTextBlock[]>(initialValue);
    const debugRef = useRef<boolean>(debug);
    const onConnectionStatusChangeRef = useRef(onConnectionStatusChange);
    const onConnectedUsersChangeRef = useRef(onConnectedUsersChange);
    const onLocalEditRef = useRef(onLocalEdit);
    const onRemoteEditRef = useRef(onRemoteEdit);
    const readOnlyRef = useRef<boolean>(readOnly);
    const placeholderRef = useRef<string>(placeholder);
    const onTitleChangeRef = useRef(onTitleChange);
    const documentTitleRef = useRef<string>(documentTitle);


    useEffect(() => {
      wsServerUrlRef.current = wsServerUrl;
      roomNameRef.current = roomName;
      documentIdRef.current = documentId;
      userNameRef.current = userName;
      disablePersistenceRef.current = disablePersistence;
      initialValueRef.current = initialValue;
      debugRef.current = debug;
      onConnectionStatusChangeRef.current = onConnectionStatusChange;
      onConnectedUsersChangeRef.current = onConnectedUsersChange;
      onLocalEditRef.current = onLocalEdit;
      onRemoteEditRef.current = onRemoteEdit;
      readOnlyRef.current = readOnly;
      placeholderRef.current = placeholder;
      onTitleChangeRef.current = onTitleChange;
      documentTitleRef.current = documentTitle;
    }, [
    wsServerUrl,
    roomName,
    documentId,
    userName,
    disablePersistence,
    initialValue,
    debug,
    onConnectionStatusChange,
    onConnectedUsersChange,
    onLocalEdit,
    onRemoteEdit,
    readOnly,
    placeholder,
    onTitleChange,
    documentTitle]
    );


    const [blocks, setBlocks] = useState<RichTextBlock[]>(initialValue);
    const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');
    const [connectedUsers, setConnectedUsers] = useState<
      Array<{name: string;color: string;id: number;}>>(
      []);
    const [remoteCursors, setRemoteCursors] = useState<
      Map<number, RemoteCursor>>(
      new Map());


    const log = useCallback((message: string, ...args: any[]) => {
      if (debugRef.current) {
        
      }
    }, []);


    useEffect(() => {
      try {

        const portalContainer = getOrCreatePortalContainer(
          BLOCK_CURSORS_PORTAL_ID,
          BLOCK_CURSORS_PORTAL_Z_INDEX
        );
        cursorsPortalRef.current = portalContainer;


        portalContainer.style.position = 'fixed';
        portalContainer.style.top = '0';
        portalContainer.style.left = '0';
        portalContainer.style.width = '100vw';
        portalContainer.style.height = '100vh';
        portalContainer.style.pointerEvents = 'none';
        portalContainer.style.zIndex = BLOCK_CURSORS_PORTAL_Z_INDEX.toString();

      } catch (error) {
        
      }

      return () => {
        try {

          removePortalContainer(BLOCK_CURSORS_PORTAL_ID);
          cursorsPortalRef.current = null;
        } catch (error) {
          
        }
      };
    }, [log]);


    const buildBlocksFromYArray = useCallback((yarray: Y.Array<any>) => {
      const newBlocks: RichTextBlock[] = [];
      for (let i = 0; i < yarray.length; i++) {
        const yblock = yarray.get(i);
        if (yblock) {
          newBlocks.push({
            id: yblock.id || nanoid(),
            type: yblock.type || 'paragraph',
            content: yblock.content || '',
            checked: yblock.checked,
            imageUrl: yblock.imageUrl
          });
        }
      }
      return newBlocks;
    }, []);


    const calculateCursorPosition = useCallback(() => {

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);


      let blockElement: HTMLElement | null = null;
      let currentNode: Node | null = range.startContainer;


      while (currentNode && !blockElement) {
        if (
        currentNode.nodeType === Node.ELEMENT_NODE &&
        (currentNode as HTMLElement).classList.contains(
          'rich-text-block-editor-block'
        ))
        {
          blockElement = currentNode as HTMLElement;
        }
        currentNode = currentNode.parentNode;
      }

      if (!blockElement) return null;


      const blockId = blockElement.getAttribute('data-block-id');
      if (!blockId) return null;


      const contentElement = blockElement.querySelector(
        '[contenteditable="true"]'
      ) as HTMLElement;
      if (!contentElement) return null;


      if (!contentElement.contains(range.startContainer)) return null;


      const preRange = document.createRange();
      preRange.selectNodeContents(contentElement);
      preRange.setEnd(range.startContainer, range.startOffset);
      const position = preRange.toString().length;


      let selection_info = undefined;
      if (!range.collapsed) {
        const selRange = document.createRange();
        selRange.selectNodeContents(contentElement);
        selRange.setEnd(range.endContainer, range.endOffset);
        const selectionEnd = selRange.toString().length;

        selection_info = {
          start: position,
          end: selectionEnd
        };
      }

      return {
        blockId,
        position,
        selection: selection_info
      };
    }, [log]);


    const updateCursorPosition = useCallback(() => {
      if (readOnlyRef.current || !providerRef.current?.awareness) return;


      if (cursorUpdateTimeoutRef.current !== null) {
        window.clearTimeout(cursorUpdateTimeoutRef.current);
      }


      cursorUpdateTimeoutRef.current = window.setTimeout(() => {
        const cursorData = calculateCursorPosition();
        if (!cursorData) return;


        const cursorWithTimestamp: UserCursor = {
          ...cursorData,
          timestamp: Date.now()
        };


        lastCursorPositionRef.current = cursorWithTimestamp;


        const currentAwarenessState =
        providerRef.current?.awareness.getLocalState() || {};


        const userJson = localStorage.getItem('user');
        const currentUser = userJson ? JSON.parse(userJson) : {};

        providerRef.current?.awareness.setLocalState({
          ...currentAwarenessState,
          user: {
            name: userNameRef.current,
            color: userColorRef.current,
            id: currentUser.id,
            email: currentUser.email,
            avatar: currentUser.avatar
          },
          cursor: cursorWithTimestamp
        });

      }, 50);
    }, [calculateCursorPosition, log]);


    const forceSendCursorPosition = useCallback(() => {
      if (readOnlyRef.current || !providerRef.current?.awareness) return;

      const cursorData =
      lastCursorPositionRef.current || calculateCursorPosition();
      if (!cursorData) return;


      const cursorWithTimestamp: UserCursor = {
        ...cursorData,
        timestamp: Date.now()
      };
      lastCursorPositionRef.current = cursorWithTimestamp;


      const currentAwarenessState =
      providerRef.current.awareness.getLocalState() || {};


      const userJson = localStorage.getItem('user');
      const currentUser = userJson ? JSON.parse(userJson) : {};

      providerRef.current.awareness.setLocalState({
        ...currentAwarenessState,
        user: {
          name: userNameRef.current,
          color: userColorRef.current,
          id: currentUser.id,
          email: currentUser.email,
          avatar: currentUser.avatar
        },
        cursor: cursorWithTimestamp
      });

      if (debugRef.current) {
      }
    }, [calculateCursorPosition, log]);


    const updateLocalBlocks = useCallback(
      (newBlocks: RichTextBlock[]) => {

        if (JSON.stringify(newBlocks) !== JSON.stringify(blocksRef.current)) {
          setBlocks(newBlocks);
          blocksRef.current = newBlocks;
        }
      },
      [log]
    );


    useImperativeHandle(
      ref,
      () => ({
        getBlocks: () => blocks,
        setBlocks: (newBlocks: RichTextBlock[]) => {
          if (!ydocRef.current || !yblockArrayRef.current) return;


          ignoreRemoteChangesRef.current = true;

          try {

            ydocRef.current.transact(() => {

              const yblockArray = yblockArrayRef.current!;
              yblockArray.delete(0, yblockArray.length);
              yblockArray.insert(
                0,
                newBlocks.map((block) => ({
                  id: block.id,
                  type: block.type,
                  content: block.content,
                  checked: block.checked,
                  imageUrl: block.imageUrl
                }))
              );
            });


            updateLocalBlocks(newBlocks);
          } catch (err) {
          }


          setTimeout(() => {
            ignoreRemoteChangesRef.current = false;
          }, 50);
        },
        getYDoc: () => ydocRef.current,
        getProvider: () => providerRef.current,
        getConnectionStatus: () => connectionStatus,
        getConnectedUsers: () => connectedUsers,
        setTitle: (newTitle: string) => {
          if (!ydocRef.current) return;


          const ytitle = ydocRef.current.getText('title');
          const currentTitle = ytitle.toString();


          if (newTitle === currentTitle) {
            return;
          }


          ignoreRemoteChangesRef.current = true;

          try {

            ytitle.delete(0, ytitle.length);
            ytitle.insert(0, newTitle);
          } catch (err) {
          }


          setTimeout(() => {
            ignoreRemoteChangesRef.current = false;
          }, 50);
        },
        getTitle: () => {
          if (!ydocRef.current) return '';
          return ydocRef.current.getText('title').toString();
        },
        cleanup: () => {

          if (providerRef.current) {

            if (
            providerRef.current.ws && (
            providerRef.current.ws.readyState === 0 ||
            providerRef.current.ws.readyState === 1))
            {

              providerRef.current.disconnect();
            } else {
            }
          }


          const docId = documentIdRef.current;
          const roomNameValue = roomNameRef.current;
          const wsUrl = wsServerUrlRef.current;
          const docKey = `${roomNameValue}-${docId}`;
          const persistenceKey = `collaborative-blocks-${docKey}`;
          const providerKey = `${wsUrl}-${roomNameValue}-${docId}`;

          const providerRefCount = releaseProvider(providerKey);

          if (!disablePersistenceRef.current && persistenceRef.current) {

            const persistenceRefCount = releasePersistence(persistenceKey);
          }

          const docRefCount = releaseYDoc(docKey);
          providerRef.current = null;
          persistenceRef.current = null;
          ydocRef.current = null;
          yblockArrayRef.current = null;
        }
      }),
      [blocks, connectionStatus, connectedUsers, updateLocalBlocks, log]
    );


    const createWebsocketProvider = useCallback(
      (ydoc: Y.Doc) => {
        try {
          const wsUrl = wsServerUrlRef.current;
          const roomNameValue = roomNameRef.current;
          const docId = documentIdRef.current;
          const disablePersistenceValue = disablePersistenceRef.current;
          const userNameValue = userNameRef.current;

          const websocketOpts = {
            disableBc: true,
            maxBackoffTime: 5000
          };

          if (disablePersistenceValue) {
            // @ts-ignore
            websocketOpts.connect = false;
          }


          const roomId = `${roomNameValue}-${docId}`.replace(
            /[^a-zA-Z0-9_-]/g,
            '-'
          );

          const provider = new WebsocketProvider(
            wsUrl,
            roomId,
            ydoc,
            websocketOpts
          );


          const userJson = localStorage.getItem('user');
          const currentUser = userJson ? JSON.parse(userJson) : {};

          provider.awareness.setLocalStateField('user', {
            name: userNameValue,
            color: userColorRef.current,
            id: currentUser.id,
            email: currentUser.email,
            avatar: currentUser.avatar
          });

          return provider;
        } catch (err) {
        
          return null;
        }
      },
      [log]
    );


    useEffect(() => {

      let isMounted = true;

      const docId = documentIdRef.current;
      const roomNameValue = roomNameRef.current;

      reconnectAttemptsRef.current = 0;
      isInitialSyncRef.current = true;
      hasSyncedRef.current = false;


      const docKey = `${roomNameValue}-${docId}`;
      const { doc: ydoc, isNew: isNewDoc } = getOrCreateYDoc(docKey);
      ydocRef.current = ydoc;


      const yblockArray = ydoc.getArray<{
        id: string;
        type: string;
        content: string;
        checked?: boolean;
        imageUrl?: string;
      }>('blocks');
      yblockArrayRef.current = yblockArray;


      const ytitle = ydoc.getText('title');
      ytitleRef.current = ytitle;


      if (!disablePersistenceRef.current) {
        try {
          const persistenceKey = `collaborative-blocks-${docKey}`;
          const { persistence, isNew: isNewPersistence } =
          getOrCreatePersistence(persistenceKey, ydoc);
          persistenceRef.current = persistence;

          if (isNewPersistence) {
            persistence.on('synced', () => {
            });
          }
        } catch (err) {
          
        }
      }


      const wsUrl = wsServerUrlRef.current;
      const providerKey = `${wsUrl}-${roomNameValue}-${docId}`;


      const roomId = `${roomNameValue}-${docId}`.replace(
        /[^a-zA-Z0-9_-]/g,
        '-'
      );


      const websocketOpts = {
        disableBc: true,
        maxBackoffTime: 5000,
        connect: false
      };

      const { provider, isNew: isNewProvider } = getOrCreateProvider(
        providerKey,
        wsUrl,
        roomId,
        ydoc,
        websocketOpts
      );

      log(
        isNewProvider ?
        '创建新的WebSocket提供程序' :
        '使用现有的WebSocket提供程序'
      );

      if (!provider) {
        setConnectionStatus('disconnected');
        if (onConnectionStatusChangeRef.current) {
          onConnectionStatusChangeRef.current('disconnected');
        }
        return;
      }

      providerRef.current = provider;


      const userJson = localStorage.getItem('user');

      const currentUser = userJson ? JSON.parse(userJson) : {};

      const userAwareness = {
        name: userNameRef.current,
        color: userColorRef.current,
        id: currentUser.id,
        email: currentUser.email,
        avatar: currentUser.avatar
      };

      provider.awareness.setLocalStateField('user', userAwareness);


      const handleSync = (isSynced: boolean) => {
        if (!isMounted) return;

        if (isSynced) {
          hasSyncedRef.current = true;


          if (isInitialSyncRef.current) {

            const initialBlocks = initialValueRef.current;
            if (yblockArray.length === 0 && initialBlocks.length > 0) {
             
              ydoc.transact(() => {
                yblockArray.insert(
                  0,
                  initialBlocks.map((block) => ({
                    id: block.id,
                    type: block.type,
                    content: block.content,
                    checked: block.checked,
                    imageUrl: block.imageUrl
                  }))
                );
              });
            } else if (yblockArray.length > 0) {

              const syncedBlocks = buildBlocksFromYArray(yblockArray);
              
              updateLocalBlocks(syncedBlocks);
            }


            const ytitle = ytitleRef.current;
            const initialTitle = documentTitleRef.current;
            if (ytitle && ytitle.toString() === '' && initialTitle) {
              ytitle.insert(0, initialTitle);
            }

            isInitialSyncRef.current = false;
          }
        }
      };

      provider.on('sync', handleSync);


      const handleStatusChanged = ({
        status


      }: {status: 'connecting' | 'connected' | 'disconnected';}) => {
        if (!isMounted) return;

        setConnectionStatus(status);


        if (onConnectionStatusChangeRef.current) {
          onConnectionStatusChangeRef.current(status);
        }


        if (status === 'disconnected') {

          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              10000
            );
            
            setTimeout(() => {
              if (!isMounted) return;

              if (
              provider &&
              provider.shouldConnect &&
              shouldConnectWebSocket(provider))
              {
                provider.connect();
              }
            }, delay);
          } else {
          }
        } else if (status === 'connected') {

          reconnectAttemptsRef.current = 0;
        }
      };

      provider.on('status', handleStatusChanged);


      const handleConnectionError = (err: Error) => {
        if (!isMounted) return;
        
      };

      // @ts-ignore
      provider.on('connection-error', handleConnectionError);


      const handleAwarenessChange = () => {
        if (!isMounted) return;

        const states = provider.awareness.getStates();
        const users: Array<{name: string;color: string;id: number;}> = [];
        const newRemoteCursors = new Map<number, RemoteCursor>();

        states.forEach((state, clientId) => {

          if (clientId === provider.doc.clientID) return;

          if (state.user) {

            users.push({
              id: clientId,
              name: state.user.name,
              color: state.user.color
            });


            if (state.cursor) {
              const remoteCursorData = {
                id: clientId,
                name: state.user.name,
                color: state.user.color,
                email: state.user.email,
                avatar: state.user.avatar,
                cursor: {
                  blockId: state.cursor.blockId,
                  position: state.cursor.position,
                  selection: state.cursor.selection,
                  timestamp: state.cursor.timestamp || Date.now()
                }
              };

              newRemoteCursors.set(clientId, remoteCursorData);
            }
          }
        });

        setConnectedUsers(users);

        setRemoteCursors(newRemoteCursors);

        if (onConnectedUsersChangeRef.current) {
          onConnectedUsersChangeRef.current(users);
        }
      };

      provider.awareness.on('change', handleAwarenessChange);


      const handleTitleChange = (event: Y.YTextEvent) => {
        if (!isMounted) return;


        if (ignoreRemoteChangesRef.current) {
          return;
        }

        const newTitle = event.target.toString();
        
        if (onTitleChangeRef.current) {
          onTitleChangeRef.current(newTitle);
        }
      };

      ytitle.observe(handleTitleChange);


      handleAwarenessChange();


      const handleBlockArrayChange = (event: Y.YArrayEvent<any>) => {
        if (!isMounted) return;

        try {

          if (ignoreRemoteChangesRef.current || !hasSyncedRef.current) {
            return;
          }


          const newBlocks = buildBlocksFromYArray(yblockArray);

          updateLocalBlocks(newBlocks);


          setTimeout(() => {
            if (!isMounted) return;

            if (onRemoteEditRef.current) {
              onRemoteEditRef.current(newBlocks);
            }
          }, 0);
        } catch (err) {
        }
      };

      yblockArray.observe(handleBlockArrayChange);


      const connectTimeout = setTimeout(() => {
        if (isMounted && shouldConnectWebSocket(provider)) {
          provider.connect();
        }
      }, 100);


      return () => {
        isMounted = false;

        clearTimeout(connectTimeout);
        if (provider) {
          provider.off('sync', handleSync);
          provider.awareness.off('change', handleAwarenessChange);
          provider.off('status', handleStatusChanged);
          // @ts-ignore
          provider.off('connection-error', handleConnectionError);
        }

        if (yblockArray) {
          yblockArray.unobserve(handleBlockArrayChange);
        }


        const ytitle = ydoc.getText('title');
        if (ytitle) {
          ytitle.unobserve(handleTitleChange);
        }


        const docKey = `${roomNameValue}-${docId}`;
        const persistenceKey = `collaborative-blocks-${docKey}`;
        const providerKey = `${wsUrl}-${roomNameValue}-${docId}`;

        const providerRefCount = releaseProvider(providerKey);

        if (!disablePersistenceRef.current) {
          const persistenceRefCount = releasePersistence(persistenceKey);
        }

        const docRefCount = releaseYDoc(docKey);

        providerRef.current = null;
        persistenceRef.current = null;
        ydocRef.current = null;
        yblockArrayRef.current = null;
      };
    }, [documentId, log]);



    const handleBlocksChange = useCallback(
      (newBlocks: RichTextBlock[]) => {
        if (!ydocRef.current || !yblockArrayRef.current || readOnlyRef.current)
        return;


        ignoreRemoteChangesRef.current = true;

        try {

          const activeElement = document.activeElement;
          let activeBlockId = null;
          let cursorPosition = null;
          let domPath: number[] | undefined = undefined;
          let nodeType: number | undefined = undefined;
          let textContent: string | null | undefined = undefined;
          let savedRange: Range | undefined = undefined;
          let nodeValue: string | null | undefined = undefined;


          if (activeElement) {
            const blockElement = activeElement.closest(
              '.rich-text-block-editor-block'
            );
            if (blockElement) {
              activeBlockId = blockElement.getAttribute('data-block-id');


              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                savedRange = selection.getRangeAt(0);
                cursorPosition = savedRange.startOffset;


                if (savedRange.startContainer.nodeType === Node.TEXT_NODE) {
                  nodeType = Node.TEXT_NODE;
                  nodeValue = savedRange.startContainer.nodeValue;


                  let node: Node | null = savedRange.startContainer;
                  domPath = [];
                  while (node && node !== blockElement) {
                    let index = 0;
                    let sibling = node.previousSibling;
                    while (sibling) {
                      index++;
                      sibling = sibling.previousSibling;
                    }
                    domPath.unshift(index);
                    node = node.parentNode;
                  }
                }
              }
            }
          }


          const processedBlocks = newBlocks.map((block) => {

            if (!block.id || block.id.length < 10) {

              return {
                ...block,
                id: `${documentIdRef.current}-${Date.now()}-${nanoid(8)}`
              };
            }
            return block;
          });


          const idSet = new Set<string>();
          const uniqueBlocks = processedBlocks.map((block) => {
            if (idSet.has(block.id)) {

              return {
                ...block,
                id: `${documentIdRef.current}-${Date.now()}-${nanoid(8)}`
              };
            }
            idSet.add(block.id);
            return block;
          });


          ydocRef.current.transact(() => {
            const yblockArray = yblockArrayRef.current!;
            yblockArray.delete(0, yblockArray.length);
            yblockArray.insert(
              0,
              uniqueBlocks.map((block) => ({
                id: block.id,
                type: block.type,
                content: block.content,
                checked: block.checked,
                imageUrl: block.imageUrl
              }))
            );
          });


          updateLocalBlocks(uniqueBlocks);


          setTimeout(() => {
            setRemoteCursors((prevCursors) => new Map(prevCursors));
          }, 10);


          setTimeout(() => {
            if (onLocalEditRef.current) {
              onLocalEditRef.current(uniqueBlocks);
            }
          }, 0);


          setTimeout(() => {
            ignoreRemoteChangesRef.current = false;


            if (activeBlockId && savedRange) {
              try {

                const blockElement = document.querySelector(
                  `.rich-text-block-editor-block[data-block-id="${activeBlockId}"]`
                );
                if (blockElement) {

                  if (domPath && nodeType === Node.TEXT_NODE) {

                    let targetNode: Node = blockElement;
                    for (let i = 0; i < domPath.length && targetNode; i++) {
                      const childNodes = targetNode.childNodes;
                      if (domPath[i] < childNodes.length) {
                        targetNode = childNodes[domPath[i]];
                      } else {
                        break;
                      }
                    }


                    if (targetNode && targetNode.nodeType === Node.TEXT_NODE) {
                      const range = document.createRange();
                      const offset = Math.min(
                        cursorPosition || 0,
                        targetNode.textContent?.length || 0
                      );
                      range.setStart(targetNode, offset);
                      range.setEnd(targetNode, offset);

                      const selection = window.getSelection();
                      if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);


                        const editableElement = blockElement.querySelector(
                          '[contenteditable="true"]'
                        );
                        if (editableElement) {
                          (editableElement as HTMLElement).focus();
                        }
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
          }, 50);
        } catch (err) {
        }
      },
      [updateLocalBlocks, log]
    );


    const handleTitleChange = useCallback(
      (newTitle: string) => {
        if (!ydocRef.current || readOnlyRef.current) return;


        const ytitle = ydocRef.current.getText('title');
        const currentTitle = ytitle.toString();


        if (newTitle === currentTitle) {
          return;
        }


        ignoreRemoteChangesRef.current = true;

        try {

          ytitle.delete(0, ytitle.length);
          ytitle.insert(0, newTitle);

        } catch (err) {
        }


        setTimeout(() => {
          ignoreRemoteChangesRef.current = false;
        }, 50);
      },
      [log]
    );


    function getRandomColor() {
      const colors = [
      '#5D8AA8',
      '#E32636',
      '#FFBF00',
      '#9966CC',
      '#A4C639',
      '#CD9575',
      '#915C83',
      '#008000',
      '#536878',
      '#89CFF0',
      '#F4C2C2',
      '#FBCEB1',
      '#00FFFF',
      '#7FFFD4',
      '#4B5320',
      '#E9D66B',
      '#B2BEB5',
      '#87A96B',
      '#FF9966',
      '#007FFF',
      '#F5F5DC',
      '#CB4154',
      '#3D2B1F',
      '#1B1B1B',
      '#ACE1AF',
      '#D2691E',
      '#2A52BE',
      '#6D9BC3',
      '#007AA5',
      '#E03C31'];

      return colors[Math.floor(Math.random() * colors.length)];
    }


    useEffect(() => {
      if (readOnlyRef.current) return;


      cursorHeartbeatIntervalRef.current = window.setInterval(() => {
        forceSendCursorPosition();
      }, 5000);

      return () => {
        if (cursorHeartbeatIntervalRef.current !== null) {
          window.clearInterval(cursorHeartbeatIntervalRef.current);
          cursorHeartbeatIntervalRef.current = null;
        }
      };
    }, [forceSendCursorPosition]);


    useEffect(() => {
      if (readOnlyRef.current) return;


      const handleSelectionChange = () => {
        updateCursorPosition();
      };


      const handleDocumentEvents = (e: Event) => {
        if (e.type === 'mouseup' || e.type === 'keyup') {
          updateCursorPosition();
        }
      };

      document.addEventListener('selectionchange', handleSelectionChange);
      document.addEventListener('mouseup', handleDocumentEvents);
      document.addEventListener('keyup', handleDocumentEvents);

      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        document.removeEventListener('mouseup', handleDocumentEvents);
        document.removeEventListener('keyup', handleDocumentEvents);

        if (cursorUpdateTimeoutRef.current !== null) {
          window.clearTimeout(cursorUpdateTimeoutRef.current);
        }
      };
    }, [updateCursorPosition]);


    const calculateCursorPositionInBlock = useCallback(
      (blockElement: Element, position: number) => {

        const contentElement = blockElement.querySelector(
          '[contenteditable="true"]'
        ) as HTMLElement;
        if (!contentElement) return { left: 0, top: 0 };

        try {

          const range = document.createRange();
          let currentPos = 0;
          let found = false;


          const walker = document.createTreeWalker(
            contentElement,
            NodeFilter.SHOW_TEXT,
            null
          );

          let node = walker.nextNode();
          while (node && !found) {
            const nodeLength = node.textContent?.length || 0;


            if (currentPos + nodeLength >= position) {
              const offset = position - currentPos;
              range.setStart(node, offset);
              range.setEnd(node, offset);
              found = true;
              break;
            }

            currentPos += nodeLength;
            node = walker.nextNode();
          }


          if (!found) {
            if (contentElement.firstChild) {
              range.setStart(contentElement.firstChild, 0);
              range.setEnd(contentElement.firstChild, 0);
            } else {
              range.setStart(contentElement, 0);
              range.setEnd(contentElement, 0);
            }
          }


          const rect = range.getBoundingClientRect();


          return {
            left: rect.left,
            top: rect.top
          };
        } catch (e) {

          const rect = blockElement.getBoundingClientRect();
          return {
            left: rect.left + 5,
            top: rect.top + 5
          };
        }
      },
      []
    );


    const calculateSelectionRect = useCallback(
      (blockElement: Element, start: number, end: number) => {

        const contentElement = blockElement.querySelector(
          '[contenteditable="true"]'
        ) as HTMLElement;
        if (!contentElement) return null;


        const range = document.createRange();
        let startNode: Node | null = null;
        let startOffset = 0;
        let endNode: Node | null = null;
        let endOffset = 0;


        let currentPos = 0;


        const walker = document.createTreeWalker(
          contentElement,
          NodeFilter.SHOW_TEXT,
          null
        );

        let node = walker.nextNode();
        while (node) {
          const nodeLength = node.textContent?.length || 0;


          if (!startNode && currentPos + nodeLength >= start) {
            startNode = node;
            startOffset = start - currentPos;
          }


          if (!endNode && currentPos + nodeLength >= end) {
            endNode = node;
            endOffset = end - currentPos;
            break;
          }

          currentPos += nodeLength;
          node = walker.nextNode();
        }


        if (!startNode || !endNode) return null;

        try {

          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);


          const rects = range.getClientRects();

          if (rects.length === 0) return null;


          const selectionRects = [];
          for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            selectionRects.push({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,

              rectId: `${Date.now()}-${Math.random().
              toString(36).
              substr(2, 9)}-${i}`
            });
          }

          return selectionRects;
        } catch (e) {
          return null;
        }
      },
      [log]
    );


    useEffect(() => {

      let rafId: number | null = null;
      let lastUpdateTime = 0;
      const throttleInterval = 16;

      const updateCursorsPosition = () => {
        const now = performance.now();
        if (now - lastUpdateTime < throttleInterval) {

          rafId = requestAnimationFrame(updateCursorsPosition);
          return;
        }

        setRemoteCursors((prevCursors) => new Map(prevCursors));
        lastUpdateTime = now;
        rafId = null;
      };

      const handleScroll = () => {
        if (rafId === null) {
          rafId = requestAnimationFrame(updateCursorsPosition);
        }
      };


      window.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });


      const blockObserver = new IntersectionObserver(
        (entries) => {
          if (
          entries.some(
            (entry) => entry.isIntersecting || entry.intersectionRatio > 0
          ))
          {
            if (rafId === null) {
              rafId = requestAnimationFrame(updateCursorsPosition);
            }
          }
        },
        {
          threshold: [0, 0.1, 0.5, 1.0],
          rootMargin: '100px'
        }
      );


      document.
      querySelectorAll('.rich-text-block-editor-block').
      forEach((block) => {
        blockObserver.observe(block);
      });


      const domObserver = new MutationObserver((mutations) => {

        let shouldUpdate = false;

        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (
              node instanceof HTMLElement &&
              node.classList.contains('rich-text-block-editor-block'))
              {
                blockObserver.observe(node);
                shouldUpdate = true;
              }
            });
          } else if (mutation.type === 'characterData') {

            shouldUpdate = true;
          }
        });


        if (shouldUpdate && rafId === null) {
          rafId = requestAnimationFrame(updateCursorsPosition);
        }
      });


      const editorContainer = document.querySelector(
        '.collaborative-rich-text-block-editor'
      );
      if (editorContainer) {
        domObserver.observe(editorContainer, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }


      const handleMouseMove = () => {

        if (rafId === null) {
          rafId = requestAnimationFrame(() => {

            rafId = requestAnimationFrame(updateCursorsPosition);
          });
        }
      };


      document.addEventListener('mousemove', handleMouseMove, {
        passive: true,
        capture: true
      });

      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
        document.removeEventListener('mousemove', handleMouseMove, {
          capture: true
        });
        blockObserver.disconnect();
        domObserver.disconnect();
      };
    }, []);


    useEffect(() => {

      let updateInterval: number;
      let lastActivityTime = Date.now();


      const handleUserActivity = () => {
        lastActivityTime = Date.now();
      };


      document.addEventListener('mousemove', handleUserActivity, {
        passive: true
      });
      document.addEventListener('keydown', handleUserActivity, {
        passive: true
      });
      document.addEventListener('click', handleUserActivity, { passive: true });
      document.addEventListener('scroll', handleUserActivity, {
        passive: true
      });


      const scheduleNextUpdate = () => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivityTime;


        const interval = timeSinceActivity < 5000 ? 200 : 1000;

        updateInterval = window.setTimeout(() => {
          setRemoteCursors((prevCursors) => new Map(prevCursors));
          scheduleNextUpdate();
        }, interval);
      };


      scheduleNextUpdate();

      return () => {
        clearTimeout(updateInterval);
        document.removeEventListener('mousemove', handleUserActivity);
        document.removeEventListener('keydown', handleUserActivity);
        document.removeEventListener('click', handleUserActivity);
        document.removeEventListener('scroll', handleUserActivity);
      };
    }, []);

    return (
      <div className={`collaborative-rich-text-block-editor ${className}`}>
        {}
        <div className="connection-status flex items-center mb-2 text-sm">
          {







          }
          {





          }

          {}
          {















          }
        </div>

        {}
        <div className="relative">
          <RichTextBlockEditor
            initialValue={blocks}
            onChange={handleBlocksChange}
            readOnly={readOnly}
            className={className}
            placeholder={placeholder}
            debug={debug}
            showOutline={showOutline}
            documentTitle={documentTitle}
            onTitleChange={handleTitleChange}
            lastEditTime={lastEditTime}
            collaborators={connectedUsers}
            onBlockCommentClick={onBlockCommentClick}
            getBlockCommentCount={getBlockCommentCount}
            showCommentIndicators={showCommentIndicators}
            blockComments={blockComments} />


          {}
          {remoteCursors.size > 0 &&
          cursorsPortalRef.current &&
          ReactDOM.createPortal(
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
                {Array.from(remoteCursors.values()).map((cursor) => {
                if (!cursor.cursor) return null;


                const now = Date.now();
                const cursorAge = cursor.cursor.timestamp ?
                now - cursor.cursor.timestamp :
                0;
                const maxCursorAge = 1000 * 60 * 5;
                const isValid =
                !cursor.cursor.timestamp || cursorAge < maxCursorAge;

                if (!isValid) return null;


                const blockElement = document.querySelector(
                  `.rich-text-block-editor-block[data-block-id="${cursor.cursor.blockId}"]`
                );
                if (!blockElement) return null;


                const cursorPosition = calculateCursorPositionInBlock(
                  blockElement,
                  cursor.cursor.position
                );


                const contentElement = blockElement.querySelector(
                  '[contenteditable="true"]'
                ) as HTMLElement;
                const computedStyle = contentElement ?
                window.getComputedStyle(contentElement) :
                null;
                const fontSize = computedStyle ?
                parseInt(computedStyle.fontSize) :
                16;
                const cursorHeight = Math.round(fontSize * 1.2);


                const cursorKey = `cursor-${cursor.id}-${now}`;

                return (
                  <React.Fragment key={cursorKey}>
                      {}
                      <RemoteCursorWithAvatar
                      user={{
                        id: cursor.id.toString(),
                        name: cursor.name,
                        color: cursor.color,
                        email: cursor.email,
                        avatar: cursor.avatar
                      }}
                      position={{
                        left: cursorPosition.left,
                        top: cursorPosition.top
                      }}
                      className="fixed z-90 will-change-transform" />


                      {}
                      {cursor.cursor.selection &&
                    cursor.cursor.selection.start !==
                    cursor.cursor.selection.end &&
                    <>
                            {(() => {
                        const selectionRects = calculateSelectionRect(
                          blockElement,
                          cursor.cursor.selection.start,
                          cursor.cursor.selection.end
                        );

                        if (!selectionRects) return null;

                        return selectionRects.map((rect) =>
                        <div
                          key={`selection-${cursor.id}-${rect.rectId}`}
                          className="fixed pointer-events-none will-change-transform"
                          style={{
                            backgroundColor: `${cursor.color}33`,
                            transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
                            width: `${rect.width}px`,
                            height: `${rect.height}px`,
                            zIndex: 89
                          }} />

                        );
                      })()}
                          </>
                    }
                    </React.Fragment>);

              })}
              </div>,
            cursorsPortalRef.current
          )}
        </div>
      </div>);

  }
);

CollaborativeRichTextBlockEditor.displayName =
'CollaborativeRichTextBlockEditor';
