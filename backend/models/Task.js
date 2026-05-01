import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [2, 'Task title must be at least 2 characters'],
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'completed'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for efficient queries
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || !this.dueDate) return false;
  return new Date() > new Date(this.dueDate);
});

// Pre-save middleware to set completedAt
taskSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  } else if (this.status !== 'completed') {
    this.completedAt = null;
  }
  next();
});

// Static method to get tasks by status for a project
taskSchema.statics.getTasksByStatus = async function(projectId) {
  const statuses = ['todo', 'in-progress', 'review', 'completed'];
  const tasksByStatus = {};
  
  for (const status of statuses) {
    tasksByStatus[status] = await this.find({ project: projectId, status });
  }
  
  return tasksByStatus;
};

// Method to check if task is overdue
taskSchema.methods.checkOverdue = function() {
  if (this.status === 'completed' || !this.dueDate) return false;
  return new Date() > new Date(this.dueDate);
};

const Task = mongoose.model('Task', taskSchema);

export default Task;