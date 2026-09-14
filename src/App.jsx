import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Receivables from './pages/Receivables';
import Payables from './pages/Payables';
import Contacts from './pages/Contacts';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Ledger from './pages/Ledger';
import Bank from './pages/Bank';
import Inventory from './pages/Inventory';
import OrderEntry from './pages/OrderEntry';
import PurchaseOrders from './pages/PurchaseOrders';
import Users from './pages/Users';
import Integrations from './pages/Integrations';

/**
 * One <Route> per nav item in components/Sidebar.jsx — add a page,
 * add it to both files. Every route except /login is wrapped in
 * ProtectedRoute, which bounces to /login when there's no valid
 * session (see contexts/AuthContext.jsx).
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
          <Route path="/receivables" element={<ProtectedRoute><Receivables /></ProtectedRoute>} />
          <Route path="/payables" element={<ProtectedRoute><Payables /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
          <Route path="/bank" element={<ProtectedRoute><Bank /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/order-entry" element={<ProtectedRoute><OrderEntry /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute role="ADMIN"><Users /></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
