import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Hindre at tallfelt (type="number") endrer verdi når man scroller over dem.
// Globalt — dekker alle tallfelt i hele appen. Feltet mister fokus ved scroll,
// så verdien står i ro mens siden ruller som normalt.
document.addEventListener('wheel', () => {
  const el = document.activeElement;
  if (el && el.tagName === 'INPUT' && el.type === 'number') {
    el.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
