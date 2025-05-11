import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ChatPopup from './components/layout/ChatPopup';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Dashboard components
import Dashboard from './components/dashboard/Dashboard';

// Employee components
import EmployeeList from './components/employees/EmployeeList';
import EmployeeDetail from './components/employees/EmployeeDetail';
import EmployeeForm from './components/employees/EmployeeForm';

// Department components
import DepartmentList from './components/departments/DepartmentList';
import DepartmentForm from './components/departments/DepartmentForm';

// Schedule components
import SchedulesList from './components/schedules/SchedulesList';
import ScheduleForm from './components/schedules/ScheduleForm';
import ScheduleDetail from './components/schedules/ScheduleDetail';

// Time Slot components
import TimeSlotsManagement from './components/timeSlots/TimeSlotsManagement';
import TimeSlotForm from './components/timeSlots/TimeSlotForm';

// Admin components
import AdminPanel from './components/admin/AdminPanel';
import SystemSettings from './components/admin/SystemSettings';

// Timesheet component
import Timesheet from './components/timesheets/Timesheet';

// Import CSS
import './App.css';

// Protected route component
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { currentUser, loading, isAdmin } = React.useContext(AuthContext);
  
  // Debug the auth state when accessing protected routes
  React.useEffect(() => {
    console.log('ProtectedRoute auth state:', {
      currentUser: !!currentUser,
      loading,
      isAdmin,
      requireAdmin,
      userRole: currentUser?.role
    });
  }, [currentUser, loading, isAdmin, requireAdmin]);
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!currentUser) {
    console.log('No current user found, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && !isAdmin) {
    console.log('Admin access required but user is not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Wrapper for ChatPopup to have access to AuthContext
const ChatPopupWrapper = () => {
  const { currentUser } = React.useContext(AuthContext);
  return currentUser ? <ChatPopup /> : null;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// App content with access to AuthContext
const AppContent = () => {
  return (
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/employees" element={
              <ProtectedRoute>
                <EmployeeList />
              </ProtectedRoute>
            } />
            
            <Route path="/employees/:id" element={
              <ProtectedRoute>
                <EmployeeDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/employees/new" element={
              <ProtectedRoute requireAdmin={true}>
                <EmployeeForm />
              </ProtectedRoute>
            } />
            
            <Route path="/employees/edit/:id" element={
              <ProtectedRoute requireAdmin={true}>
                <EmployeeForm />
              </ProtectedRoute>
            } />
            
            <Route path="/departments" element={
              <ProtectedRoute>
                <DepartmentList />
              </ProtectedRoute>
            } />
            
            <Route path="/departments/new" element={
              <ProtectedRoute requireAdmin={true}>
                <DepartmentForm />
              </ProtectedRoute>
            } />
            
            <Route path="/departments/edit/:id" element={
              <ProtectedRoute requireAdmin={true}>
                <DepartmentForm />
              </ProtectedRoute>
            } />
            
            {/* Schedule routes */}
            <Route path="/schedules" element={
              <ProtectedRoute>
                <SchedulesList />
              </ProtectedRoute>
            } />
            
            <Route path="/schedules/new" element={
              <ProtectedRoute>
                <ScheduleForm />
              </ProtectedRoute>
            } />
            
            <Route path="/schedules/:id" element={
              <ProtectedRoute>
                <ScheduleDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/schedules/edit/:id" element={
              <ProtectedRoute>
                <ScheduleForm />
              </ProtectedRoute>
            } />
            
            {/* Time Slot routes */}
            <Route path="/time-slots" element={
              <ProtectedRoute requireAdmin={true}>
                <TimeSlotsManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/time-slots/new" element={
              <ProtectedRoute requireAdmin={true}>
                <TimeSlotForm />
              </ProtectedRoute>
            } />
            
            <Route path="/time-slots/:id/edit" element={
              <ProtectedRoute requireAdmin={true}>
                <TimeSlotForm />
              </ProtectedRoute>
            } />
            
            {/* Admin Panel route */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            
            {/* Route for System Settings */}
            <Route path="/admin/settings" element={
              <ProtectedRoute requireAdmin={true}>
                <SystemSettings />
              </ProtectedRoute>
            } />
            
            {/* Timesheet route */}
            <Route path="/timesheets" element={
              <ProtectedRoute>
                <Timesheet />
              </ProtectedRoute>
            } />
            
            {/* Default route */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
        <Footer />
      
      {/* Chat Popup */}
      <ChatPopupWrapper />
      </div>
  );
};

export default App;
