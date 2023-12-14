import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

import 'react-toastify/dist/ReactToastify.css';
import './styles/index.scss';
import './helpers/i18n';

import { store } from './store';
import App from './components/app';
import Loading from './components/extra-pages/Loading';

const container = document.getElementById('plugNmeet-app');
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <DndProvider backend={HTML5Backend}>
        <Suspense fallback={<Loading text="" />}>
          <App />
        </Suspense>
        <ToastContainer />
      </DndProvider>
    </ReduxProvider>
  </React.StrictMode>,
);
