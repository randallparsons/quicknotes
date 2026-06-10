# HyperList

HyperList is a full-stack web application prototype that extends a simple note-taking project into a nested knowledge organization platform.

The main idea behind HyperList is that each item can function as both a piece of content and a container for additional content. Users can create nested items, move through parent and child levels, add descriptions, attach media, and interact with list content through a growing set of organization and social features.

This project was developed as a course-based full-stack application and final project demonstration. It brings together React, Node.js, Express, MySQL, Git/GitHub, AWS EC2 deployment, environment-based configuration, documentation, testing practice, and automation.

## Project Purpose

HyperList is designed to help users organize information in a flexible nested structure. Instead of treating notes as flat, separate entries, HyperList allows each item to become part of a larger hierarchy.

This makes the project useful as a prototype for:

- Nested note-taking
- Project planning
- Outlining
- Knowledge organization
- Multimedia content organization
- Structured document building

## Current Features

- User authentication with session-based login
- Nested HyperList items with parent-child relationships
- Current item view with editable title and description
- Child item navigation
- Parent and sibling navigation
- Markdown-rendered description content
- Manual list ordering with Up/Down controls
- Media uploads for images, videos, and audio
- Browser-based rendering for uploaded media
- Native browser controls for video and audio playback
- MySQL metadata storage for uploaded media
- Local server filesystem storage for uploaded files
- Social features including follows, likes, comments, and a feed
- GitHub Actions workflow for automated project checks
- AWS EC2 deployment for production-style testing

## Technologies Used

### Frontend

- React
- Vite
- JavaScript
- HTML
- CSS
- react-markdown
- remark-gfm

### Backend

- Node.js
- Express
- Express sessions
- Multer for file uploads
- dotenv for environment-based configuration

### Database

- MySQL

### Development Tools

- Git
- GitHub
- GitHub Actions
- VS Code
- npm
- ESLint and Vitest practice during development

### Deployment

- AWS EC2
- Ubuntu Server
- Environment variables for local and deployed configuration

## Repository Structure

The project is organized into separate frontend and backend sections.

```text
QuickNotes/
├── .github/
│   └── workflows/
│       └── hyperlist-ci.yml      # GitHub Actions workflow
│
├── client/                       # React + Vite frontend
│   ├── public/                   # Static frontend assets
│   ├── src/                      # React components and frontend logic
│   ├── package.json              # Frontend dependencies and scripts
│   └── vite.config.js            # Vite configuration
│
├── server/                       # Node.js + Express backend
│   ├── db/                       # MySQL database connection
│   ├── middleware/               # Express middleware
│   ├── routes/                   # API route files
│   ├── sql/                      # SQL setup/update scripts
│   ├── package.json              # Backend dependencies and scripts
│   └── server.js                 # Express server entry point
│
├── .gitignore                    # Files excluded from version control
├── README.md                     # Project documentation
└── update-ec2-ip.sh              # EC2 environment update helper script
```

## Setup Instructions

To run the project locally, clone the repository and install dependencies for both the frontend and backend.

```bash
git clone <repository-url>
cd QuickNotes
```

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

## Environment Variables

This project uses environment variables for configuration. Sensitive values should not be committed to GitHub.

Create a `.env` file in the `server` directory using the expected values for your local MySQL database and session configuration.

Example server `.env` structure:

```env
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=quicknotes_db
SESSION_SECRET=your_session_secret
CLIENT_URL=http://localhost:5173
```

Create a `.env` file in the `client` directory if needed for the frontend API base URL.

Example client `.env` structure:

```env
VITE_API_BASE_URL=http://localhost:3001
```

The actual `.env` files are excluded from version control through `.gitignore`.

## How to Run Locally

Start the backend server:

```bash
cd server
node server.js
```

Start the frontend development server:

```bash
cd client
npm run dev
```

The frontend runs through Vite, and the backend provides the Express API used by the React application.

## Testing and Quality Checks

During development, I used focused utility-function testing and linting practice to validate selected logic, especially around item ordering behavior. This was an early step toward a more complete automated testing workflow.

The project also includes a GitHub Actions workflow for automated project checks when changes are pushed to GitHub.

I would not describe the current project as having complete automated test coverage yet. Future improvements would include expanding test coverage across API routes, React components, authentication behavior, and database-connected features.

## Deployment

HyperList was deployed and tested on an AWS EC2 Ubuntu server. The deployed version uses environment-based configuration so that local development and production testing can use different frontend and backend URLs.

The EC2 deployment helped test the project in a more realistic remote environment rather than only running it locally.

## Security and Configuration

Sensitive configuration values are handled through environment variables rather than being hard-coded into the application.

The `.gitignore` file is used to exclude files and folders that should not be committed, including:

- `.env` files
- `node_modules/`
- build output such as `dist/`
- local cache files
- local cookie/session artifacts
- uploaded media files
- local backup files
- private key files

The repository preserves the uploads folder structure with a `.gitkeep` file, but actual uploaded media files are excluded from version control.

This helps protect credentials, reduce unnecessary repository size, and keep the project easier to review.

## Development Workflow

This project was developed through an iterative workflow using Git and GitHub. Major updates were organized through branches and commits as the project grew from a basic full-stack note application into a more complete HyperList prototype.

The development process included:

- Building a React frontend and Express backend
- Creating REST API routes
- Connecting the application to MySQL
- Adding nested item relationships
- Adding navigation improvements
- Adding media upload support
- Adding social features
- Adding Markdown rendering
- Adding manual list ordering
- Practicing focused testing and linting
- Adding GitHub Actions automation
- Deploying and testing on AWS EC2

AI tools were also used as part of the development workflow for planning, debugging, code review, and communication support. The final implementation decisions, testing, debugging, and demonstration work were completed through hands-on development and review.

## Future Improvements

With more time, future improvements could include:

- Drag-and-drop item ordering
- Persistent restoration of the current working item across login sessions
- Cloud media storage with AWS S3
- Improved access control for shared HyperList items
- Search and filtering across nested content
- More complete automated test coverage
- Expanded CI/CD deployment automation
- A more polished production user interface

## Summary

HyperList explores a flexible way to organize information by combining nested structure, Markdown-rendered text, media content, manual ordering, and social interaction features. Each item can function as a content node, a container, or both.

The project also demonstrates a broader development workflow using version control, full-stack development, deployment, environment configuration, automation, security awareness, testing practice, and technical documentation.
