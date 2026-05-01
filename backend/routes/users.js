import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (with optional search)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, exclude } = req.query;
    
    let query = {};
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Exclude specific user (useful for adding members)
    if (exclude) {
      query._id = { $ne: exclude };
    }
    
    const users = await User.find(query)
      .select('-password')
      .limit(20);
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('projects', 'name color status');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   GET /api/users/project/:projectId/members
 * @desc    Get all members of a project
 * @access  Private
 */
router.get('/project/:projectId/members', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
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
    
    const members = await User.find({ 
      _id: { $in: [...project.members, project.admin] } 
    }).select('-password');
    
    res.json(members);
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

/**
 * @route   GET /api/users/search
 * @desc    Search users by name or email (for assigning tasks, adding members)
 * @access  Private
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, excludeIds } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    let query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    };
    
    // Exclude specific users
    if (excludeIds) {
      const excludeArray = excludeIds.split(',');
      query._id = { $nin: excludeArray };
    }
    
    const users = await User.find(query)
      .select('-password')
      .limit(10);
    
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ 
      message: 'Server error' 
    });
  }
});

export default router;