import { useEffect, useState } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE.replace(/\/api\/?$/, '');

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Week 7 navigation state
  const [currentItem, setCurrentItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);
  const [parentItem, setParentItem] = useState(null);
  const [siblingItems, setSiblingItems] = useState([]);
  const [siblingStatus, setSiblingStatus] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(false);

  const [childItems, setChildItems] = useState([]);
  const [childStatus, setChildStatus] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaStatus, setMediaStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [socialUsers, setSocialUsers] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [feedComments, setFeedComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [socialStatus, setSocialStatus] = useState('');

  const [status, setStatus] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!user) return;

    loadSocialData();
  }, [user]);

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
    setIsMarkdownEditing(false);
  }, [selectedId, viewingItem?.id]);

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

  async function loadSocialData() {
    try {
      setSocialStatus('Loading social features...');

      await Promise.all([
        loadSocialUsers(),
        loadFollowingUsers(),
        loadFeedItems()
      ]);

      setSocialStatus('');
    } catch (error) {
      console.error('Load social data failed:', error);
      setSocialStatus('Failed to load social features.');
    }
  }

  async function loadSocialUsers() {
    const response = await fetch(`${API_BASE}/social/users`, {
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load users');
    }

    setSocialUsers(data);
  }

  async function loadFollowingUsers() {
    const response = await fetch(`${API_BASE}/social/following`, {
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load following list');
    }

    setFollowingUsers(data);
  }

async function loadFeedItems() {
  const response = await fetch(`${API_BASE}/feed`, {
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load feed');
  }

  const itemsWithLikeState = await Promise.all(
    data.map(async (feedItem) => {
      try {
        const likeResponse = await fetch(`${API_BASE}/items/${feedItem.id}/likes`, {
          credentials: 'include'
        });

        const likeData = await likeResponse.json();

        if (!likeResponse.ok) {
          throw new Error(likeData.error || 'Failed to load like state');
        }

        return {
          ...feedItem,
          like_count: likeData.like_count,
          liked_by_current_user: likeData.liked_by_current_user
        };
      } catch (error) {
        console.error('Load like state failed:', error);
        return feedItem;
      }
    })
  );

  setFeedItems(itemsWithLikeState);
}

  async function toggleFollow(targetUser) {
    try {
      const isFollowing = Boolean(targetUser.is_following);

      const response = await fetch(`${API_BASE}/social/follow/${targetUser.id}`, {
        method: isFollowing ? 'DELETE' : 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Follow action failed');
      }

      await loadSocialData();
      setStatus(isFollowing ? 'User unfollowed.' : 'User followed.');
    } catch (error) {
      console.error('Follow toggle failed:', error);
      setStatus('Follow action failed.');
    }
  }

  async function toggleLike(feedItem) {
  try {
    const isLiked = Boolean(feedItem.liked_by_current_user);

    const response = await fetch(`${API_BASE}/items/${feedItem.id}/like`, {
      method: isLiked ? 'DELETE' : 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Like action failed');
    }

    setFeedItems((prevItems) =>
      prevItems.map((item) =>
        item.id === feedItem.id
          ? {
              ...item,
              like_count: data.like_count,
              liked_by_current_user: data.liked_by_current_user
            }
          : item
      )
    );

    setStatus(isLiked ? 'Like removed.' : 'Item liked.');
  } catch (error) {
    console.error('Like toggle failed:', error);
    setStatus('Like action failed.');
  }
}

async function loadCommentsForItem(itemId) {
  try {
    const response = await fetch(`${API_BASE}/items/${itemId}/comments`, {
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load comments');
    }

    setFeedComments((prevComments) => ({
      ...prevComments,
      [itemId]: data
    }));
  } catch (error) {
    console.error('Load comments failed:', error);
    setStatus('Failed to load comments.');
  }
}

function updateCommentDraft(itemId, value) {
  setCommentDrafts((prevDrafts) => ({
    ...prevDrafts,
    [itemId]: value
  }));
}

async function submitComment(itemId) {
  const commentText = commentDrafts[itemId] || '';

  if (!commentText.trim()) {
    setStatus('Please enter a comment first.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/items/${itemId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        comment_text: commentText
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add comment');
    }

    setCommentDrafts((prevDrafts) => ({
      ...prevDrafts,
      [itemId]: ''
    }));

    await loadCommentsForItem(itemId);
    await loadFeedItems();

    setStatus('Comment added.');
  } catch (error) {
    console.error('Submit comment failed:', error);
    setStatus('Failed to add comment.');
  }
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
        selectItem(firstItem);
      } else {
        setSelectedId(null);
        setCurrentItem(null);
        setViewingItem(null);
        setBreadcrumbPath([]);
        setTitle('');
        setDescription('');
      }
    } catch (error) {
      console.error('Load HyperList items failed:', error);
      setStatus('Failed to load HyperList items.');
    }
  }

  async function loadParentSiblingItems(item) {
    if (!item) {
      setParentItem(null);
      setSiblingItems([]);
      setSiblingStatus('');
      return;
    }

    try {
      setSiblingStatus('Loading parent/sibling items...');

      if (!item.parent_id) {
        const rootResponse = await fetch(`${API_BASE}/items`, {
          credentials: 'include'
        });

        const rootData = await rootResponse.json();

        if (!rootResponse.ok) {
          throw new Error(rootData.error || 'Failed to load root items');
        }

        setParentItem(null);
        setSiblingItems(rootData);
        setSiblingStatus(rootData.length === 0 ? 'No root items yet.' : '');
        return;
      }

      const parentResponse = await fetch(`${API_BASE}/items/${item.parent_id}`, {
        credentials: 'include'
      });

      const parentData = await parentResponse.json();

      if (!parentResponse.ok) {
        throw new Error(parentData.error || 'Failed to load parent item');
      }

      const siblingResponse = await fetch(`${API_BASE}/items?parentId=${item.parent_id}`, {
        credentials: 'include'
      });

      const siblingData = await siblingResponse.json();

      if (!siblingResponse.ok) {
        throw new Error(siblingData.error || 'Failed to load sibling items');
      }

      setParentItem(parentData);
      setSiblingItems(siblingData);
      setSiblingStatus(siblingData.length === 0 ? 'No sibling items found.' : '');
    } catch (error) {
      console.error('Load parent/sibling items failed:', error);
      setParentItem(null);
      setSiblingItems([]);
      setSiblingStatus('Failed to load parent/sibling items.');
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

  async function deleteMedia(mediaId) {
    if (!selectedId) return;

    const confirmed = window.confirm('Delete this media attachment?');

    if (!confirmed) return;

    try {
      setUploadStatus('Deleting media...');

      const response = await fetch(`${API_BASE}/media/${mediaId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete media');
      }

      setMediaItems((prevItems) =>
        prevItems.filter((media) => media.id !== mediaId)
      );

      setUploadStatus('Media deleted.');
      await loadMediaForItem(selectedId);
    } catch (error) {
      console.error('Delete media failed:', error);
      setUploadStatus(error.message || 'Failed to delete media.');
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
      setCurrentItem(null);
      setViewingItem(null);
      setBreadcrumbPath([]);
      setTitle('');
      setDescription('');
      setMediaItems([]);
      setMediaStatus('');
      setParentItem(null);
      setSiblingItems([]);
      setSiblingStatus('');
      setChildItems([]);
      setChildStatus('');
      setSocialUsers([]);
      setFollowingUsers([]);
      setFeedItems([]);
      setFeedComments({});
      setCommentDrafts({});
      setSocialStatus('');
      setStatus('Logged out.');
    } catch (error) {
      console.error('Logout failed:', error);
      setStatus('Logout failed.');
    }
  }

  function selectItem(item) {
    setSelectedId(item.id);

    // The current item is the user's active working location.
    setCurrentItem(item);

    // Selecting/entering an item clears any temporary preview.
    setViewingItem(null);

    // Build the breadcrumb path from Root to the current item.
    loadBreadcrumbPath(item);

    // Load the left-side Parent Context / sibling list.
    loadParentSiblingItems(item);

    setTitle(item.title);
    setDescription(item.description || '');
  }

  function previewItem(item) {
    if (!item) return;

    if (item.id === selectedId) {
      setViewingItem(null);
      setStatus('Current item is already open for editing.');
      return;
    }

    // The viewing item is temporary and read-only.
    // It does not change the current working location.
    setViewingItem(item);
    setStatus(`Viewing ${item.title || 'Untitled Item'} in read-only mode.`);
  }

  function returnToCurrentItem() {
    setViewingItem(null);
    setStatus('Returned to current item.');
  }

  async function loadBreadcrumbPath(item) {
    if (!item) {
      setBreadcrumbPath([]);
      return;
    }

    try {
      const path = [
        {
          id: item.id,
          title: item.title || 'Untitled Item'
        }
      ];

      let parentId = item.parent_id;

      while (parentId) {
        const response = await fetch(`${API_BASE}/items/${parentId}`, {
          credentials: 'include'
        });

        const parentItem = await response.json();

        if (!response.ok) {
          throw new Error(parentItem.error || 'Failed to load breadcrumb parent');
        }

        path.unshift({
          id: parentItem.id,
          title: parentItem.title || 'Untitled Item'
        });

        parentId = parentItem.parent_id;
      }

      setBreadcrumbPath([
        {
          id: null,
          title: 'Root'
        },
        ...path
      ]);
    } catch (error) {
      console.error('Load breadcrumb path failed:', error);

      setBreadcrumbPath([
        {
          id: null,
          title: 'Root'
        },
        {
          id: item.id,
          title: item.title || 'Untitled Item'
        }
      ]);
    }
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

  async function navigateToBreadcrumb(crumb) {
    if (!crumb.id) {
      setStatus('Root breadcrumb selected.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/items/${crumb.id}`, {
        credentials: 'include'
      });

      const item = await response.json();

      if (!response.ok) {
        throw new Error(item.error || 'Failed to load breadcrumb item');
      }

      selectItem(item);
      setStatus(`Moved to ${item.title || 'Untitled Item'}.`);
    } catch (error) {
      console.error('Breadcrumb navigation failed:', error);
      setStatus('Failed to navigate to breadcrumb item.');
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
      selectItem(newItem);
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
        selectItem(nextItem);
      } else {
        setSelectedId(null);
        setCurrentItem(null);
        setViewingItem(null);
        setBreadcrumbPath([]);
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

  function renderBreadcrumbs() {
    if (breadcrumbPath.length === 0) {
      return null;
    }

    return (
      <nav className="breadcrumb-bar" aria-label="Breadcrumb navigation">
        {breadcrumbPath.map((crumb, index) => (
          <span key={`${crumb.id ?? 'root'}-${index}`} className="breadcrumb-segment">
            <button
              type="button"
              className="breadcrumb-button"
              disabled={index === breadcrumbPath.length - 1}
              onClick={() => navigateToBreadcrumb(crumb)}
              title={crumb.title}
            >
              {crumb.title}
            </button>

            {index < breadcrumbPath.length - 1 && (
              <span className="breadcrumb-separator">&gt;</span>
            )}
          </span>
        ))}
      </nav>
    );
  }

  function renderSocialPanel() {
    const availableUsers = socialUsers.filter((socialUser) => socialUser.id !== user.id);

    return (
      <section className="social-panel">
        <div className="media-panel-header">
          <h3>Social</h3>
          <button type="button" onClick={loadSocialData}>
            Refresh
          </button>
        </div>

        {socialStatus && <p className="media-status">{socialStatus}</p>}

        <section className="social-section">
          <h4>Users</h4>

          {availableUsers.length === 0 ? (
            <p className="media-status">No other users found.</p>
          ) : (
            <div className="social-user-list">
              {availableUsers.map((socialUser) => (
                <div key={socialUser.id} className="social-user-row">
                  <span>{socialUser.email}</span>
                  <button
                    type="button"
                    onClick={() => toggleFollow(socialUser)}
                  >
                    {socialUser.is_following ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="social-section">
          <h4>Following</h4>

          {followingUsers.length === 0 ? (
            <p className="media-status">You are not following anyone yet.</p>
          ) : (
            <div className="following-list">
              {followingUsers.map((followedUser) => (
                <div key={followedUser.id} className="following-card">
                  <strong>{followedUser.email}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="social-section">
          <h4>Followed Item Feed</h4>

          {feedItems.length === 0 ? (
            <p className="media-status">
              Follow another user to see their HyperList items here.
            </p>
          ) : (
            <div className="feed-list">
              {feedItems.map((feedItem) => (
                <article key={feedItem.id} className="feed-card">
                  <div className="feed-card-header">
                    <strong>{feedItem.title || 'Untitled Item'}</strong>
                    <span>{feedItem.owner_email}</span>
                  </div>

                  <p>
                    {feedItem.description
                      ? feedItem.description
                      : 'No description yet.'}
                  </p>

                  <div className="feed-meta">
                    <span>Likes: {feedItem.like_count || 0}</span>
                    <span>Comments: {feedItem.comment_count || 0}</span>
                  </div>

                  <div className="feed-actions">
                    <button type="button" onClick={() => toggleLike(feedItem)}>
                      {feedItem.liked_by_current_user ? 'Unlike' : 'Like'}
                    </button>

                    <button type="button" onClick={() => loadCommentsForItem(feedItem.id)}>
                      View Comments
                    </button>
                  </div>

                  <form
                    className="comment-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitComment(feedItem.id);
                    }}
                  >
                    <input
                      type="text"
                      value={commentDrafts[feedItem.id] || ''}
                      onChange={(event) => updateCommentDraft(feedItem.id, event.target.value)}
                      placeholder="Add a comment..."
                    />
                    <button type="submit">Comment</button>
                  </form>

                  {feedComments[feedItem.id] && (
                    <div className="comment-list">
                      {feedComments[feedItem.id].length === 0 ? (
                        <p className="media-status">No comments yet.</p>
                      ) : (
                        feedComments[feedItem.id].map((comment) => (
                          <div key={comment.id} className="comment-card">
                            <strong>{comment.email}</strong>
                            <p>{comment.comment_text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    );
  }

  const displayedItem = viewingItem || currentItem;
  const isViewingMode = Boolean(viewingItem);

  const displayedTitle = isViewingMode
    ? displayedItem?.title || ''
    : title;

  const displayedDescription = isViewingMode
    ? displayedItem?.description || ''
    : description;

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

        <div className="parent-sibling-frame">
          {parentItem ? (
            <section className="parent-context-section">
              <h3>Parent Context</h3>

              <button
                type="button"
                className={`parent-context-card ${
                  viewingItem?.id === parentItem.id ? 'viewing' : ''
                }`}
                onClick={() => previewItem(parentItem)}
                onDoubleClick={() => selectItem(parentItem)}
                title={parentItem.title || 'Untitled Parent Item'}
              >
                <strong>{parentItem.title || 'Untitled Parent Item'}</strong>
                <span>
                  {parentItem.description
                    ? parentItem.description.slice(0, 60)
                    : 'No description yet...'}
                </span>
              </button>
            </section>
          ) : (
            <section className="parent-context-section">
              <h3>Root Context</h3>
              <div className="root-context-card">
                <strong>HyperList Root</strong>
                <span>You are viewing top-level items.</span>
              </div>
            </section>
          )}

          <section className="sibling-section">
            <h3>{parentItem ? 'Sibling Items' : 'Root Items'}</h3>

            {siblingStatus && <p className="empty-message">{siblingStatus}</p>}

            <div className="notes-list">
              {siblingItems.length === 0 ? (
                <p className="empty-message">
                  {parentItem ? 'No sibling items found.' : 'No root items yet.'}
                </p>
              ) : (
                siblingItems.map((item) => (
                  <button
                    key={item.id}
                    className={`note-item ${selectedId === item.id ? 'selected' : ''} ${
                      viewingItem?.id === item.id ? 'viewing' : ''
                    }`}
                    onClick={() => previewItem(item)}
                    onDoubleClick={() => selectItem(item)}
                    title={item.title || 'Untitled Item'}
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
          </section>
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

        {renderBreadcrumbs()}

        {selectedId ? (
          <div className="editor-layout">
            <section
              className={`editor ${isViewingMode ? 'viewing-mode' : 'current-mode'}`}
              onDoubleClick={
                isViewingMode && displayedItem
                  ? () => selectItem(displayedItem)
                  : undefined
              }
            >
              {isViewingMode && (
                <div className="viewing-mode-banner">
                  <span>
                    Preview Mode: {displayedItem?.title || 'Untitled Item'}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      returnToCurrentItem();
                    }}
                  >
                    Return to Current Item
                  </button>
                </div>
              )}

              {!isViewingMode && currentItem && (
                <div className="current-item-banner">
                  <span>
                    Current Item: {currentItem.title || 'Untitled Item'} — editing enabled
                  </span>
                </div>
              )}

              <input
                className="title-input"
                type="text"
                value={displayedTitle}
                onChange={(event) => {
                  if (!isViewingMode) {
                    setTitle(event.target.value);
                  }
                }}
                readOnly={isViewingMode}
                placeholder="Item title"
              />

              {!isViewingMode && isMarkdownEditing ? (
                <div className="markdown-editor-wrapper">
                  <div className="markdown-editor-toolbar">
                    <span>Editing Markdown source</span>

                    <button
                      type="button"
                      className="markdown-done-button"
                      onClick={() => setIsMarkdownEditing(false)}
                    >
                      Done / Preview
                    </button>
                  </div>

                  <textarea
                    className="markdown-source-editor"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe this HyperList item with Markdown..."
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  className={`markdown-view ${isViewingMode ? 'readonly' : 'editable'}`}
                  onDoubleClick={(event) => {
                    if (!isViewingMode) {
                      event.stopPropagation();
                      setIsMarkdownEditing(true);
                    }
                  }}
                  title={
                    isViewingMode
                      ? 'Preview mode: double-click the panel to enter this item.'
                      : 'Double-click to edit Markdown.'
                  }
                >
                  {displayedDescription ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {displayedDescription}
                    </ReactMarkdown>
                  ) : (
                    <p className="empty-description">
                      No description yet. Double-click to add Markdown.
                    </p>
                  )}
                </div>
              )}
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
                      className={`child-card ${selectedId === child.id ? 'selected' : ''} ${
                        viewingItem?.id === child.id ? 'viewing' : ''
                      }`}
                      onClick={() => previewItem(child)}
                      onDoubleClick={() => selectItem(child)}
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

                    <button
                      type="button"
                      className="media-delete-button"
                      onClick={() => deleteMedia(media.id)}
                    >
                      Delete Media
                    </button>
                  </article>
                ))}
              </div>
              <div className="panel-divider" />

              {renderSocialPanel()}
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