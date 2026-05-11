import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './registerSW';
import { initializeAnalytics, trackPageView } from './services/analytics/googleAnalytics';

initializeAnalytics();
trackPageView();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
