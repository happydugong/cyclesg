import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './registerSW';
import { initializeAnalytics, trackPageView } from './services/analytics/googleAnalytics';
import { initializeComments } from './services/comments/commentsService';

initializeAnalytics();
trackPageView();
void initializeComments().catch(() => undefined);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
