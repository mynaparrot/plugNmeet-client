import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

import 'react-toastify/dist/ReactToastify.css';
import './styles/index.scss';
import './styles/min_1024.scss';
import './styles/max_w_980_max_h_450.scss';
import './styles/max_h_720.scss';
import './styles/max_1279.scss';
import './styles/max_1023.scss';
import './styles/max_767.scss';
import './styles/min_641.scss';
import './styles/max_640.scss';
import './styles/max_575.scss';
import './styles/max_370.scss';
import './styles/min_1800.scss';
import './styles/max_1025.scss';
import './styles/min_641_max_1025.scss';
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
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        <Suspense fallback={<Loading text="" />}>
          <App />
        </Suspense>
        <ToastContainer />
      </DndProvider>
    </Provider>
  </React.StrictMode>,
);
