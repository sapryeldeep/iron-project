import { useState } from 'react';
import Layout, { ViewType } from './components/Layout';
import DashboardView from './components/DashboardView';
import ScaleView from './components/ScaleView';
import PersonsView from './components/PersonsView';
import InvoicesView from './components/InvoicesView';
import PaymentsView from './components/PaymentsView';
import SalesReportsView from './components/SalesReportsView';
import ExpensesView from './components/ExpensesView';
import FleetView from './components/FleetView';
import InventoryView from './components/InventoryView';
import SettingsView from './components/SettingsView';
import UsersView from './components/UsersView';
import JournalEntriesView from './components/JournalEntriesView';
import AuditLogsView from './components/AuditLogsView';
import AccountStatementsView from './components/AccountStatementsView';
import TreasuryView from './components/TreasuryView';
import AccessDeniedCard from './components/AccessDeniedCard';
import NotificationManager from './components/NotificationManager';
import { AppProvider, useAppStore } from './store';
import LoginScreen from './components/LoginScreen';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const { state } = useAppStore();

  const currentUser = state.currentUser;

  if (!currentUser) {
    return <LoginScreen />;
  }

  const isAdmin = currentUser?.role === 'admin';
  const allowedViews = currentUser?.permissions?.allowedViews;

  const isViewAllowed = (view: ViewType) => {
    if (view === 'dashboard') return true;
    if (isAdmin) return true;
    if (!allowedViews) return true;
    return allowedViews.includes(view);
  };

  const renderView = () => {
    if (!isViewAllowed(currentView)) {
      return (
        <AccessDeniedCard 
          view={currentView} 
          onNavigate={(v) => setCurrentView(v as ViewType)}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={(v) => setCurrentView(v as ViewType)} />;
      case 'scale':
        return <ScaleView />;
      case 'clients':
        return <PersonsView type="client" />;
      case 'suppliers':
        return <PersonsView type="supplier" />;
      case 'statements':
        return <AccountStatementsView />;
      case 'sales_reports':
        return <SalesReportsView />;
      case 'expenses':
        return <ExpensesView />;
      case 'invoices':
        return <InvoicesView />;
      case 'payments':
        return <PaymentsView />;
      case 'treasury':
        return <TreasuryView />;
      case 'journal':
        return <JournalEntriesView />;
      case 'audit':
        return <AuditLogsView />;
      case 'fleet':
        return <FleetView />;
      case 'inventory':
        return <InventoryView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      <NotificationManager />
      {renderView()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
