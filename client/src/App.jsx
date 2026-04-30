import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [path, setPath] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentParent = path.length > 0 ? path[path.length - 1] : null;
  const currentListName = currentParent ? currentParent.title : 'List Root';

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadItems();
    }
  }, [user, path]);

  async function readJson(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function clearSelection() {
    setSelectedItem(null);
    setTitle('');
    setDescription('');
  }

  async function checkSession() {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        credentials: 'include'
      });

      if (!response.ok) return;

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  async function loadItems() {
    try {
      setIsLoading(true);
      setStatus('');

      const parentId = currentParent ? currentParent.id : 'root';

      const response = await fetch(`${API_BASE}/items?parentId=${parentId}`, {
        credentials: 'include'
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load items');
      }

      setItems(data);
      clearSelection();
    } catch (error) {
      console.error('Load items failed:', error);
      setStatus('Failed to load HyperList items.');
    } finally {
      setIsLoading(false);
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
      setPath([]);
      clearSelection();
      setStatus('Logged out.');
    } catch (error) {
      console.error('Logout failed:', error);
      setStatus('Logout failed.');
    }
  }

  function selectItem(item) {
    setSelectedItem(item);
    setTitle(item.title || '');
    setDescription(item.description || '');
  }

  async function createItem() {
    try {
      setStatus('');

      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          parent_id: currentParent ? currentParent.id : null,
          title: 'Untitled Item',
          description: ''
        })
      });

      const newItem = await readJson(response);

      if (!response.ok) {
        throw new Error(newItem?.error || 'Failed to create item');
      }

      setItems((prevItems) => [newItem, ...prevItems]);
      selectItem(newItem);
      setStatus('Item created.');
    } catch (error) {
      console.error('Create item failed:', error);
      setStatus('Failed to create item.');
    }
  }

  async function saveItem() {
    if (!selectedItem) return;

    if (!title.trim()) {
      setStatus('Title is required.');
      return;
    }

    try {
      setStatus('');

      const response = await fetch(`${API_BASE}/items/${selectedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description
        })
      });

      const updatedItem = await readJson(response);

      if (!response.ok) {
        throw new Error(updatedItem?.error || 'Failed to save item');
      }

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );

      setSelectedItem(updatedItem);
      setTitle(updatedItem.title || '');
      setDescription(updatedItem.description || '');
      setStatus('Saved.');
    } catch (error) {
      console.error('Save item failed:', error);
      setStatus('Failed to save item.');
    }
  }

  async function deleteItem() {
    if (!selectedItem) return;

    const childCount = Number(selectedItem.child_count || 0);
    const message =
      childCount > 0
        ? `Delete "${selectedItem.title}" and its child list items?`
        : `Delete "${selectedItem.title}"?`;

    if (!window.confirm(message)) return;

    try {
      setStatus('');

      const response = await fetch(`${API_BASE}/items/${selectedItem.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete item');
      }

      setItems((prevItems) =>
        prevItems.filter((item) => item.id !== selectedItem.id)
      );

      clearSelection();
      setStatus('Item deleted.');
    } catch (error) {
      console.error('Delete item failed:', error);
      setStatus('Failed to delete item.');
    }
  }

  function openSelectedList() {
    if (!selectedItem) return;

    setPath((prevPath) => [...prevPath, selectedItem]);
    clearSelection();
  }

  function goBack() {
    setPath((prevPath) => prevPath.slice(0, -1));
    clearSelection();
  }

  function goToRoot() {
    setPath([]);
    clearSelection();
  }

  function goToPath(index) {
    setPath(path.slice(0, index + 1));
    clearSelection();
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>QuickNotes 2.0</h1>
          <p className="subtitle">HyperList REST notes app</p>

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
          <div>
            <h2>HyperList</h2>
            <p className="sidebar-subtitle">Current list: {currentListName}</p>
          </div>

          <button onClick={createItem}>New Item</button>
        </div>

        <div className="items-list">
          {isLoading ? (
            <p className="empty-message">Loading...</p>
          ) : items.length === 0 ? (
            <p className="empty-message">No items in this list yet.</p>
          ) : (
            items.map((item) => {
              const hasChildren = Number(item.child_count || 0) > 0;

              return (
                <button
                  key={item.id}
                  className={`hyper-item ${
                    selectedItem?.id === item.id ? 'selected' : ''
                  } ${hasChildren ? 'has-children' : ''}`}
                  onClick={() => selectItem(item)}
                >
                  <span className="item-title-row">
                    <span className={`arrow ${hasChildren ? 'active' : ''}`}>
                      {hasChildren ? '▶' : '•'}
                    </span>
                    <strong>{item.title || 'Untitled Item'}</strong>
                  </span>

                  <span className="item-description">
                    {item.description
                      ? item.description.slice(0, 70)
                      : 'No description yet...'}
                  </span>

                  <span className="child-count">
                    {hasChildren
                      ? `${item.child_count} child item${
                          Number(item.child_count) === 1 ? '' : 's'
                        }`
                      : 'No child items'}
                  </span>
                </button>
              );
            })
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
            <button onClick={goBack} disabled={path.length === 0}>
              Back
            </button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <section className="workspace-header">
          <div className="breadcrumbs">
            <button className="breadcrumb-button" onClick={goToRoot}>
              List Root
            </button>

            {path.map((item, index) => (
              <span key={item.id} className="breadcrumb-segment">
                <span className="breadcrumb-divider">/</span>
                <button
                  className="breadcrumb-button"
                  onClick={() => goToPath(index)}
                >
                  {item.title}
                </button>
              </span>
            ))}
          </div>

          <h1>{currentListName}</h1>
          <p>
            Select an item to edit it, open it as a parent list, or create a new
            item inside the current list.
          </p>
        </section>

        {selectedItem ? (
          <section className="editor">
            <div className="item-form">
              <label>
                Title
                <input
                  className="title-input"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Item title"
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add details for this item..."
                />
              </label>
            </div>

            <div className="item-actions">
              <button onClick={saveItem}>Save Changes</button>
              <button className="secondary" onClick={openSelectedList}>
                Open Child List
              </button>
              <button className="danger" onClick={deleteItem}>
                Delete Item
              </button>
            </div>
          </section>
        ) : (
          <div className="empty-editor">
            <p>Select an item from the list, or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;