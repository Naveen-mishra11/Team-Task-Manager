import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/projects
 * @desc    Get all projects for current user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {
      $or: [
        { admin: req.userId },
        { members: req.userId }
      ]
    };
    
    if (status) {
      query.status = status;
    }
    
    const projects = await Project.find(query)
      .populate('admin', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });
    
    // Get task counts for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const totalTasks = await Task.countDocuments({ project: project._id });
        const completedTasks = await Task.countDocuments({ project: project._id, status: 'completed' });
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return {
          ...project.toObject(),
          stats: {
            totalTasks,
            completedTasks,
            progress
          }
        };
      })
    );
    
    res.json(projectsWithStats);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project with details
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('admin', 'name email avatar')
      .populate('members', 'name email avatar');
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }
    
    // Check if user is member of project
    if (!project.isMember(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Not a project member.' 
      });
    }
    
    // Get task statistics
    const totalTasks = await Task.countDocuments({ project: project._id });
    const completedTasks = await Task.countDocuments({ project: project._id, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ project: project._id, status: 'in-progress' });
    const todoTasks = await Task.countDocuments({ project: project._id, status: 'todo' });
    const reviewTasks = await Task.countDocuments({ project: project._id, status: 'review' });
    
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    res.json({
      ...project.toObject(),
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        reviewTasks,
        progress
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', authenticate, [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
    .optional({ checkFalsy: true }),
  body('color')
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color')
    .optional({ checkFalsy: true }),
  body('members')
    .isArray().withMessage('Members must be an array')
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

    const { name, description, color, members, startDate, endDate } = req.body;

    // Validate members if provided
    if (members && members.length > 0) {
      const validMembers = await User.find({ _id: { $in: members } });
      if (validMembers.length !== members.length) {
        return res.status(400).json({ 
          message: 'Some member IDs are invalid' 
        });
      }
    }

    const project = new Project({
      name,
      description,
      color: color || '#3B82F6',
      admin: req.userId,
      members: members || [],
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    await project.save();

    // Populate the created project
    await project.populate('admin', 'name email avatar');
    await project.populate('members', 'name email avatar');

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update a project
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be between 2 and 100 characters')
    .optional({ checkFalsy: true }),
  body('description')
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
    .optional({ checkFalsy: true }),
  body('color')
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color')
    .optional({ checkFalsy: true }),
  body('status')
    .isIn(['active', 'completed', 'on-hold', 'archived']).withMessage('Invalid status')
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

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }
    
    // Check if user is admin of project
    if (!project.isAdmin(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Project admin only.' 
      });
    }

    const { name, description, color, status, startDate, endDate } = req.body;

    // Update fields
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (status) project.status = status;
    if (startDate) project.startDate = new Date(startDate);
    if (endDate) project.endDate = new Date(endDate);

    await project.save();

    await project.populate('admin', 'name email avatar');
    await project.populate('members', 'name email avatar');

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }
    
    // Check if user is admin of project
    if (!project.isAdmin(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Project admin only.' 
      });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: req.params.id });
    
    // Delete the project
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   POST /api/projects/:id/members
 * @desc    Add members to a project
 * @access  Private (Admin only)
 */
router.post('/:id/members', authenticate, [
  body('members')
    .isArray({ min: 1 }).withMessage('At least one member is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }
    
    // Check if user is admin of project
    if (!project.isAdmin(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Project admin only.' 
      });
    }

    const { members } = req.body;
    
    // Validate members
    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return res.status(400).json({ 
        message: 'Some member IDs are invalid' 
      });
    }

    // Add members (avoid duplicates)
    const currentMemberIds = project.members.map(m => m.toString());
    const newMembers = members.filter(m => 
      !currentMemberIds.includes(m) && m !== project.admin.toString()
    );

    if (newMembers.length > 0) {
      project.members.push(...newMembers);
      await project.save();
    }

    await project.populate('members', 'name email avatar');

    res.json({
      message: 'Members added successfully',
      project
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   DELETE /api/projects/:id/members/:memberId
 * @desc    Remove a member from a project
 * @access  Private (Admin only)
 */
router.delete('/:id/members/:memberId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }
    
    // Check if user is admin of project
    if (!project.isAdmin(req.userId)) {
      return res.status(403).json({ 
        message: 'Access denied. Project admin only.' 
      });
    }

    // Cannot remove admin
    if (req.params.memberId === project.admin.toString()) {
      return res.status(400).json({ 
        message: 'Cannot remove project admin' 
      });
    }

    // Remove member
    project.members = project.members.filter(
      m => m.toString() !== req.params.memberId
    );

    await project.save();

    await project.populate('members', 'name email avatar');

    res.json({
      message: 'Member removed successfully',
      project
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

export default router;