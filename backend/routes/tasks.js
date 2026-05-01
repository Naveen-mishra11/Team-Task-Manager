import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/tasks
 * @desc    Get tasks (with filters)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { project, status, assignee, priority, search, overdue } = req.query;
    
    let query = {};
    
    // Filter by project
    if (project) {
      // Check if user is member of project
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(404).json({ message: 'Project not found' });
      }
      if (!projectDoc.isMember(req.userId)) {
        return res.status(403).json({ message: 'Access denied. Not a project member.' });
      }
      query.project = project;
    } else {
      // If no project specified, get tasks from projects user is member of
      const userProjects = await Project.find({
        $or: [
          { admin: req.userId },
          { members: req.userId }
        ]
      }).select('_id');
      query.project = { $in: userProjects.map(p => p._id) };
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by assignee
    if (assignee) {
      query.assignee = assignee;
    }
    
    // Filter by priority
    if (priority) {
      query.priority = priority;
    }
    
    // Search in title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter overdue tasks
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $ne: 'completed' };
    }
    
    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('project', 'name color')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Add isOverdue flag to each task
    const tasksWithOverdue = tasks.map(task => {
      const taskObj = task.toObject();
      taskObj.isOverdue = task.checkOverdue();
      return taskObj;
    });
    
    res.json(tasksWithOverdue);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('project', 'name color admin members');
    
    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found' 
      });
    }
    
    // Check if user is member of project
    if (!task.project.isMember(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Not a project member.' 
      });
    }
    
    const taskObj = task.toObject();
    taskObj.isOverdue = task.checkOverdue();
    
    res.json(taskObj);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', authenticate, [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),
  body('description')
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
    .optional({ checkFalsy: true }),
  body('project')
    .notEmpty().withMessage('Project is required'),
  body('assignee')
    .optional({ checkFalsy: true }),
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
    .optional({ checkFalsy: true }),
  body('dueDate')
    .isISO8601().withMessage('Invalid date format')
    .optional({ checkFalsy: true }),
  body('estimatedHours')
    .isFloat({ min: 0 }).withMessage('Estimated hours must be positive')
    .optional({ checkFalsy: true }),
  body('tags')
    .isArray().withMessage('Tags must be an array')
    .optional({ checkFalsy: true })
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { title, description, project, assignee, priority, dueDate, estimatedHours, tags } = req.body;

    // Check if project exists and user is member
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }
    
    if (!projectDoc.isMember(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Not a project member.' 
      });
    }

    // Check if assignee exists and is member of project
    if (assignee) {
      const assigneeUser = await User.findById(assignee);
      if (!assigneeUser) {
        return res.status(400).json({ 
          message: 'Assignee not found' 
        });
      }
      if (!projectDoc.isMember(assignee)) {
        return res.status(400).json({ 
          message: 'Assignee must be a project member' 
        });
      }
    }

    const task = new Task({
      title,
      description,
      project,
      assignee: assignee || null,
      createdBy: req.userId,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours,
      tags: tags || []
    });

    await task.save();

    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('project', 'name color');

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update a task
 * @access  Private
 */
router.put('/:id', authenticate, [
  body('title')
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters')
    .optional({ checkFalsy: true }),
  body('description')
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
    .optional({ checkFalsy: true }),
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
    .optional({ checkFalsy: true }),
  body('status')
    .isIn(['todo', 'in-progress', 'review', 'completed']).withMessage('Invalid status')
    .optional({ checkFalsy: true }),
  body('dueDate')
    .isISO8601().withMessage('Invalid date format')
    .optional({ checkFalsy: true }),
  body('estimatedHours')
    .isFloat({ min: 0 }).withMessage('Estimated hours must be positive')
    .optional({ checkFalsy: true }),
  body('actualHours')
    .isFloat({ min: 0 }).withMessage('Actual hours must be positive')
    .optional({ checkFalsy: true })
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const task = await Task.findById(req.params.id)
      .populate('project');
    
    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found' 
      });
    }
    
    // Check if user is member of project
    if (!task.project.isMember(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Not a project member.' 
      });
    }

    const { 
      title, description, assignee, priority, status, 
      dueDate, estimatedHours, actualHours, tags 
    } = req.body;

    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (dueDate) task.dueDate = new Date(dueDate);
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (actualHours !== undefined) task.actualHours = actualHours;
    if (tags) task.tags = tags;

    // Handle assignee update
    if (assignee !== undefined) {
      if (assignee === null) {
        task.assignee = null;
      } else {
        const assigneeUser = await User.findById(assignee);
        if (!assigneeUser) {
          return res.status(400).json({ 
            message: 'Assignee not found' 
          });
        }
        if (!task.project.isMember(assignee)) {
          return res.status(400).json({ 
            message: 'Assignee must be a project member' 
          });
        }
        task.assignee = assignee;
      }
    }

    await task.save();

    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('project', 'name color');

    const taskObj = task.toObject();
    taskObj.isOverdue = task.checkOverdue();

    res.json({
      message: 'Task updated successfully',
      task: taskObj
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   PUT /api/tasks/:id/status
 * @desc    Update task status (quick update)
 * @access  Private
 */
router.put('/:id/status', authenticate, [
  body('status')
    .isIn(['todo', 'in-progress', 'review', 'completed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { status } = req.body;

    const task = await Task.findById(req.params.id)
      .populate('project');
    
    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found' 
      });
    }
    
    // Check if user is member of project
    if (!task.project.isMember(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Not a project member.' 
      });
    }

    task.status = status;
    await task.save();

    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    await task.populate('project', 'name color');

    const taskObj = task.toObject();
    taskObj.isOverdue = task.checkOverdue();

    res.json({
      message: 'Task status updated successfully',
      task: taskObj
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project');
    
    if (!task) {
      return res.status(404).json({ 
        message: 'Task not found' 
      });
    }
    
    // Check if user is admin of project
    if (!task.project.isAdmin(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Project admin only.' 
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   GET /api/tasks/stats/overview
 * @desc    Get task statistics for dashboard
 * @access  Private
 */
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    // Get all projects user is member of
    const userProjects = await Project.find({
      $or: [
        { admin: req.userId },
        { members: req.userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    // Get task statistics
    const totalTasks = await Task.countDocuments({ project: { $in: projectIds } });
    const completedTasks = await Task.countDocuments({ project: { $in: projectIds }, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ project: { $in: projectIds }, status: 'in-progress' });
    const todoTasks = await Task.countDocuments({ project: { $in: projectIds }, status: 'todo' });
    const reviewTasks = await Task.countDocuments({ project: { $in: projectIds }, status: 'review' });
    
    // Get overdue tasks
    const overdueTasks = await Task.countDocuments({
      project: { $in: projectIds },
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date(), $ne: null }
    });

    // Get tasks assigned to current user
    const myTasks = await Task.countDocuments({
      project: { $in: projectIds },
      assignee: req.userId,
      status: { $ne: 'completed' }
    });

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
      overdueTasks,
      myTasks,
      progress
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

export default router;