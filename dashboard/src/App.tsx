import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import HomePage from './pages/HomePage';
import ContainerDetailsPage from './components/ContainerDetailsPage';
import ActionFeedback from './components/ActionFeedback';
import { RoleProvider } from './context/RoleContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

import AuthProvider from './context/AuthProvider';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { LandingPage } from './pages/LandingPage';
import { DocsPage } from './pages/DocsPage';
import Toast from './components/Toast';
import AdminObservabilityPage from './pages/AdminObservabilityPage';

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RoleProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/" element={<LandingPage />} />

                <Route path="/docs" element={<DocsPage />} />

                {/* Protected Dashboard Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/observability"
                  element={
                    <ProtectedRoute>
                      <AdminObservabilityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/container/:containerId"
                  element={
                    <ProtectedRoute>
                      <ContainerDetailsPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <ActionFeedback />
              <Toast />
            </BrowserRouter>
          </RoleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
