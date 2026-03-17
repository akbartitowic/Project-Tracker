import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import ProjectBoard from './pages/ProjectBoard';
import TeamUsers from './pages/TeamUsers';
import ProjectRoles from './pages/ProjectRoles';
import SystemRoles from './pages/SystemRoles';
import SystemSettings from './pages/SystemSettings';
import Profile from './pages/Profile';

import Reports from './pages/Reports';
import Presales from './pages/Presales';
import FinanceMonitoring from './pages/FinanceMonitoring';
import FinanceCategories from './pages/FinanceCategories';
import SystemLogs from './pages/SystemLogs';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#000040]">
      <div className="size-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="presales/:view?" element={<Presales />} />
          <Route path="create-project" element={<CreateProject />} />
          <Route path="board/:projectId?" element={<ProjectBoard />} />
          <Route path="users" element={<TeamUsers />} />
          <Route path="roles" element={<SystemRoles />} />
          <Route path="project-roles" element={<ProjectRoles />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="profile" element={<Profile />} />

          <Route path="reports" element={<Reports />} />
          <Route path="finance-monitoring" element={<FinanceMonitoring />} />
          <Route path="finance-categories" element={<FinanceCategories />} />
          <Route path="system-logs" element={<SystemLogs />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
