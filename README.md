# HyperList Media+

HyperList Media+ is a full-stack web application prototype that extends the original QuickNotes project into a nested multimedia organization platform.

The core idea is simple: each item in a HyperList can act as both a piece of content and a container for more content. Users can create nested items, move through parent and child levels, and attach media directly to any selected item.

## Project Concept

QuickNotes began as a basic full-stack note application. HyperList expands that idea into a hierarchical structure where items can be organized like nested lists, outlines, folders, or knowledge nodes.

HyperList Media+ adds media handling to that structure. Instead of storing only text, each selected item can now support uploaded images, videos, and audio files.

This makes the project a proof-of-concept for organizing mixed content types inside a nested interface.

## Current Features

- User authentication with session-based login
- Nested HyperList items with parent-child relationships
- Selected item detail view with title and description
- Child item navigation panel
- Up One Level navigation
- Media upload support for images, videos, and audio
- Browser-based rendering for uploaded media
- Native browser controls for video and audio playback
- MySQL metadata storage for uploaded media
- Local server filesystem storage for uploaded files
- AWS EC2 deployment for production testing

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- HTML/CSS

### Backend

- Node.js
- Express
- Multer for file upload handling
- Express sessions for authentication

### Database

- MySQL

### Deployment

- AWS EC2
- Ubuntu Server
- Git and GitHub
- Environment-based configuration for local and production use

## Media Handling Design

Uploaded media files are saved in the server filesystem under the uploads directory.

The actual media files are not stored directly in MySQL. Instead, the database stores metadata about each upload, including:

- HyperList item ID
- User ID
- Original filename
- Stored filename
- MIME type
- Media type
- File size
- File URL
- Creation timestamp

This keeps the database focused on searchable records while Express serves the uploaded files back to the React frontend.

## Project Status

This project is currently a course prototype built for Web Development II skills demonstrations.

The current version demonstrates:

1. Full-stack React, Express, and MySQL integration
2. Nested item organization
3. File upload handling with Multer
4. Image, video, and audio rendering
5. Deployment and testing on AWS EC2

## Future Improvements

Possible next steps include:

- Breadcrumb navigation
- A parent/sibling navigation panel
- Social features such as follows, likes, and comments
- Cloud media storage with AWS S3
- Thumbnail generation for uploaded images and videos
- Improved access control for shared HyperList items
- Search and filtering across nested content

## Summary

HyperList Media+ explores a more flexible way to organize information by combining nested structure, text content, and uploaded media. Each item can function as a content node, a container, or both.
