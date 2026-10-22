import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
const SimpleApp = lazy(() => import('./simple/SimpleApp'));

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{padding:32,color:'#65766b',background:'#f3efe6',minHeight:'100vh'}}>Un peu de couleur…</div>}>
      <SimpleApp />
    </Suspense>
  </React.StrictMode>,
);
