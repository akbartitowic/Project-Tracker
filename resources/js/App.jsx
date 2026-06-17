import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectBoard from './pages/ProjectBoard';
import ProjectBoardDashboard from './pages/ProjectBoardDashboard';
import ProjectBoardGantt from './pages/ProjectBoardGantt';
import ProjectBoardBacklog from './pages/ProjectBoardBacklog';
import ProjectBoardNotes from './pages/ProjectBoardNotes';
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
import GenerateReport from './pages/GenerateReport';
import FinanceReport from './pages/FinanceReport';
import RealizationReport from './pages/RealizationReport';
import CompanyMaster from './pages/CompanyMaster';
import ProjectCategoryMaster from './pages/ProjectCategoryMaster';
import SalesCategoryProjectMaster from './pages/SalesCategoryProjectMaster';
import Sales from './pages/Sales';
import IntegrationProjects from './pages/IntegrationProjects';
import TeamLoad from './pages/TeamLoad';

import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import { useAuth } from './context/AuthContext';
import { getDefaultLandingPath, getRequiredPermissionForPath, hasPermission } from './utils/permissions';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#000040]">
      <div className="size-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" replace />;
  const requiredPermission = getRequiredPermissionForPath(location.pathname);
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    const fallbackPath = getDefaultLandingPath(user);
    const fallbackPermission = getRequiredPermissionForPath(fallbackPath);
    const canUseFallback = !fallbackPermission || hasPermission(user, fallbackPermission);
    if (location.pathname === fallbackPath || !canUseFallback) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-slate-300">You do not have permission to access this menu.</p>
          </div>
        </div>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }
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
          <Route path="sales/pitch/new" element={<Sales />} />
          <Route path="sales/pitch/:pitchId" element={<Sales />} />
          <Route path="sales" element={<Sales />} />
          <Route path="presales/:view?" element={<Presales />} />
          <Route path="presales-companies" element={<CompanyMaster />} />
          <Route path="presales-project-categories" element={<ProjectCategoryMaster />} />
          <Route path="sales-category-projects" element={<SalesCategoryProjectMaster />} />
          <Route path="create-project" element={<ProjectList />} />
          <Route path="board/:projectId/dashboard" element={<ProjectBoardDashboard />} />
          <Route path="board/:projectId/gantt" element={<ProjectBoardGantt />} />
          <Route path="board/:projectId/backlog" element={<ProjectBoardBacklog />} />
          <Route path="board/:projectId/notes" element={<ProjectBoardNotes />} />
          <Route path="board/:projectId?" element={<ProjectBoard />} />
          <Route path="team-load" element={<TeamLoad />} />
          <Route path="users" element={<TeamUsers />} />
          <Route path="roles" element={<SystemRoles />} />
          <Route path="project-roles" element={<ProjectRoles />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="profile" element={<Profile />} />

          <Route path="reports" element={<Reports />} />
          <Route path="generate-report" element={<GenerateReport />} />
          <Route path="finance-monitoring/:projectId?" element={<FinanceMonitoring />} />
          <Route path="finance-categories" element={<FinanceCategories />} />
          <Route path="finance-report" element={<FinanceReport />} />
          <Route path="finance-realization-report" element={<RealizationReport />} />
          <Route path="system-logs" element={<SystemLogs />} />
          <Route path="integrasi/projects" element={<IntegrationProjects />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
