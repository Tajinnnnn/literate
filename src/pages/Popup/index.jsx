import React from 'react';
import { createRoot } from 'react-dom/client';

import Popup from './Popup';
import './index.css';

// Chrome sizes action popups from the document, before React lays out its child.
document.documentElement.classList.toggle('detached-player', new URLSearchParams(window.location.search).get('mini') === '1');

const container = document.getElementById('app-container');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(<Popup />);
