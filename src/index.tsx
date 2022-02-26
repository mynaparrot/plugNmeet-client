import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import './styles/index.css';
import './helpers/i18n';

import { store } from './store';
import App from './components/app';
import Loading from './components/extra-pages/Loading';

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <Suspense fallback={<Loading text="" />}>
        <App />
      </Suspense>
      <ToastContainer />
    </Provider>
  </React.StrictMode>,
  document.getElementById('plugNmeet-app'),
);
