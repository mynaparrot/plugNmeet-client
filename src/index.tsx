import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { useTranslation } from 'react-i18next';

import 'react-toastify/dist/ReactToastify.css';
import './styles/index.css';
import './helpers/i18n';

import { store } from './store';
import App from './components/app';
import Loading from './components/extra-pages/Loading';

const ToastWrapper = () => {
  const { i18n } = useTranslation();
  return <ToastContainer rtl={i18n.dir() === 'rtl'} key={i18n.language} />;
};

const container = document.getElementById('plugNmeet-app');

if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ReduxProvider store={store}>
        <Suspense fallback={<Loading text="" />}>
          <App />
        </Suspense>
        <ToastWrapper />
      </ReduxProvider>
    </StrictMode>,
  );
} else {
  throw new Error(
    "Root element with ID 'plugNmeet-app' was not found in the document. Ensure there is a corresponding HTML element with the ID 'plugNmeet-app' in your HTML file.",
  );
}
