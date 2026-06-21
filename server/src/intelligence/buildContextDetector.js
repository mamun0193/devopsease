// Detects the Docker build context and output directories.
 
export function detectBuildContext(servicePath, language, framework, files) {
  const prefix = servicePath === '.' ? '' : `${servicePath}/`;
  
  const build = {
    context: servicePath,
    workdir: '/app',
    entry: null,
    output: null
  };

  // Detect Entry
  if (language?.name === 'Node.js') {
    if (files.includes(`${prefix}src/index.js`)) build.entry = 'src/index.js';
    else if (files.includes(`${prefix}src/main.ts`)) build.entry = 'src/main.ts';
    else if (files.includes(`${prefix}src/main.tsx`)) build.entry = 'src/main.tsx';
    else if (files.includes(`${prefix}index.js`)) build.entry = 'index.js';
  } else if (language?.name === 'Python') {
    if (files.includes(`${prefix}manage.py`)) build.entry = 'manage.py';
    else if (files.includes(`${prefix}main.py`)) build.entry = 'main.py';
    else if (files.includes(`${prefix}app.py`)) build.entry = 'app.py';
  }

  // Detect Output
  if (framework?.name === 'Next.js') build.output = '.next';
  else if (framework?.name === 'Nuxt') build.output = '.output';
  else if (framework?.name === 'NestJS') build.output = 'dist';
  else if (framework?.name === 'React' || framework?.name === 'Vue' || framework?.name === 'Svelte') {
    // Vite defaults to dist, CRA defaults to build
    if (files.includes(`${prefix}vite.config.js`) || files.includes(`${prefix}vite.config.ts`)) {
      build.output = 'dist';
    } else {
      build.output = 'build';
    }
  }

  return build;
}
