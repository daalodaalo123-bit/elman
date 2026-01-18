import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to='/' replace />;

  async function submit() {
    if (!username.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      nav('/', { replace: true });
    } catch (e: any) {
      alert(e?.message ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='mx-auto w-full max-w-md py-16'>
      <div className='mb-6 text-center'>
        <div className='text-3xl font-extrabold tracking-tight'>Login</div>
        <div className='mt-2 text-slate-500'>Sign in to continue</div>
      </div>

      <Card className='p-6'>
        <div className='space-y-4'>
          <div>
            <div className='text-sm font-semibold text-slate-700'>Username</div>
            <input
              className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete='username'
            />
          </div>
          <div>
            <div className='text-sm font-semibold text-slate-700'>Password</div>
            <input
              type='password'
              className='mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-300'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete='current-password'
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>

          <button
            type='button'
            onClick={submit}
            disabled={submitting || !username.trim() || !password}
            className='mt-2 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700 disabled:opacity-60'
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </Card>
    </div>
  );
}


