import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

document.getElementById('seo-content')?.remove();
createRoot(document.getElementById('root')!).render(<App />);
