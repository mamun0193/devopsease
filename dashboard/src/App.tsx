import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import HomePage from './pages/HomePage';
import ContainersPage from './pages/ContainersPage';
import ContainerDetailsPage from './components/ContainerDetailsPage';
import ActionFeedback from './components/ActionFeedback';
import { RoleProvider } from './context/RoleContext';

// Create a client — conservative defaults to minimize unnecessary API traffic.
// Real-time queries (stats, quota) override these per-hook.
// Event-driven queries rely on WebSocket invalidation instead of polling.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes — data considered fresh unless explicitly invalidated
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
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
import DevelopersPage from './pages/DevelopersPage';
import FeaturesPage from './pages/FeaturesPage';
import AboutPage from './pages/AboutPage';
import PricingPage from './pages/PricingPage';
import Toast from './components/Toast';
import AdminObservabilityPage from './pages/AdminObservabilityPage';
import BuildsPage from './pages/BuildsPage';
import BuildDetailPage from './pages/BuildDetailPage';
import ImagesPage from './pages/ImagesPage';
import ImageDetailPage from './pages/ImageDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import NetworksPage from './pages/NetworksPage';
import VolumesPage from './pages/VolumesPage';
import RegistryPage from './pages/RegistryPage';
import AlertsPage from './pages/AlertsPage';
import RepositoriesPage from './pages/RepositoriesPage';
import PipelinesPage from './pages/PipelinesPage';
import PreviewsPage from './pages/PreviewsPage';
import PreviewDetailPage from './pages/PreviewDetailPage';
import PreviewPolicyPage from './pages/PreviewPolicyPage';
import PipelineDetailPage from './pages/PipelineDetailPage';
import PipelineRunDetailPage from './pages/PipelineRunDetailPage';
import DeploymentsPage from './pages/DeploymentsPage';
import ClustersPage from './pages/ClustersPage';
import PodsPage from './pages/PodsPage';
import KubernetesDashboardPage from './pages/KubernetesDashboardPage';
import { useAlertSocket } from './hooks/useAlertSocket';
import { useContainerEvents } from './hooks/useContainerEvents';
import { useUnresolvedAlertCount } from './hooks/useAlerts';
import AlertsPanel from './components/AlertsPanel';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import RepositoryBlueprintPage from './pages/RepositoryBlueprintPage';
import RepositoryArtifactStudioPage from './pages/RepositoryArtifactStudioPage';
import DeploymentExecutionPage from './pages/DeploymentExecutionPage';
import ApplicationsPage from './pages/ApplicationsPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import EnvironmentManagementPage from './pages/EnvironmentManagementPage';
import ReleasesPage from './pages/ReleasesPage';
import ReleaseDetailsPage from './pages/ReleaseDetailsPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AlertSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  useAlertSocket(isAuthenticated);
  useContainerEvents(isAuthenticated);
  useUnresolvedAlertCount(isAuthenticated);
  return <>{children}</>;
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RoleProvider>
            <BrowserRouter>
              <AlertSocketProvider>
              <ScrollToTop />
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route path="/" element={<LandingPage />} />

                <Route path="/docs" element={<DocsPage />} />

                <Route path="/developers" element={<DevelopersPage />} />

                <Route path="/features" element={<FeaturesPage />} />

                <Route path="/about" element={<AboutPage />} />

                <Route path="/pricing" element={<PricingPage />} />

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
                  path="/containers"
                  element={
                    <ProtectedRoute>
                      <ContainersPage />
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
                <Route
                  path="/builds"
                  element={
                    <ProtectedRoute>
                      <BuildsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builds/:buildId"
                  element={
                    <ProtectedRoute>
                      <BuildDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/images"
                  element={
                    <ProtectedRoute>
                      <ImagesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/registry"
                  element={
                    <ProtectedRoute>
                      <RegistryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/images/:imageId"
                  element={
                    <ProtectedRoute>
                      <ImageDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <ProjectsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:projectId"
                  element={
                    <ProtectedRoute>
                      <ProjectDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/networks"
                  element={
                    <ProtectedRoute>
                      <NetworksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/volumes"
                  element={
                    <ProtectedRoute>
                      <VolumesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <AlertsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/repositories"
                  element={
                    <ProtectedRoute>
                      <RepositoriesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/repositories/:repoId/blueprint"
                  element={
                    <ProtectedRoute>
                      <RepositoryBlueprintPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/repositories/:repoId/artifacts"
                  element={
                    <ProtectedRoute>
                      <RepositoryArtifactStudioPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pipelines"
                  element={
                    <ProtectedRoute>
                      <PipelinesPage />
                    </ProtectedRoute>
                  }
                />
                
                <Route
                  path="/previews"
                  element={
                    <ProtectedRoute>
                      <PreviewsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/previews/:id"
                  element={
                    <ProtectedRoute>
                      <PreviewDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/previews/policies/:repoId"
                  element={
                    <ProtectedRoute>
                      <PreviewPolicyPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pipelines/:id"
                  element={
                    <ProtectedRoute>
                      <PipelineDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pipeline-runs/:id"
                  element={
                    <ProtectedRoute>
                      <PipelineRunDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/deployments"
                  element={
                    <ProtectedRoute>
                      <DeploymentsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applications"
                  element={
                    <ProtectedRoute>
                      <ApplicationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/applications/:id"
                  element={
                    <ProtectedRoute>
                      <ApplicationDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/releases"
                  element={
                    <ProtectedRoute>
                      <ReleasesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/releases/:id"
                  element={
                    <ProtectedRoute>
                      <ReleaseDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/environments"
                  element={
                    <ProtectedRoute>
                      <EnvironmentManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/deployments/:executionId"
                  element={
                    <ProtectedRoute>
                      <DeploymentExecutionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clusters"
                  element={
                    <ProtectedRoute>
                      <ClustersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pods"
                  element={
                    <ProtectedRoute>
                      <PodsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kubernetes/dashboard"
                  element={
                    <ProtectedRoute>
                      <KubernetesDashboardPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <ActionFeedback />
              <Toast />
              </AlertSocketProvider>
            </BrowserRouter>
          </RoleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
