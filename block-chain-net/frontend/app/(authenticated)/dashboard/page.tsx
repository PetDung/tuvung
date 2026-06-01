'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { productsApi, shipmentsApi } from '@/services/api';
import Navbar from '@/components/Navbar';
import { StatsCardSkeleton } from '@/components/LoadingSkeleton';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  ClipboardCheck,
  UserCheck,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0,
    registered: 0,
    inspected: 0,
    shipments: 0,
    pending: 0,
    inTransit: 0,
  });

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const role = user.role;

      if (role === 'FARMER') {
        // FARMER: chỉ thấy sản phẩm của mình
        const myProducts = await productsApi.getMyProducts();
        setStats({
          products: myProducts.length,
          registered: myProducts.filter((p: any) => p.status === 'REGISTERED').length,
          inspected: myProducts.filter((p: any) => p.status === 'INSPECTED').length,
          shipments: 0,
          pending: 0,
          inTransit: 0,
        });
      } else if (role === 'INSPECTOR') {
        // INSPECTOR: focus vào sản phẩm chờ duyệt
        const allProducts = await productsApi.getAll();
        setStats({
          products: allProducts.length,
          registered: allProducts.filter((p: any) => p.status === 'REGISTERED').length,
          inspected: allProducts.filter((p: any) => p.status === 'INSPECTED').length,
          shipments: 0,
          pending: 0,
          inTransit: 0,
        });
      } else if (role === 'RETAILER') {
        // RETAILER: sản phẩm đã duyệt + đơn hàng của mình
        const [approvedProducts, myShipments] = await Promise.all([
          productsApi.getApprovedProducts(),
          shipmentsApi.getMyShipments(),
        ]);
        setStats({
          products: approvedProducts.length,
          registered: 0,
          inspected: approvedProducts.length,
          shipments: myShipments.length,
          pending: myShipments.filter((s: any) => s.status === 'PENDING').length,
          inTransit: myShipments.filter((s: any) => s.status === 'IN_TRANSIT').length,
        });
      } else if (role === 'DISTRIBUTOR') {
        // DISTRIBUTOR: đơn chờ nhận + đơn của mình
        const [pending, myShipments] = await Promise.all([
          shipmentsApi.getPending(),
          shipmentsApi.getMyShipments(),
        ]);
        setStats({
          products: 0,
          registered: 0,
          inspected: 0,
          shipments: myShipments.length,
          pending: pending.length,
          inTransit: myShipments.filter((s: any) => s.status === 'IN_TRANSIT').length,
        });
      } else {
        // ADMIN: xem tất cả
        const [allProducts, allShipments] = await Promise.all([
          productsApi.getAll(),
          shipmentsApi.getAllShipments(),
        ]);
        setStats({
          products: allProducts.length,
          registered: allProducts.filter((p: any) => p.status === 'REGISTERED').length,
          inspected: allProducts.filter((p: any) => p.status === 'INSPECTED').length,
          shipments: allShipments.length,
          pending: allShipments.filter((s: any) => s.status === 'PENDING').length,
          inTransit: allShipments.filter((s: any) => s.status === 'IN_TRANSIT').length,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar title="Tổng quan" />
        <div className="p-6">
          <div className="animate-pulse mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <StatsCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar title="Tổng quan" />

      <div className="p-6">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Xin chào, {user?.fullName || user?.username}!
          </h1>
          <p className="text-gray-600 mt-1 capitalize">
            Vai trò: {user?.role?.toLowerCase().replace('_', ' ')}
          </p>
        </div>

        {/* Role-based Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* FARMER: Tạo sản phẩm */}
          {hasRole('FARMER') && (
            <Link
              href="/products?action=create"
              className="flex items-center gap-4 p-5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Tạo sản phẩm</p>
                <p className="text-sm text-emerald-200">Đăng ký sản phẩm mới</p>
              </div>
            </Link>
          )}

          {/* INSPECTOR: Duyệt sản phẩm */}
          {hasRole('INSPECTOR') && (
            <Link
              href="/products?status=REGISTERED"
              className="flex items-center gap-4 p-5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
            >
              <div className="w-12 h-12 bg-amber-400 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Duyệt sản phẩm</p>
                <p className="text-sm text-amber-200">Xem {stats.registered} sản phẩm chờ</p>
              </div>
            </Link>
          )}

          {/* RETAILER: Xem sản phẩm đã duyệt */}
          {hasRole('RETAILER') && (
            <Link
              href="/products?status=INSPECTED"
              className="flex items-center gap-4 p-5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Sản phẩm đã duyệt</p>
                <p className="text-sm text-blue-200">Yêu cầu vận chuyển</p>
              </div>
            </Link>
          )}

          {/* DISTRIBUTOR: Nhận đơn */}
          {hasRole('DISTRIBUTOR') && (
            <Link
              href="/shipments?status=PENDING"
              className="flex items-center gap-4 p-5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
            >
              <div className="w-12 h-12 bg-purple-400 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Nhận đơn giao</p>
                <p className="text-sm text-purple-200">{stats.pending} đơn chờ</p>
              </div>
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng sản phẩm</p>
                <p className="text-2xl font-bold text-gray-900">{stats.products}</p>
              </div>
            </div>
          </div>

          {hasRole(['FARMER', 'INSPECTOR']) && (
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chờ duyệt</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.registered}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Đã duyệt</p>
                <p className="text-2xl font-bold text-green-600">{stats.inspected}</p>
              </div>
            </div>
          </div>

          {hasRole(['DISTRIBUTOR', 'RETAILER']) && (
            <>
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Đang vận chuyển</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.inTransit}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Đơn chờ nhận</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.pending}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/products"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-500 transition-colors"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Quản lý sản phẩm</p>
              <p className="text-sm text-gray-500">Xem danh sách sản phẩm</p>
            </div>
          </Link>

          <Link
            href="/shipments"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-500 transition-colors"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Quản lý vận chuyển</p>
              <p className="text-sm text-gray-500">Theo dõi đơn hàng</p>
            </div>
          </Link>

          <Link
            href="/scan"
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-500 transition-colors"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Quét QR Code</p>
              <p className="text-sm text-gray-500">Cập nhật trạng thái</p>
            </div>
          </Link>
        </div>

        {/* Workflow Guide */}
        <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
          <h3 className="text-lg font-semibold text-emerald-800 mb-4">Luồng nghiệp vụ</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full flex items-center gap-1">
              <Package className="w-4 h-4" /> 1. FARMER tạo sản phẩm
            </span>
            <span className="text-emerald-400">→</span>
            <span className="px-3 py-1 bg-amber-500 text-white rounded-full flex items-center gap-1">
              <ClipboardCheck className="w-4 h-4" /> 2. INSPECTOR duyệt
            </span>
            <span className="text-emerald-400">→</span>
            <span className="px-3 py-1 bg-blue-500 text-white rounded-full flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" /> 3. RETAILER yêu cầu ship
            </span>
            <span className="text-emerald-400">→</span>
            <span className="px-3 py-1 bg-purple-500 text-white rounded-full flex items-center gap-1">
              <Truck className="w-4 h-4" /> 4. DISTRIBUTOR vận chuyển
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
