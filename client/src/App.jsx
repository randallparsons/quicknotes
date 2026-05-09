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

  const [mediaItems, setMediaItems] = useState([]);
  const [mediaStatus, setMediaStatus] = useState('');

  const [status, setStatus] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMediaItems([]);
      return;
    }

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
              <div className="media-panel-header">
                <h3>Attached Media</h3>
                <button onClick={() => loadMediaForItem(selectedId)}>
                  Refresh
                </button>
              </div>

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