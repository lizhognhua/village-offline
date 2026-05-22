'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { phone, password, redirect: false });
      if (result?.error) { setError('手机号或密码错误'); }
      else { router.push('/dashboard'); router.refresh(); }
    } catch { setError('登录失败，请稍后重试'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-8">
            <Link href="/" className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mr-3">
                <Shield className="w-7 h-7 text-primary-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">驻村帮扶管理系统</h1>
                <p className="text-sm text-gray-500">登录后进入工作平台</p>
              </div>
            </Link>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" placeholder="请输入手机号（admin）" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" placeholder="请输入密码" required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <p className="mt-4 text-center">
            <Link href="/" className="text-sm text-primary-600 hover:underline">← 返回首页</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
