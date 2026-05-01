import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, projectAPI } from '../services/api';
import {
  LayoutDashboard,
  CheckCircle,
  Clock,
  AlertCircle,
  FolderKanban,
  TrendingUp,
  Calendar,
  ArrowRight,
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <p className="text-xs text-green-600 mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            {trend}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, projectsRes, tasksRes] = await Promise.all([
          taskAPI.getStats(),
          projectAPI.getAll({ limit: 5 }),
          taskAPI.getAll({ overdue: true, limit: 5 }),
        ]);

        setStats(statsRes.data);
        setRecentProjects(projectsRes.data);
        setOverdueTasks(tasksRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'todo': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'To Do' },
      'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
      'review': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Review' },
      'completed': { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    };
    const config = statusConfig[status] || statusConfig['todo'];
    return (
      <span className={`badge ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'low': { bg: 'bg-gray-100', text: 'text-gray-700' },
      'medium': { bg: 'bg-blue-100', text: 'text-blue-700' },
      'high': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      'urgent': { bg: 'bg-red-100', text: 'text-red-700' },
    };
    const config = priorityConfig[priority] || priorityConfig['medium'];
    return (
      <span className={`badge ${config.bg} ${config.text} capitalize`}>
        {priority}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your projects.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={stats?.totalTasks || 0}
          icon={LayoutDashboard}
          color="bg-primary-600"
          trend={`${stats?.progress || 0}% complete`}
        />
        <StatCard
          title="Completed"
          value={stats?.completedTasks || 0}
          icon={CheckCircle}
          color="bg-green-600"
        />
        <StatCard
          title="In Progress"
          value={stats?.inProgressTasks || 0}
          icon={Clock}
          color="bg-blue-600"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdueTasks || 0}
          icon={AlertCircle}
          color="bg-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {recentProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No projects yet</p>
              <Link to="/projects" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <Link
                  key={project._id}
                  to={`/projects/${project._id}`}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="w-3 h-3 rounded-full mr-4"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.stats?.totalTasks || 0} tasks • {project.stats?.progress || 0}% complete
                    </p>
                  </div>
                  <div className="w-24">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${project.stats?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Overdue Tasks</h2>
            <Link to="/tasks?overdue=true" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {overdueTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">No overdue tasks</p>
              <p className="text-sm text-gray-400 mt-1">Great job staying on track!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTasks.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  className="flex items-center p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center mt-1 space-x-3">
                      <span className="text-xs text-red-600 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Due {formatDate(task.dueDate)}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Tasks Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
          <Link to="/tasks?assignee=me" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
            View all
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{stats?.myTasks || 0}</p>
            <p className="text-sm text-gray-600">Assigned to me</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{stats?.inProgressTasks || 0}</p>
            <p className="text-sm text-blue-600">In Progress</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-700">{stats?.reviewTasks || 0}</p>
            <p className="text-sm text-yellow-600">In Review</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{stats?.completedTasks || 0}</p>
            <p className="text-sm text-green-600">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;