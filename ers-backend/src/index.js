const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const timeSlotRoutes = require('./routes/timeSlots');
const rosterRoutes = require('./routes/roster');
const settingsRoutes = require('./routes/settings');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/time-slots', timeSlotRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('Employee Roster System API');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 