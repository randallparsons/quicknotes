import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE.replace(/\/api\/?$/, '');

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [childItems, setChildItems] = useState([]);
  const [childStatus, setChildStatus] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaStatus, setMediaStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [status, setStatus] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    setSelectedFile(null);
    setUploadStatus('');
    setFileInputKey((prevKey) => prevKey + 1);

    if (!selectedId) {
      setMediaItems([]);
      setChildItems([]);
      setChildStatus('');
      return;
    }

    loadChildItems(selectedId);
    loadMediaForItem(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    const timeout = setTimeout(() => {
      saveItem();
    }, 600);

    return () => clearTimeout(timeout);
  }, [title, description]);

  function getMediaUrl(fileUrl) {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${SERVER_BASE}${fileUrl}`;
  }

  async function checkSession() {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        credentials: 'include'
      });

      if (!response.ok) return;

      const data = await response.json();
      setUser(data.user);
      await loadItems();
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  async function loadItems() {
    try {
      const response = await fetch(`${API_BASE}/items`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load HyperList items');
      }

      const data = await response.json();
      setItems(data);

      if (data.length > 0) {
        const firstItem = data[0];
        setSelectedId(firstItem.id);
        setTitle(firstItem.title);
        setDescription(firstItem.description || '');
      } else {
        setSelectedId(null);
        setTitle('');
        setDescription('');
      }
    } catch (error) {
      console.error('Load HyperList items failed:', error);
      setStatus('Failed to load HyperList items.');
    }
  }

  async function loadChildItems(parentId) {
    try {
      setChildStatus('Loading child items...');

      const response = await fetch(`${API_BASE}/items?parentId=${parentId}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load child items');
      }

      setChildItems(data);
      setChildStatus(data.length === 0 ? 'No child items yet.' : '');
    } catch (error) {
      console.error('Load child items failed:', error);
      setChildItems([]);
      setChildStatus('Failed to load child items.');
    }
  }

  async function createChildItem() {
    if (!selectedId) {
      setStatus('Select an item before creating a child item.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Untitled Child Item',
          description: '',
          parentId: selectedId
        })
      });

      const newItem = await response.json();

      if (!response.ok) {
        throw new Error(newItem.error || 'Failed to create child item');
      }

      setChildItems((prevItems) => [newItem, ...prevItems]);
      setChildStatus('');
      setStatus('New child item created.');
    } catch (error) {
      console.error('Create child item failed:', error);
      setStatus('Failed to create child item.');
    }
  }

  async function loadMediaForItem(itemId) {
    try {
      setMediaStatus('Loading media...');

      const response = await fetch(`${API_BASE}/media/item/${itemId}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load media');
      }

      setMediaItems(data);
      setMediaStatus(data.length === 0 ? 'No media attached yet.' : '');
    } catch (error) {
      console.error('Load media failed:', error);
      setMediaItems([]);
      setMediaStatus('Failed to load media.');
    }
  }

  async function handleMediaUpload(event) {
    event.preventDefault();

    if (!selectedId) {
      setUploadStatus('Select a HyperList item before uploading media.');
      return;
    }

    if (!selectedFile) {
      setUploadStatus('Choose an image, video, or audio file first.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('Uploading...');

      const formData = new FormData();
      formData.append('itemId', selectedId);
      formData.append('media', selectedFile);

      const response = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Media upload failed');
      }

      setSelectedFile(null);
      setFileInputKey((prevKey) => prevKey + 1);
      setUploadStatus(`Uploaded ${data.original_name}`);
      await loadMediaForItem(selectedId);
    } catch (error) {
      console.error('Media upload failed:', error);
      setUploadStatus(error.message || 'Media upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setStatus('');

    const endpoint = authMode === 'login' ? 'login' : 'register';

    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || 'Authentication failed');
        return;
      }

      if (authMode === 'register') {
        setStatus('Registration successful. Please log in.');
        setAuthMode('login');
        return;
      }

      setUser(data.user);
      setEmail('');
      setPassword('');
      setStatus('Login successful.');
      await loadItems();
    } catch (error) {
      console.error('Auth error:', error);
      setStatus('Something went wrong.');
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      setUser(null);
      setItems([]);
      setSelectedId(null);
      setTitle('');
      setDescription('');
      setMediaItems([]);
      setMediaStatus('');
      setChildItems([]);
      setChildStatus('');
      setStatus('Logged out.');
    } catch (error) {
      console.error('Logout failed:', error);
      setStatus('Logout failed.');
    }
  }

  function selectItem(item) {
    setSelectedId(item.id);
    setTitle(item.title);
    setDescription(item.description || '');
  }

  async function goUpOneLevel() {
    if (!selectedId) return;

    try {
      const currentResponse = await fetch(`${API_BASE}/items/${selectedId}`, {
        credentials: 'include'
      });

      const currentItem = await currentResponse.json();

      if (!currentResponse.ok) {
        throw new Error(currentItem.error || 'Failed to check current item');
      }

      if (!currentItem.parent_id) {
        setStatus('Already at the root level.');
        return;
      }

      const parentResponse = await fetch(`${API_BASE}/items/${currentItem.parent_id}`, {
        credentials: 'include'
      });

      const parentItem = await parentResponse.json();

      if (!parentResponse.ok) {
        throw new Error(parentItem.error || 'Failed to load parent item');
      }

      selectItem(parentItem);
      setStatus('Moved up one level.');
    } catch (error) {
      console.error('Move up one level failed:', error);
      setStatus('Failed to move up one level.');
    }
  }

  async function createItem() {
    try {
      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Untitled Item',
          description: '',
          parentId: null
        })
      });

      const newItem = await response.json();

      if (!response.ok) {
        throw new Error(newItem.error || 'Failed to create HyperList item');
      }

      const updatedItems = [newItem, ...items];
      setItems(updatedItems);
      setSelectedId(newItem.id);
      setTitle(newItem.title);
      setDescription(newItem.description || '');
      setStatus('New HyperList item created.');
    } catch (error) {
      console.error('Create HyperList item failed:', error);
      setStatus('Failed to create HyperList item.');
    }
  }

  async function saveItem() {
    if (!selectedId) return;

    try {
      const response = await fetch(`${API_BASE}/items/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ title, description })
      });

      const updatedItem = await response.json();

      if (!response.ok) {
        throw new Error(updatedItem.error || 'Failed to save HyperList item');
      }

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === selectedId ? updatedItem : item
        )
      );

      setStatus('Saved');
    } catch (error) {
      console.error('Save HyperList item failed:', error);
      setStatus('Failed to save HyperList item.');
    }
  }

  async function deleteItem() {
    if (!selectedId) return;

    try {
      const response = await fetch(`${API_BASE}/items/${selectedId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete HyperList item');
      }

      const updatedItems = items.filter((item) => item.id !== selectedId);
      setItems(updatedItems);

      if (updatedItems.length > 0) {
        const nextItem = updatedItems[0];
        setSelectedId(nextItem.id);
        setTitle(nextItem.title);
        setDescription(nextItem.description || '');
      } else {
        setSelectedId(null);
        setTitle('');
        setDescription('');
        setMediaItems([]);
      }

      setStatus('HyperList item deleted.');
    } catch (error) {
      console.error('Delete HyperList item failed:', error);
      setStatus('Failed to delete HyperList item.');
    }
  }

  function renderMediaItem(media) {
    const mediaUrl = getMediaUrl(media.file_url);

    if (media.media_type === 'image') {
      return (
        <img
          src={mediaUrl}
          alt={media.original_name}
          className="media-preview-image"
        />
      );
    }

    if (media.media_type === 'video') {
      return (
        <video
          src={mediaUrl}
          className="media-preview-video"
          controls
        />
      );
    }

    if (media.media_type === 'audio') {
      return (
        <audio
          src={mediaUrl}
          className="media-preview-audio"
          controls
        />
      );
    }

    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer">
        Open media file
      </a>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>HyperList</h1>
          <p className="subtitle">A nested full-stack content organizer</p>

          <div className="auth-toggle">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button type="submit">
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>

          {status && <p className="status">{status}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>HyperList</h2>
          <button onClick={createItem}>New Root Item</button>
        </div>

        <div className="notes-list">
          {items.length === 0 ? (
            <p className="empty-message">No HyperList items yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className={`note-item ${selectedId === item.id ? 'selected' : ''}`}
                onClick={() => selectItem(item)}
              >
                <strong>{item.title || 'Untitled Item'}</strong>
                <span>
                  {item.description
                    ? item.description.slice(0, 40)
                    : 'No description yet...'}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="editor-panel">
        <div className="editor-header">
          <div>
            <p className="welcome-text">Logged in as {user.email}</p>
            {status && <p className="status">{status}</p>}
          </div>

          <div className="editor-actions">
            <button onClick={goUpOneLevel} disabled={!selectedId}>
              Up One Level
            </button>
            <button onClick={deleteItem} disabled={!selectedId}>
              Delete Item
            </button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {selectedId ? (
          <div className="editor-layout">
            <section className="editor">
              <input
                className="title-input"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Item title"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe this HyperList item..."
              />
            </section>

            <aside className="media-panel">
              <section className="child-panel">
                <div className="media-panel-header">
                  <h3>Child Items</h3>
                  <button onClick={createChildItem}>
                    New Child
                  </button>
                </div>

                {childStatus && <p className="media-status">{childStatus}</p>}

                <div className="child-list">
                  {childItems.map((child) => (
                    <button
                      key={child.id}
                      className="child-card"
                      onClick={() => selectItem(child)}
                    >
                      <strong>{child.title || 'Untitled Child Item'}</strong>
                      <span>
                        {child.description
                          ? child.description.slice(0, 50)
                          : 'No description yet...'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="panel-divider" />

              <div className="media-panel-header">
                <h3>Attached Media</h3>
                <button onClick={() => loadMediaForItem(selectedId)}>
                  Refresh
                </button>
              </div>

              <form className="media-upload-form" onSubmit={handleMediaUpload}>
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.mp4,.mov,.mp3,.wav,.ogg,.webm,image/jpeg,image/png,image/gif,video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/webm"
                  onChange={(event) => setSelectedFile(event.target.files[0] || null)}
                />
                <button type="submit" disabled={!selectedFile || isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload Media'}
                </button>
              </form>

              {uploadStatus && <p className="media-status">{uploadStatus}</p>}
              {mediaStatus && <p className="media-status">{mediaStatus}</p>}

              <div className="media-grid">
                {mediaItems.map((media) => (
                  <article key={media.id} className="media-card">
                    <div className="media-preview">
                      {renderMediaItem(media)}
                    </div>
                    <div className="media-info">
                      <strong>{media.original_name}</strong>
                      <span>{media.media_type}</span>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <div className="empty-editor">
            <p>Create or select a HyperList item to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;