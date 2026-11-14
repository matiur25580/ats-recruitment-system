/*
 * LEARNING NOTE: React browser entry point. Mounts the app into the HTML root element and loads global styles.
 * Interview tip: explain the responsibility of this file and how data flows through it.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Bootstrap: create the React root once and render the full component tree.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
