import { NavLink, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../lib/auth';

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

function NavItemMobile(props: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        clsx(
          'flex w-20 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )
      }
    >
      <span className='text-slate-500'>{props.icon}</span>
      <span className='truncate'>{props.label}</span>
    </NavLink>
  );
}

export function TopNav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className='sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur'>
      <div className='mx-auto w-full max-w-[1200px] px-4'>
        <div className='flex h-16 items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft'>
              <Store size={18} />
            </div>
            <div className='text-lg font-extrabold tracking-tight text-brand-700'>ELMAN</div>
          </div>

          <nav className='hidden items-center gap-2 md:flex'>
            {user?.role === 'owner' ? (
              <NavItem to='/dashboard' label='Dashboard' icon={<LayoutDashboard size={18} />} />
            ) : null}
            {user ? <NavItem to='/' label='POS' icon={<ShoppingCart size={18} />} /> : null}
            {user?.role === 'owner' ? (
              <NavItem to='/inventory' label='Inventory' icon={<Boxes size={18} />} />
            ) : null}
            {user?.role === 'owner' ? (
              <NavItem to='/reports' label='Reports' icon={<BarChart3 size={18} />} />
            ) : null}
            {user ? <NavItem to='/history' label='History' icon={<History size={18} />} /> : null}
            {user?.role === 'owner' ? (
              <NavItem to='/customers' label='Customers' icon={<Users size={18} />} />
            ) : null}
            {user?.role === 'owner' ? (
              <NavItem to='/expenses' label='Expenses' icon={<Receipt size={18} />} />
            ) : null}
          </nav>

          <div className='flex items-center gap-3'>
            {user ? (
              <div className='hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:flex'>
                <span className='inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold'>
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                <span className='font-medium'>{user.username}</span>
                <span className='text-xs font-semibold text-slate-500'>({user.role})</span>
              </div>
            ) : null}

            {user ? (
              <button
                className='rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                title='Logout'
                type='button'
                onClick={() => {
                  logout();
                  nav('/login');
                }}
              >
                <LogOut size={18} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Mobile nav */}
        {user ? (
          <nav className='flex gap-2 overflow-x-auto pb-3 md:hidden'>
            {user?.role === 'owner' ? (
              <NavItemMobile to='/dashboard' label='Dashboard' icon={<LayoutDashboard size={18} />} />
            ) : null}
            <NavItemMobile to='/' label='POS' icon={<ShoppingCart size={18} />} />
            {user?.role === 'owner' ? (
              <NavItemMobile to='/inventory' label='Inventory' icon={<Boxes size={18} />} />
            ) : null}
            {user?.role === 'owner' ? (
              <NavItemMobile to='/reports' label='Reports' icon={<BarChart3 size={18} />} />
            ) : null}
            <NavItemMobile to='/history' label='History' icon={<History size={18} />} />
            {user?.role === 'owner' ? (
              <NavItemMobile to='/customers' label='Customers' icon={<Users size={18} />} />
            ) : null}
            {user?.role === 'owner' ? (
              <NavItemMobile to='/expenses' label='Expenses' icon={<Receipt size={18} />} />
            ) : null}
          </nav>
        ) : null}
      </div>
    </header>
  );
}



