import { useEffect, useState } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [status, setStatus] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    const timeout = setTimeout(() => {
      saveNote();
    }, 600);

    return () => clearTimeout(timeout);
  }, [title, body]);

  async function checkSession() {
    try {
      const response = await fetch(`${API_BASE}/me`, {
        credentials: 'include'
      });

      if (!response.ok) return;

      const data = await response.json();
      setUser(data.user);
      await loadNotes();
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  async function loadNotes() {
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load notes');
      }

      const data = await response.json();
      setNotes(data);

      if (data.length > 0) {
        const firstNote = data[0];
        setSelectedId(firstNote.id);
        setTitle(firstNote.title);
        setBody(firstNote.body || '');
      } else {
        setSelectedId(null);
        setTitle('');
        setBody('');
      }
    } catch (error) {
      console.error('Load notes failed:', error);
      setStatus('Failed to load notes.');
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
      await loadNotes();
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
      setNotes([]);
      setSelectedId(null);
      setTitle('');
      setBody('');
      setStatus('Logged out.');
    } catch (error) {
      console.error('Logout failed:', error);
      setStatus('Logout failed.');
    }
  }

  function selectNote(note) {
    setSelectedId(note.id);
    setTitle(note.title);
    setBody(note.body || '');
  }

  async function createNote() {
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Untitled Note',
          body: ''
        })
      });

      const newNote = await response.json();

      if (!response.ok) {
        throw new Error(newNote.error || 'Failed to create note');
      }

      const updatedNotes = [newNote, ...notes];
      setNotes(updatedNotes);
      setSelectedId(newNote.id);
      setTitle(newNote.title);
      setBody(newNote.body || '');
    } catch (error) {
      console.error('Create note failed:', error);
      setStatus('Failed to create note.');
    }
  }

  async function saveNote() {
    if (!selectedId) return;

    try {
      const response = await fetch(`${API_BASE}/notes/${selectedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ title, body })
      });

      const updatedNote = await response.json();

      if (!response.ok) {
        throw new Error(updatedNote.error || 'Failed to save note');
      }

      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === selectedId ? updatedNote : note
        )
      );

      setStatus('Saved');
    } catch (error) {
      console.error('Save note failed:', error);
      setStatus('Failed to save note.');
    }
  }

  async function deleteNote() {
    if (!selectedId) return;

    try {
      const response = await fetch(`${API_BASE}/notes/${selectedId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete note');
      }

      const updatedNotes = notes.filter((note) => note.id !== selectedId);
      setNotes(updatedNotes);

      if (updatedNotes.length > 0) {
        const nextNote = updatedNotes[0];
        setSelectedId(nextNote.id);
        setTitle(nextNote.title);
        setBody(nextNote.body || '');
      } else {
        setSelectedId(null);
        setTitle('');
        setBody('');
      }

      setStatus('Note deleted.');
    } catch (error) {
      console.error('Delete note failed:', error);
      setStatus('Failed to delete note.');
    }
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>QuickNotes</h1>
          <p className="subtitle">A minimalist note-taking app</p>

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
          <h2>QuickNotes</h2>
          <button onClick={createNote}>New Note</button>
        </div>

        <div className="notes-list">
          {notes.length === 0 ? (
            <p className="empty-message">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                className={`note-item ${selectedId === note.id ? 'selected' : ''}`}
                onClick={() => selectNote(note)}
              >
                <strong>{note.title || 'Untitled Note'}</strong>
                <span>{note.body ? note.body.slice(0, 40) : 'No content yet...'}</span>
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
            <button onClick={deleteNote} disabled={!selectedId}>
              Delete Note
            </button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {selectedId ? (
          <div className="editor">
            <input
              className="title-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Note title"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Start typing your note..."
            />
          </div>
        ) : (
          <div className="empty-editor">
            <p>Create a note to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;