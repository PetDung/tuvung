'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { productsApi, shipmentsApi } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import ProductForm from '@/components/ProductForm';
import ApproveModal from '@/components/ApproveModal';
import ShipmentModal from '@/components/ShipmentModal';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { Plus, Package, X, Filter, Search } from 'lucide-react';
import type { Product, ProductFormData, ApproveProductRequest } from '@/types';

function ProductsContent() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    // Check URL params for actions
    if (searchParams.get('action') === 'create') {
      setShowCreateModal(true);
    }
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status') || 'ALL');
    }
  }, [searchParams]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, statusFilter]);

  const loadProducts = async () => {
    try {
      let data: Product[];

      if (hasRole('FARMER')) {
        // FARMER: chỉ thấy sản phẩm của mình
        data = await productsApi.getMyProducts();
      } else if (hasRole('RETAILER')) {
        // RETAILER: thấy SP đã duyệt + SP trong shipment của mình
        data = await productsApi.getRetailerProducts();
      } else if (hasRole('DISTRIBUTOR')) {
        // DISTRIBUTOR: chỉ thấy SP trong shipment mình đã nhận
        data = await productsApi.getDistributorProducts();
      } else {
        // INSPECTOR/ADMIN: xem tất cả
        data = await productsApi.getAll();
      }

      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // INSPECTOR: mặc định filter REGISTERED (chỉ 1 lần khi mount)
  useEffect(() => {
    if (hasRole('INSPECTOR')) {
      setStatusFilter('REGISTERED');
    }
  }, []);

  const filterProducts = () => {
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          (p.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.origin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.farmerName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleCreateProduct = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await productsApi.create(data);
      setShowCreateModal(false);
      loadProducts();
      toast.success('Tạo sản phẩm thành công', 'Sản phẩm đã được đăng ký và chờ duyệt');
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // INSPECTOR: Mở modal duyệt
  const handleOpenApprove = (product: Product) => {
    setSelectedProduct(product);
    setShowApproveModal(true);
  };

  // INSPECTOR: Duyệt sản phẩm
  const handleApprove = async (data: ApproveProductRequest) => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await productsApi.approve(selectedProduct.id, data);
      setShowApproveModal(false);
      setSelectedProduct(null);
      loadProducts();
      toast.success('Duyệt sản phẩm thành công', 'Sản phẩm đã được kiểm định và sẵn sàng vận chuyển');
    } catch (error) {
      console.error('Error approving product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // RETAILER: Mở modal tạo shipment
  const handleOpenShipment = (product: Product) => {
    setSelectedProduct(product);
    setShowShipmentModal(true);
  };

  // RETAILER: Tạo shipment
  const handleCreateShipment = async (data: { productId: string }) => {
    setIsSubmitting(true);
    try {
      await shipmentsApi.create(data);
      setShowShipmentModal(false);
      setSelectedProduct(null);
      toast.success('Yêu cầu vận chuyển thành công', 'Đơn hàng đã được tạo và chờ distributor nhận');
      router.push('/shipments');
    } catch (error) {
      console.error('Error creating shipment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Navbar title="Sản phẩm" />
        <div className="p-6">
          <div className="animate-pulse mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar title="Sản phẩm" />

      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Danh sách sản phẩm</h1>
            <p className="text-gray-600 mt-1">
              {hasRole('FARMER') && `Sản phẩm của tôi (${filteredProducts.length})`}
              {hasRole('INSPECTOR') && 'Sản phẩm chờ duyệt'}
              {hasRole(['RETAILER', 'DISTRIBUTOR']) && `Sản phẩm đã được kiểm định (${filteredProducts.length})`}
              {hasRole('ADMIN') && `Tổng cộng: ${filteredProducts.length} sản phẩm`}
            </p>
          </div>

          {hasRole('FARMER') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Tạo sản phẩm mới
            </button>
          )}
        </div>

        {/* Quick Status Filter — chỉ show cho role cần */}
        {!hasRole(['RETAILER', 'DISTRIBUTOR']) && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setStatusFilter('REGISTERED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'REGISTERED'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Chờ duyệt ({products.filter(p => p.status === 'REGISTERED').length})
          </button>
          <button
            onClick={() => setStatusFilter('INSPECTED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'INSPECTED'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Đã duyệt ({products.filter(p => p.status === 'INSPECTED').length})
          </button>
          <button
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'IN_TRANSIT'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Đang vận chuyển ({products.filter(p => p.status === 'IN_TRANSIT').length})
          </button>
        </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-enter">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onApprove={hasRole('INSPECTOR') && product.status === 'REGISTERED' ? () => handleOpenApprove(product) : undefined}
                onRequestShip={hasRole('RETAILER') && product.status === 'INSPECTED' ? () => handleOpenShipment(product) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Không tìm thấy sản phẩm'
                : 'Chưa có sản phẩm nào'}
            </h3>
            <p className="text-gray-500 mb-4">
              {hasRole('FARMER') && !searchTerm && (statusFilter === 'ALL' || statusFilter === 'REGISTERED')
                ? 'Bắt đầu bằng cách tạo sản phẩm mới'
                : searchTerm || statusFilter !== 'ALL'
                ? 'Thử thay đổi bộ lọc tìm kiếm'
                : 'Không có sản phẩm nào'}
            </p>
            {hasRole('FARMER') && !searchTerm && (statusFilter === 'ALL' || statusFilter === 'REGISTERED') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Tạo sản phẩm đầu tiên
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Tạo sản phẩm mới</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <ProductForm
                onSubmit={handleCreateProduct}
                onCancel={() => setShowCreateModal(false)}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Approve Product Modal - INSPECTOR */}
      {showApproveModal && selectedProduct && (
        <ApproveModal
          product={selectedProduct}
          onSubmit={handleApprove}
          onCancel={() => {
            setShowApproveModal(false);
            setSelectedProduct(null);
          }}
          isLoading={isSubmitting}
        />
      )}

      {/* Create Shipment Modal - RETAILER */}
      {showShipmentModal && selectedProduct && (
        <ShipmentModal
          product={selectedProduct}
          onSubmit={handleCreateShipment}
          onCancel={() => {
            setShowShipmentModal(false);
            setSelectedProduct(null);
          }}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
