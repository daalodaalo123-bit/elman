import { Navigate, Route, Routes } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { PosPage } from './pages/PosPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { CustomersPage } from './pages/CustomersPage';
import { ExpensesPage } from './pages/ExpensesPage';

export default function App() {
  return (
    <div className='min-h-full'>
      <TopNav />
      <main className='mx-auto w-full max-w-[1200px] px-4 py-8'>
        <Routes>
          <Route path='/' element={<PosPage />} />
          <Route path='/inventory' element={<InventoryPage />} />
          <Route path='/reports' element={<ReportsPage />} />
          <Route path='/history' element={<HistoryPage />} />
          <Route path='/customers' element={<CustomersPage />} />
          <Route path='/expenses' element={<ExpensesPage />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </main>
    </div>
  );
}