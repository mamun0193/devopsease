export interface DocSection { id: string; title: string; group: string; }

export const NAV_GROUPS: { group: string; items: DocSection[] }[] = [
  {
    group: 'Getting Started',
    items: [
      { id: 'introduction', title: 'Introduction',      group: 'Getting Started' },
      { id: 'first-login',  title: 'Sign Up & Login',   group: 'Getting Started' },
    ],
  },
  {
    group: 'Dashboard',
    items: [
      { id: 'overview',    title: 'System Overview',        group: 'Dashboard' },
      { id: 'navigation',  title: 'Navigation',             group: 'Dashboard' },
      { id: 'alerts',      title: 'Alerts & Notifications', group: 'Dashboard' },
    ],
  },
  {
    group: 'Containers',
    items: [
      { id: 'containers-intro',     title: 'Managing Containers',    group: 'Containers' },
      { id: 'container-lifecycle',  title: 'Lifecycle Controls',      group: 'Containers' },
      { id: 'container-logs',       title: 'Logs & Monitoring',       group: 'Containers' },
      { id: 'container-exec',       title: 'Exec Terminal',           group: 'Containers' },
      { id: 'container-health',     title: 'Health & Auto-Recovery',  group: 'Containers' },
      { id: 'failure-intelligence', title: 'Failure Intelligence',    group: 'Containers' },
      { id: 'resource-limits',      title: 'Resource Limits & Quota', group: 'Containers' },
      { id: 'tunnels',              title: 'Public Tunnels',          group: 'Containers' },
    ],
  },
  {
    group: 'Images & Registry',
    items: [
      { id: 'builds-intro', title: 'Image Build Engine',  group: 'Images & Registry' },
      { id: 'build-intel',  title: 'Build Intelligence',  group: 'Images & Registry' },
      { id: 'images',       title: 'Image Governance',    group: 'Images & Registry' },
      { id: 'registry',     title: 'Docker Hub Registry', group: 'Images & Registry' },
    ],
  },
  {
    group: 'CI/CD Pipelines',
    items: [
      { id: 'repositories',  title: 'Linking Repositories', group: 'CI/CD Pipelines' },
      { id: 'pipeline-def',  title: 'Defining Pipelines',   group: 'CI/CD Pipelines' },
      { id: 'pipeline-exec', title: 'Pipeline Execution',   group: 'CI/CD Pipelines' },
      { id: 'deployments',   title: 'Deployments',          group: 'CI/CD Pipelines' },
      { id: 'rollback',      title: 'Rollback & History',   group: 'CI/CD Pipelines' },
    ],
  },
  {
    group: 'Projects',
    items: [
      { id: 'projects', title: 'Docker Compose Projects', group: 'Projects' },
    ],
  },
  {
    group: 'Infrastructure',
    items: [
      { id: 'networks', title: 'Networks', group: 'Infrastructure' },
      { id: 'volumes',  title: 'Volumes',  group: 'Infrastructure' },
      { id: 'secrets',  title: 'Secrets',  group: 'Infrastructure' },
      { id: 'domains',  title: 'Custom Domains & TLS', group: 'Infrastructure' },
    ],
  },
  {
    group: 'Kubernetes',
    items: [
      { id: 'clusters',      title: 'Connecting Clusters', group: 'Kubernetes' },
      { id: 'namespaces',    title: 'Namespaces',          group: 'Kubernetes' },
      { id: 'pods',          title: 'Pod Management',      group: 'Kubernetes' },
      { id: 'k8s-dashboard', title: 'Cluster Dashboard',  group: 'Kubernetes' },
      { id: 'k8s-yaml',      title: 'YAML Generator',     group: 'Kubernetes' },
    ],
  },
  {
    group: 'AI & Automation',
    items: [
      { id: 'copilot',   title: 'AI DevOps Copilot',      group: 'AI & Automation' },
      { id: 'autopilot', title: 'Autonomous Operations',   group: 'AI & Automation' },
    ],
  },
  {
    group: 'CLI',
    items: [
      { id: 'cli-install',    title: 'Installation & Setup', group: 'CLI' },
      { id: 'cli-auth',       title: 'Auth Commands',        group: 'CLI' },
      { id: 'cli-containers', title: 'Container Commands',   group: 'CLI' },
      { id: 'cli-k8s',        title: 'Kubernetes Commands',  group: 'CLI' },
      { id: 'cli-pipelines',  title: 'Pipeline Commands',    group: 'CLI' },
      { id: 'cli-advanced',   title: 'Advanced Commands',    group: 'CLI' },
    ],
  },
  {
    group: 'Platform',
    items: [
      { id: 'backups',   title: 'Backups & Resilience', group: 'Platform' },
      { id: 'api',       title: 'Public API & SDK',     group: 'Platform' },
    ],
  },
  {
    group: 'Help',
    items: [
      { id: 'troubleshooting', title: 'Troubleshooting', group: 'Help' },
      { id: 'faq',             title: 'FAQ',             group: 'Help' },
    ],
  },
];
