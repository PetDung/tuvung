import { traceApi } from '@/services/api';
import HistoryTimeline from '@/components/HistoryTimeline';
import StatusBadge from '@/components/StatusBadge';
import { Leaf, Package, MapPin, User, Calendar, AlertCircle, Ban } from 'lucide-react';
import type { TraceResponse } from '@/types';

interface TraceError {
  status: number;
  message: string;
}

async function getProductTrace(productId: string): Promise<{ trace: TraceResponse } | TraceError> {
  try {
    const trace = await traceApi.getTrace(productId);
    return { trace };
  } catch (error: any) {
    const status = error?.response?.status || 0;
    const message = error?.response?.data?.message || 'Không thể truy xuất thông tin sản phẩm';
    
    if (status === 404) {
      return { status: 404, message: 'Sản phẩm không tồn tại' };
    }
    if (status === 403) {
      return { status: 403, message };
    }
    
    console.error('Error fetching trace:', error);
    return { status: 0, message: 'Lỗi kết nối đến máy chủ' };
  }
}

function TraceErrorView({ status, message }: TraceError) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AgriTrace</h1>
              <p className="text-xs text-gray-500">Truy xuất nguồn gốc nông sản</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-12 text-center">
            {status === 403 ? (
              <>
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Ban className="w-10 h-10 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Sản phẩm chưa sẵn sàng
                </h2>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  {message}
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block text-sm text-amber-700">
                  <p>Thông tin truy xuất nguồn gốc chỉ được hiển thị khi sản phẩm đã được giao đến điểm bán.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Không tìm thấy sản phẩm
                </h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  {message}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>AgriTrace - Blockchain Supply Chain System</p>
        </div>
      </main>
    </div>
  );
}

function TraceContentView({ trace }: { trace: TraceResponse }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AgriTrace</h1>
              <p className="text-xs text-gray-500">Truy xuất nguồn gốc nông sản</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Product Info Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Package className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{trace.productName}</h2>
                  <p className="text-gray-500">ID: {trace.productId}</p>
                </div>
              </div>
              <StatusBadge status={trace.status} size="lg" />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Xuất xứ</p>
                  <p className="font-medium text-gray-900">{trace.origin || 'Chưa cập nhật'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Nông dân</p>
                  <p className="font-medium text-gray-900">{trace.farmerName}</p>
                </div>
              </div>
              {trace.category && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Package className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Danh mục</p>
                    <p className="font-medium text-gray-900">{trace.category}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Ngày đăng ký</p>
                  <p className="font-medium text-gray-900">{formatDate(trace.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {trace.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Mô tả</h3>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
                  {trace.description}
                </p>
              </div>
            )}

            {/* Product Grade */}
            {trace.grade && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Chứng nhận / Phân loại</h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                  <Leaf className="w-4 h-4" />
                  {trace.grade}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Trace History */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Lịch sử truy xuất</h2>
            <p className="text-gray-500 text-sm mt-1">
              Thông tin về hành trình của sản phẩm từ khi đăng ký đến khi đến tay người tiêu dùng
            </p>
          </div>
          <div className="p-6">
            {trace.events && trace.events.length > 0 ? (
              <HistoryTimeline 
                events={trace.events.map((item, index) => ({
                  id: `${index}`,
                  productId: trace.productId,
                  eventType: item.action,
                  description: item.location || '',
                  userId: item.actorId || '',
                  userName: item.actorName || '',
                  timestamp: item.timestamp,
                }))} 
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Chưa có lịch sử truy xuất</p>
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Badge */}
        <div className="mt-6 bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Dữ liệu được xác thực trên Blockchain</p>
            <p className="text-xs text-emerald-600">Mọi thông tin đều được ghi nhận bởi hệ thống Hyperledger Fabric, không thể chỉnh sửa</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>AgriTrace - Blockchain Supply Chain System</p>
        </div>
      </main>
    </div>
  );
}

export default async function TracePage({ params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = await params;
  const result = await getProductTrace(resolvedParams.productId);

  // Error case — show appropriate error view
  if ('status' in result) {
    return <TraceErrorView status={result.status} message={result.message} />;
  }

  // Success — show trace content
  return <TraceContentView trace={result.trace} />;
}
