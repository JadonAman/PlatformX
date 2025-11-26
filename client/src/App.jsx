import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AppsList from './pages/AppsList';
import AppDetails from './pages/AppDetails';
import UploadApp from './pages/UploadApp';
import CachedApps from './pages/CachedApps';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/apps" element={<AppsList />} />
          <Route path="/apps/:slug" element={<AppDetails />} />
          <Route path="/upload" element={<UploadApp />} />
          <Route path="/cached" element={<CachedApps />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
