'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/constants';
import {
  LayoutDashboard,
  Package,
  Truck,
  ScanLine,
  LogOut,
  Leaf,
  CheckCircle,
  Users,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Tổng quan',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['FARMER', 'INSPECTOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN'],
  },
  {
    href: '/products',
    label: 'Sản phẩm',
    icon: <Package className="w-5 h-5" />,
    roles: ['FARMER', 'INSPECTOR', 'DISTRIBUTOR', 'RETAILER', 'ADMIN'],
  },
  {
    href: '/shipments',
    label: 'Vận chuyển',
    icon: <Truck className="w-5 h-5" />,
    roles: ['DISTRIBUTOR', 'RETAILER', 'ADMIN'],
  },
  {
    href: '/scan',
    label: 'Quét QR',
    icon: <ScanLine className="w-5 h-5" />,
    roles: ['DISTRIBUTOR', 'RETAILER'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    item.roles.some(role => hasRole(role as any))
  );

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-emerald-800 text-white shadow-lg z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AgriTrace</h1>
              <p className="text-xs text-emerald-300">Hệ thống truy xuất nguồn gốc</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username}</p>
              <p className="text-xs text-emerald-300">
                {user?.role ? ROLE_LABELS[user.role] : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-100 hover:bg-emerald-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-emerald-700">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-emerald-100 hover:bg-emerald-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
