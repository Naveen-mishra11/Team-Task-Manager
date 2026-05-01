import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Project name must be at least 2 characters'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'on-hold', 'archived'],
    default: 'active'
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
projectSchema.index({ admin: 1, members: 1 });

// Virtual for calculating progress based on tasks
projectSchema.virtual('progress', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

// Method to check if user is admin of project
projectSchema.methods.isAdmin = function(userId) {
  return this.admin.toString() === userId.toString();
};

// Method to check if user is member of project
projectSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.toString() === userId.toString()) || this.isAdmin(userId);
};

const Project = mongoose.model('Project', projectSchema);

export default Project;