import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

if (process.env.NODE_ENV === 'development') {
  const VConsole = require('vconsole');
  new VConsole();
}

const root = window.document.querySelector('.app');
ReactDOM.render(<App />, root);