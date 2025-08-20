import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import MobileHeader from './components/layout/MobileHeader';
import Sidebar from './components/layout/Sidebar';
import BottomNavigation from './components/layout/BottomNavigation';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

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
import RosterView from './components/schedules/RosterView';
import SchedulesList from './components/schedules/SchedulesList';
import ScheduleForm from './components/schedules/ScheduleForm';
import ScheduleDetail from './components/schedules/ScheduleDetail';
import BulkScheduleForm from './components/schedules/BulkScheduleForm';

// Time Slot components
import TimeSlotsManagement from './components/timeSlots/TimeSlotsManagement';
import TimeSlotForm from './components/timeSlots/TimeSlotForm';

// Admin components
import AdminPanel from './components/admin/AdminPanel';
import SystemSettings from './components/admin/SystemSettings';

// Timesheet component
import Timesheet from './components/timesheets/Timesheet';

// EnvoyAI component
import EnvoyAI from './components/envoyai/EnvoyAI';

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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// App content with access to AuthContext
const AppContent = () => {
  const { currentUser } = React.useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };
  
  return (
    <div className="app">
      {/* Desktop Header - only show on desktop and when authenticated */}
      {currentUser && <Header />}
      
      {/* Mobile Header - only show on mobile and when authenticated */}
      {currentUser && <MobileHeader onMenuClick={handleMenuClick} />}
      
      {/* Mobile Sidebar - only show on mobile and when authenticated */}
      {currentUser && <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />}
      
      <main className={`main-content ${currentUser ? 'with-navigation' : ''}`}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
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
          
          <Route path="/schedules" element={
            <ProtectedRoute>
              <RosterView />
            </ProtectedRoute>
          } />
          
          <Route path="/schedules/manage" element={
            <ProtectedRoute>
              <SchedulesList />
            </ProtectedRoute>
          } />
          
          <Route path="/schedules/new" element={
            <ProtectedRoute>
              <ScheduleForm />
            </ProtectedRoute>
          } />
          
          <Route path="/schedules/bulk" element={
            <ProtectedRoute requireAdmin={true}>
              <BulkScheduleForm />
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
          
          <Route path="/time-slots/edit/:id" element={
            <ProtectedRoute requireAdmin={true}>
              <TimeSlotForm />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminPanel />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/settings" element={
            <ProtectedRoute requireAdmin={true}>
              <SystemSettings />
            </ProtectedRoute>
          } />
          
          <Route path="/timesheets" element={
            <ProtectedRoute>
              <Timesheet />
            </ProtectedRoute>
          } />
          
          <Route path="/envoyai" element={
            <ProtectedRoute>
              <EnvoyAI />
            </ProtectedRoute>
          } />
          
          {/* Default route */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </main>
      
      {/* Desktop Footer - only show on desktop and when authenticated */}
      {currentUser && <Footer />}
      
      {/* Mobile Bottom Navigation - only show on mobile and when authenticated */}
      {currentUser && <BottomNavigation />}
    </div>
  );
};

export default App;
