import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { bootstrap } from './bootstrap';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing #root element in index.html');
}

const { queryClient } = bootstrap();

createRoot(rootElement).render(
  <StrictMode>
    <App queryClient={queryClient} />
  </StrictMode>,
);
