import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const clientEnv = Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('REACT_APP_'))
  );

  return {
    plugins: [react()],
    define: {
      'process.env': JSON.stringify({
        ...clientEnv,
        NODE_ENV: mode === 'test' ? 'test' : mode,
      }),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.{js,jsx}'],
      setupFiles: './src/setupTests.js',
    },
  };
});
