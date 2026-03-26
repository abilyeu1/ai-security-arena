import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SecurityArena from './SecurityArena.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SecurityArena />
  </StrictMode>,
)
