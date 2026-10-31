import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { BurgerPage } from './BurgerPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BurgerPage />
  </StrictMode>,
)
