const { spawn, execSync } = require('child_process');
const { createServer } = require('vite');
const electron = require('electron');

let electronProcess = null;

async function startDev() {
  // Compile Electron TypeScript first
  console.log('\n  Compiling Electron TypeScript...\n');
  try {
    execSync('npm run build:electron', { stdio: 'inherit' });
    console.log('\n  Electron compilation complete.\n');
  } catch (err) {
    console.warn('\n  Warning: Electron compilation had errors (continuing anyway)\n');
  }

  // Start Vite dev server
  const server = await createServer({
    configFile: './vite.config.ts',
  });
  
  await server.listen();
  
  const address = server.httpServer.address();
  const port = typeof address === 'object' ? address.port : 5173;
  const devServerUrl = `http://localhost:${port}`;
  
  console.log(`\n  Vite dev server running at: ${devServerUrl}\n`);
  
  // Set the dev server URL as environment variable
  process.env.VITE_DEV_SERVER_URL = devServerUrl;
  
  // Start Electron
  function startElectron() {
    electronProcess = spawn(
      electron,
      ['.'],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          VITE_DEV_SERVER_URL: devServerUrl,
        },
      }
    );
    
    electronProcess.on('close', () => {
      server.close();
      process.exit();
    });
  }
  
  // Wait a bit for Vite to be fully ready, then start Electron
  setTimeout(startElectron, 1000);
}

startDev().catch((err) => {
  console.error('Error starting dev server:', err);
  process.exit(1);
});

// Handle cleanup
process.on('SIGTERM', () => {
  if (electronProcess) {
    electronProcess.kill();
  }
  process.exit(0);
});
