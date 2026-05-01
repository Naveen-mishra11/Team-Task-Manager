import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectAPI, taskAPI, userAPI } from '../services/api';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  Calendar,
  Plus,
  Edit,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);

  const fetchData = async () => {
    try {
      const [projectRes, tasksRes, membersRes] = await Promise.all([
        projectAPI.getById(id),
        taskAPI.getAll({ project: id }),
        userAPI.getProjectMembers(id),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
      setMembers(membersRes.data);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.length < 2) {
      setAvailableUsers([]);
      return;
    }
    try {
      const excludedIds = [...members.map(m => m._id), ...selectedUsers].join(',');
      const response = await userAPI.search({ q: searchQuery, excludeIds });
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    try {
      await projectAPI.addMembers(id, { members: selectedUsers });
      fetchData();
      setShowMemberModal(false);
      setSelectedUsers([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to add members:', error);
      alert('Failed to add members');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await projectAPI.removeMember(id, memberId);
      fetchData();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await projectAPI.delete(id);
      window.location.href = '/projects';
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' },
      'on-hold': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'On Hold' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Archived' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`badge ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { bg: 'bg-gray-100', text: 'text-gray-700' },
      medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
      high: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      urgent: { bg: 'bg-red-100', text: 'text-red-700' },
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <span className={`badge ${config.bg} ${config.text} capitalize`}>{priority}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
        <Link to="/projects" className="btn btn-primary mt-4 inline-flex">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Projects
        </Link>
      </div>
    );
  }

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    review: tasks.filter(t => t.status === 'review').length,
  };

  const progress = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/projects" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          {project.description && (
            <p className="text-gray-600 mt-2">{project.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMemberModal(true)}
            className="btn btn-secondary flex items-center"
          >
            <Users className="w-5 h-5 mr-2" />
            Add Members
          </button>
          <Link
            to={`/tasks?project=${id}`}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Task
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">To Do</p>
          <p className="text-2xl font-bold text-gray-600">{taskStats.todo}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Progress</p>
          <p className="text-2xl font-bold text-primary-600">{progress}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-medium text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: project.color,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
              <span className="text-sm text-gray-500">{tasks.length} tasks</span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No tasks yet</p>
                <Link
                  to={`/tasks?project=${id}`}
                  className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
                >
                  Create your first task
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Link
                      to={`/tasks?project=${id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            task.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {getPriorityBadge(task.priority)}
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(task.dueDate)}
                            </span>
                            {task.isOverdue && (
                              <span className="text-xs text-red-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Overdue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                    {task.assignee && (
                      <div className="ml-4 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-xs text-primary-700 font-medium">
                            {task.assignee.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
              <span className="text-sm text-gray-500">{members.length}</span>
            </div>

            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  {member._id === project.admin ? (
                    <span className="badge bg-purple-100 text-purple-700 text-xs">Admin</span>
                  ) : (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Project Actions */}
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full btn btn-danger flex items-center justify-center"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete Project
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Members</h2>
              <button onClick={() => setShowMemberModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {searchQuery.length >= 2 && availableUsers.length === 0 && (
                <p className="text-sm text-gray-500 text-center">No users found</p>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableUsers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => toggleUserSelection(user._id)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUsers.includes(user._id)
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium mr-3">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    {selectedUsers.includes(user._id) && (
                      <CheckCircle className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                ))}
              </div>

              {selectedUsers.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    {selectedUsers.length} user(s) selected
                  </p>
                  <button onClick={handleAddMembers} className="btn btn-primary w-full">
                    Add Members
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Project</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this project? All tasks associated with this
              project will also be deleted. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                className="btn btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;