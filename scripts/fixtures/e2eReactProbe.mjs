import { createElement, StrictMode, useEffect, version } from 'react';
import { createRoot } from 'react-dom/client';

const state = {
  development: import.meta.env.DEV,
  production: import.meta.env.PROD,
  mode: import.meta.env.MODE,
  version,
  renders: 0,
  effects: 0,
};
Object.assign(window, { __WEBUI_E2E_REACT_PROBE__: state });
function Probe() {
  state.renders += 1;
  useEffect(() => {
    state.effects += 1;
    document.body.dataset.effects = String(state.effects);
  }, []);
  return createElement('p', null, 'Development React probe');
}
createRoot(document.getElementById('root')).render(createElement(StrictMode, null, createElement(Probe)));
