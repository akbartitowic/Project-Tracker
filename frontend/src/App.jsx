import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import CreateProject from './pages/CreateProject';
import ProjectBoard from './pages/ProjectBoard';
import TeamUsers from './pages/TeamUsers';
import ManhoursLedger from './pages/ManhoursLedger';
import Reports from './pages/Reports';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="create-project" element={<CreateProject />} />
          <Route path="board" element={<ProjectBoard />} />
          <Route path="users" element={<TeamUsers />} />
          <Route path="manhours" element={<ManhoursLedger />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
