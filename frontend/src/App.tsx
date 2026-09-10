
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { VerifyIdentity } from './pages/VerifyIdentity';
import { VerificationResult } from './pages/VerificationResult';
import { Pipeline } from './pages/Pipeline';
import { History } from './pages/History';
import { SystemHealth } from './pages/SystemHealth';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="verify" element={<VerifyIdentity />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="result/:id" element={<VerificationResult />} />
          <Route path="history" element={<History />} />
          <Route path="verifications" element={<History />} />
          <Route path="health" element={<SystemHealth />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<div className="p-8 text-slate-500">Page not found.</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
