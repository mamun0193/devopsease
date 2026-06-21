// Detects the primary language of a service based on manifest files.
 
export function detectLanguage(servicePath, files) {
  const manifests = {
    'package.json': 'Node.js',
    'requirements.txt': 'Python',
    'pyproject.toml': 'Python',
    'pom.xml': 'Java',
    'build.gradle': 'Java',
    'composer.json': 'PHP',
    'Cargo.toml': 'Rust',
    'go.mod': 'Go'
  };

  const detected = [];

  for (const [manifest, language] of Object.entries(manifests)) {
    const fullPath = servicePath === '.' ? manifest : `${servicePath}/${manifest}`;
    if (files.includes(fullPath)) {
      detected.push({ name: language, confidence: 1.0 });
    }
  }

  // If no manifest found, fall back to file extensions
  if (detected.length === 0) {
    let nodeCount = 0;
    let pythonCount = 0;

    for (const file of files) {
      if (file.startsWith(servicePath === '.' ? '' : `${servicePath}/`)) {
        if (file.endsWith('.js') || file.endsWith('.ts')) nodeCount++;
        if (file.endsWith('.py')) pythonCount++;
      }
    }

    if (nodeCount > pythonCount && nodeCount > 0) {
      detected.push({ name: 'Node.js', confidence: 0.6 });
    } else if (pythonCount > nodeCount && pythonCount > 0) {
      detected.push({ name: 'Python', confidence: 0.6 });
    }
  }

  // Return the highest confidence language, or null
  if (detected.length === 0) return { name: 'Unknown', confidence: 0.0 };
  return detected.sort((a, b) => b.confidence - a.confidence)[0];
}
