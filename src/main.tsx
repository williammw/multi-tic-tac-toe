import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')
if (root) {
  root.className = 'min-h-screen bg-gray-100 text-gray-900 antialiased'
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
