import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './global.css'
import './lib/logicpenguin/stylesheets/common.css'
import './styles/derivation-restyle.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
