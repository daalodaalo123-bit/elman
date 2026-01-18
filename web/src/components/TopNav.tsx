import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  History,
  LayoutDashboard,
  LogOut,
  Receipt,
  ShoppingCart,
  Store,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';

function NavItem(props: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        clsx(
          'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )
      }
    >
      <span className='text-slate-500'>{props.icon}</span>
      <span>{props.label}</span>
    </NavLink>
  );
}

export function TopNav() {
  return (
    <header className='sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur'>
      <div className='mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft'>
            <Store size={18} />
          </div>
          <div className='text-lg font-extrabold tracking-tight text-brand-700'>ELMAN</div>
        </div>

        <nav className='hidden items-center gap-2 md:flex'>
          <NavItem to='/dashboard' label='Dashboard' icon={<LayoutDashboard size={18} />} />
          <NavItem to='/' label='POS' icon={<ShoppingCart size={18} />} />
          <NavItem to='/inventory' label='Inventory' icon={<Boxes size={18} />} />
          <NavItem to='/reports' label='Reports' icon={<BarChart3 size={18} />} />
          <NavItem to='/history' label='History' icon={<History size={18} />} />
          <NavItem to='/customers' label='Customers' icon={<Users size={18} />} />
          <NavItem to='/expenses' label='Expenses' icon={<Receipt size={18} />} />
        </nav>

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'>
            <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold'>
              M
            </span>
            <span className='font-medium'>Main Cashier</span>
          </div>
          <button
            className='rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            title='Logout'
            type='button'
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}



