import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AppsList from './pages/AppsList';
import AppDetails from './pages/AppDetails';
import UploadApp from './pages/UploadApp';
import CachedApps from './pages/CachedApps';
import Metrics from './pages/Metrics';
import ApiDocs from './pages/ApiDocs';
import Backups from './pages/Backups';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <DialogProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/apps" element={<AppsList />} />
                      <Route path="/apps/:slug" element={<AppDetails />} />
                      <Route path="/upload" element={<UploadApp />} />
                      <Route path="/cached" element={<CachedApps />} />
                      <Route path="/metrics" element={<Metrics />} />
                      <Route path="/api-docs" element={<ApiDocs />} />
                      <Route path="/backups" element={<Backups />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </DialogProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
