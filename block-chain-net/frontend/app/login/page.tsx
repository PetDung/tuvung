'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Leaf, AlertCircle, Loader2, Tractor, ShieldCheck, Truck, Store } from 'lucide-react';

const roleIcons: Record<string, typeof Tractor> = {
  FARMER: Tractor,
  INSPECTOR: ShieldCheck,
  DISTRIBUTOR: Truck,
  RETAILER: Store,
  ADMIN: ShieldCheck,
};

const roleLabels: Record<string, string> = {
  FARMER: 'Nông dân',
  INSPECTOR: 'Kiểm định viên',
  DISTRIBUTOR: 'Nhà phân phối',
  RETAILER: 'Nhà bán lẻ',
  ADMIN: 'Quản trị viên',
};

const demoAccounts = [
  { username: 'farmer1', password: 'password123', role: 'FARMER' },
  { username: 'inspector1', password: 'password123', role: 'INSPECTOR' },
  { username: 'distributor1', password: 'password123', role: 'DISTRIBUTOR' },
  { username: 'retailer1', password: 'password123', role: 'RETAILER' },
  { username: 'admin', password: 'admin123', role: 'ADMIN' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const handleRoleSelect = (role: string) => {
    const account = demoAccounts.find(a => a.role === role);
    if (account) {
      setUsername(account.username);
      setPassword(account.password);
      setSelectedRole(role);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      // Navigate to dashboard after successful login
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 
                           err.message || 
                           'Đăng nhập thất bại. Vui lòng kiểm tra tài khoản.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/5 rounded-full blur-3xl" />
        
        {/* Floating leaves decoration */}
        <svg className="absolute top-20 left-10 w-12 h-12 text-white/10 animate-float" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
        <svg className="absolute bottom-32 right-20 w-16 h-16 text-white/10 animate-float" style={{ animationDelay: '0.5s' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
        <svg className="absolute top-40 right-1/4 w-8 h-8 text-white/10 animate-float" style={{ animationDelay: '1.5s' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6 transform hover:scale-105 transition-transform">
            <Leaf className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">AgriTrace</h1>
          <p className="text-emerald-100 text-lg">Hệ thống truy xuất nguồn gốc nông sản blockchain</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          {/* Left Side - Role Selection */}
          <div className="lg:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 p-8 lg:p-10">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Chọn vai trò để đăng nhập nhanh</h2>
            
            <div className="grid grid-cols-1 gap-3">
              {demoAccounts.map((account) => {
                const Icon = roleIcons[account.role];
                const isSelected = selectedRole === account.role;
                return (
                  <button
                    key={account.role}
                    onClick={() => handleRoleSelect(account.role)}
                    className={`
                      flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left
                      ${isSelected 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 transform scale-[1.02]' 
                        : 'bg-white hover:bg-emerald-50 hover:shadow-md border border-gray-200'
                      }
                    `}
                  >
                    <div className={`p-3 rounded-xl ${isSelected ? 'bg-emerald-500' : 'bg-emerald-100'}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                        {roleLabels[account.role]}
                      </p>
                      <p className={`text-sm ${isSelected ? 'text-emerald-100' : 'text-gray-500'}`}>
                        {account.username}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-emerald-600 rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:w-1/2 p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập</h2>
              <p className="text-gray-500">Nhập thông tin tài khoản của bạn</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Nhập mật khẩu"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-600 focus:ring-4 focus:ring-emerald-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-emerald-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <Leaf className="w-5 h-5" />
                    <span>Đăng nhập</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-500">
                Mật khẩu mặc định: <span className="font-mono text-gray-700">password123</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-emerald-200 text-sm">
            AgriTrace - Blockchain Supply Chain © 2024
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
