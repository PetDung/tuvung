'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { shipmentsApi, scanApi } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import Navbar from '@/components/Navbar';
import ShipmentCard from '@/components/ShipmentCard';
import AcceptShipmentModal from '@/components/AcceptShipmentModal';
import ScanVerificationModal from '@/components/ScanVerificationModal';
import { CardSkeleton } from '@/components/LoadingSkeleton';
import { Truck } from 'lucide-react';
import type { Shipment } from '@/types';

export default function ShipmentsPage() {
  const { user, hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAction, setScanAction] = useState<'shipping' | 'delivered'>('shipping');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const isDistributor = hasRole('DISTRIBUTOR');
  const isRetailer = hasRole('RETAILER');

  useEffect(() => {
    if (!hasRole(['DISTRIBUTOR', 'RETAILER', 'ADMIN'])) {
      router.push('/dashboard');
      return;
    }
    loadShipments();
  }, []);

  useEffect(() => {
    filterShipments();
  }, [shipments, statusFilter, user]);

  const loadShipments = async () => {
    try {
      setIsLoading(true);
      
      if (isDistributor) {
        // DISTRIBUTOR: lấy đơn chờ nhận + đơn mình đã nhận
        const [myShipments, pendingShipments] = await Promise.all([
          shipmentsApi.getMyShipments(),
          shipmentsApi.getPending(),
        ]);
        
        // Merge: ưu tiên pending (chưa ai nhận), thêm đơn của mình (không trùng)
        const pendingIds = new Set(pendingShipments.map(s => s.id));
        const uniqueMine = myShipments.filter(s => !pendingIds.has(s.id));
        setShipments([...pendingShipments, ...uniqueMine]);
      } else if (isRetailer) {
        // RETAILER: chỉ xem đơn hàng mình tạo
        const myShipments = await shipmentsApi.getMyShipments();
        setShipments(myShipments);
      } else {
        // ADMIN: xem tất cả đơn hàng
        setShipments(await shipmentsApi.getAllShipments());
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterShipments = () => {
    // DISTRIBUTOR: đơn PENDING + đơn mình đã nhận
    if (isDistributor) {
      setFilteredShipments(
        shipments.filter(s => 
          s.distributorId === user?.id || 
          s.status === 'PENDING'
        )
      );
      return;
    }

    if (isRetailer) {
      // RETAILER: chỉ thấy đơn hàng mình tạo (toUserId === me)
      setFilteredShipments(
        shipments.filter(s => s.toUserId === user?.id)
      );
      return;
    }

    // ADMIN: filter theo status
    if (statusFilter !== 'ALL') {
      setFilteredShipments(shipments.filter((s) => s.status === statusFilter));
    } else {
      setFilteredShipments(shipments);
    }
  };

  // DISTRIBUTOR: Mở modal nhận đơn
  const handleOpenAccept = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setShowAcceptModal(true);
  };

  // DISTRIBUTOR: Nhận đơn với transport info
  const handleAccept = async (data: { transportType?: string; vehiclePlate?: string }) => {
    if (!selectedShipment) return;
    try {
      await shipmentsApi.accept(selectedShipment.id, data.transportType, data.vehiclePlate);
      setShowAcceptModal(false);
      setSelectedShipment(null);
      loadShipments();
      toast.success('Nhận đơn thành công', 'Bạn đã nhận đơn vận chuyển');
    } catch (error) {
      console.error('Error accepting shipment:', error);
    }
  };

  // DISTRIBUTOR: Mở modal scan để bắt đầu giao
  const handleOpenStart = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setScanAction('shipping');
    setShowScanModal(true);
  };

  // DISTRIBUTOR: Mở modal scan để xác nhận đã giao
  const handleDelivered = (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      setSelectedShipment(shipment);
      setScanAction('delivered');
      setShowScanModal(true);
    }
  };

  // Sau khi scan thành công
  const handleScanVerified = async (productId: string, signature: string) => {
    if (!selectedShipment) return;
    setShowScanModal(false);
    
    try {
      if (scanAction === 'shipping') {
        await scanApi.shipping(productId, signature, 'Đang vận chuyển');
        toast.success('Bắt đầu vận chuyển thành công!', 'QR đã được xác thực');
      } else {
        await scanApi.delivered(productId, signature, 'Đã giao hàng');
        toast.success('Xác nhận đã giao thành công!', 'QR đã được xác thực');
      }
      setSelectedShipment(null);
      loadShipments();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div>
        <Navbar title="Vận chuyển" />
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
      <Navbar title="Vận chuyển" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý vận chuyển</h1>
          <p className="text-gray-600 mt-1">
            {isDistributor && `Đơn chờ nhận (${shipments.filter(s => s.status === 'PENDING').length}) — Đơn của tôi (${shipments.filter(s => s.distributorId === user?.id).length})`}
            {isRetailer && `Đơn hàng của tôi (${filteredShipments.length})`}
            {hasRole('ADMIN') && `Tổng cộng: ${filteredShipments.length} đơn hàng`}
          </p>
        </div>

        {/* Quick Status Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Tất cả ({shipments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Chờ nhận ({shipments.filter(s => s.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setStatusFilter('ACCEPTED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'ACCEPTED'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Đã nhận ({shipments.filter(s => s.status === 'ACCEPTED').length})
          </button>
          <button
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'IN_TRANSIT'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Đang giao ({shipments.filter(s => s.status === 'IN_TRANSIT').length})
          </button>
          <button
            onClick={() => setStatusFilter('DELIVERED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'DELIVERED'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-500'
            }`}
          >
            Đã giao ({shipments.filter(s => s.status === 'DELIVERED').length})
          </button>
        </div>

        {/* Shipments Grid */}
        {filteredShipments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-enter">
            {filteredShipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                onAccept={isDistributor && shipment.status === 'PENDING' && !shipment.distributorId ? () => handleOpenAccept(shipment) : undefined}
                onStartShipping={isDistributor && shipment.status === 'ACCEPTED' && shipment.distributorId === user?.id ? () => handleOpenStart(shipment) : undefined}
                onDelivered={isDistributor && shipment.status === 'IN_TRANSIT' && shipment.distributorId === user?.id ? () => handleDelivered(shipment.id) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Chưa có đơn hàng nào
            </h3>
            <p className="text-gray-500">
              {isDistributor 
                ? 'Không có đơn hàng nào chờ bạn nhận'
                : isRetailer 
                ? 'Bạn chưa có đơn hàng nào. Hãy vào Sản phẩm để yêu cầu vận chuyển'
                : 'Chưa có đơn hàng nào trong hệ thống'}
            </p>
          </div>
        )}
      </div>

      {/* Accept Shipment Modal */}
      {showAcceptModal && selectedShipment && (
        <AcceptShipmentModal
          shipment={selectedShipment}
          onSubmit={handleAccept}
          onCancel={() => {
            setShowAcceptModal(false);
            setSelectedShipment(null);
          }}
          isLoading={false}
        />
      )}

      {/* Scan Verification Modal - Bắt buộc scan QR trước khi cập nhật trạng thái */}
      {showScanModal && selectedShipment && (
        <ScanVerificationModal
          shipment={selectedShipment}
          action={scanAction}
          onVerified={handleScanVerified}
          onCancel={() => {
            setShowScanModal(false);
            setSelectedShipment(null);
          }}
        />
      )}
    </div>
  );
}
