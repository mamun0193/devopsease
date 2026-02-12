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
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Provider store={store}>
      <RoleProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <HomePage />
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
              {/* Global toast notifications for container actions */}
              <ActionFeedback />
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </RoleProvider>
    </Provider>
  );
}

export default App;
