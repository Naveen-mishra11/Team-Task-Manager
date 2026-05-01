# TaskFlow - Team Task Manager

A full-stack MERN (MongoDB, Express.js, React, Node.js) web application for team task management with role-based access control.

![TaskFlow](https://img.shields.io/badge/TaskFlow-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Features

### Authentication & Authorization
- User registration and login
- JWT-based authentication
- Role-based access control (Admin/Member)
- Protected routes

### Project Management
- Create, update, and delete projects
- Assign team members to projects
- Track project progress with visual indicators
- Color-coded projects for easy identification
- Project status tracking (Active, Completed, On Hold, Archived)

### Task Management
- Create, assign, and track tasks
- Task status workflow (To Do → In Progress → Review → Completed)
- Priority levels (Low, Medium, High, Urgent)
- Due dates with overdue indicators
- Tags for task organization
- Filter and search tasks

### Dashboard
- Overview of all tasks and projects
- Task statistics (Total, Completed, In Progress, Overdue)
- Recent projects with progress bars
- Overdue tasks alerts
- My Tasks summary

### Team Management
- View all team members
- Search and filter by role
- User profile cards with stats

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons
- **Context API** - State management

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Assingment
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (already created with default values)
# Update the following values in .env:
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: Your secret key for JWT

# Start MongoDB (if not running as a service)
# On Windows: net start MongoDB
# On Mac: brew services start mongodb-community
# On Linux: sudo systemctl start mongod

# Start the backend server
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📁 Project Structure

```
Assingment/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── projects.js
│   │   └── tasks.js
│   ├── middleware/
│   │   └── auth.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   ├── Tasks.jsx
│   │   │   └── Team.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

## 🔐 Default Credentials

For testing purposes, you can create accounts or use these demo credentials:

| Role   | Email           | Password    |
|--------|-----------------|-------------|
| Admin  | admin@demo.com  | password123 |
| Member | member@demo.com | password123 |

> **Note:** You'll need to create these users through the registration page first, or seed the database.

## 📖 API Endpoints

### Authentication
| Method | Endpoint          | Description         |
|--------|-------------------|---------------------|
| POST   | /api/auth/register | Register new user   |
| POST   | /api/auth/login    | Login user          |
| GET    | /api/auth/me       | Get current user    |
| PUT    | /api/auth/update-profile | Update profile |

### Users
| Method | Endpoint                           | Description           |
|--------|------------------------------------|-----------------------|
| GET    | /api/users                         | Get all users         |
| GET    | /api/users/:id                     | Get user by ID        |
| GET    | /api/users/search                  | Search users          |
| GET    | /api/users/project/:projectId/members | Get project members |

### Projects
| Method | Endpoint                     | Description              |
|--------|------------------------------|--------------------------|
| GET    | /api/projects                | Get user's projects      |
| GET    | /api/projects/:id            | Get project by ID        |
| POST   | /api/projects                | Create new project       |
| PUT    | /api/projects/:id            | Update project           |
| DELETE | /api/projects/:id            | Delete project           |
| POST   | /api/projects/:id/members    | Add members to project   |
| DELETE | /api/projects/:id/members/:memberId | Remove member    |

### Tasks
| Method | Endpoint                   | Description              |
|--------|----------------------------|--------------------------|
| GET    | /api/tasks                 | Get tasks (with filters) |
| GET    | /api/tasks/:id             | Get task by ID           |
| POST   | /api/tasks                 | Create new task          |
| PUT    | /api/tasks/:id             | Update task              |
| PUT    | /api/tasks/:id/status      | Update task status       |
| DELETE | /api/tasks/:id             | Delete task              |
| GET    | /api/tasks/stats/overview  | Get task statistics      |

## 🎨 UI Features

- **Modern Design**: Clean, minimalist interface with Tailwind CSS
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Interactive**: Smooth animations and transitions
- **Accessible**: Keyboard navigation and ARIA labels
- **Color-coded**: Visual indicators for projects, priorities, and statuses

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Protected API routes
- Role-based access control
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built as an assignment project demonstrating full-stack MERN development skills.

---

**Happy Coding! 🚀**