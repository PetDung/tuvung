# AgriTrace Smart Contract - Hướng Dẫn Sử Dụng

## Mục lục

- [Tổng quan](#tổng-quan)
- [Cấu trúc dữ liệu](#cấu-trúc-dữ-liệu)
- [Trạng thái sản phẩm](#trạng-thái-sản-phẩm)
- [Vai trò](#vai-trò)
- [Danh sách hàm](#danh-sách-hàm)
- [Hướng dẫn sử dụng chi tiết](#hướng-dẫn-sử-dụng-chi-tiết)
- [Ví dụ](#ví-dụ)
- [Lưu ý quan trọng](#lưu-ý-quan-trọng)

---

## Tổng quan

Contract `agri-trace` quản lý truy xuất nguồn gốc nông sản trên Hyperledger Fabric. Mỗi sản phẩm được ghi nhận với các thông tin chống giả mạo, các sự kiện trong chuỗi cung ứng được lưu trữ dưới dạng bất biến.

**Module:** `agri-trace`
**Channel:** `nongsan`
**Chaincode:** `agri-trace`

---

## Cấu trúc dữ liệu

### Product

```json
{
  "ID": "PROD-XXXXX",
  "RefID": "uuid-trong-database",
  "FarmID": "FARM-001",
  "FarmName": "Ten Trang Trai",
  "FarmerID": "USER-001",
  "FarmerName": "Nguyen Van A",
  "Status": "Growing | Harvested | InTransit | Delivered | Sold",
  "Certified": true | false,
  "QRCode": "https://agri.trace/v1/{refId}",
  "CurrentOwner": "USER-001",
  "CurrentRole": "Farmer | Distributor | Retailer",
  "CreatedAt": "2024-01-01T00:00:00Z",
  "UpdatedAt": "2024-01-01T00:00:00Z"
}
```

### SupplyChainEvent

```json
{
  "ID": "EVT-xxxxxxxxxxxx",
  "ProductID": "PROD-XXXXX",
  "EventType": "Created | StatusChanged | Transferred | Certified | Inspected | Delivered",
  "ActorID": "USER-001",
  "ActorName": "Nguyen Van A",
  "ActorRole": "Farmer | Distributor | Retailer | Inspector",
  "Timestamp": "2024-01-01T00:00:00Z",
  "Location": "Dia diem su kien",
  "PrevOwner": "USER-001",
  "NewOwner": "USER-002",
  "Description": "Mo ta su kien",
  "TxID": "transaction-id-tren-blockchain"
}
```

### PaginatedQueryResults

```json
{
  "products": [Product],
  "bookmark": "next-page-bookmark",
  "fetchedCount": 25
}
```

---

## Trạng thái sản phẩm

| Trạng thái | Mô tả |
|------------|-------|
| `Growing` | Đang trồng/trưởng thành |
| `Harvested` | Đã thu hoạch |
| `InTransit` | Đang vận chuyển |
| `Delivered` | Đã giao hàng |
| `Sold` | Đã bán (trạng thái cuối, không chuyển được) |

### Luồng chuyển trạng thái hợp lệ

```
Growing → Harvested
Growing → InTransit
Harvested → InTransit
Harvested → Delivered
InTransit → Delivered
InTransit → Sold
Delivered → Sold
Sold → (không thể chuyển - trạng thái cuối)
```

---

## Vai trò

| Vai trò | Mô tả |
|---------|-------|
| `Farmer` | Nông dân/trang trại |
| `Distributor` | Nhà phân phối |
| `Retailer` | Nhà bán lẻ |
| `Inspector` | Người kiểm định/chứng nhận |

---

## Danh sách hàm

### Khởi tạo

| Hàm | Loại | Mô tả |
|-----|------|-------|
| `InitLedger` | Submit | Khởi tạo ledger (backwards compatibility - no-op) |

### Tạo & Đọc sản phẩm

| Hàm | Loại | Mô tả |
|-----|------|-------|
| `CreateProduct` | Submit | Tạo sản phẩm mới |
| `ReadProduct` | Evaluate | Đọc sản phẩm theo ID |
| `ProductExists` | Evaluate | Kiểm tra sản phẩm tồn tại |
| `GenerateQRPayload` | Evaluate | Tạo nội dung QR code |

### Cập nhật sản phẩm

| Hàm | Loại | Mô tả |
|-----|------|-------|
| `UpdateProductStatus` | Submit | Cập nhật trạng thái sản phẩm |
| `TransferProduct` | Submit | Chuyển giao sản phẩm cho chủ sở hữu mới |
| `MarkAsCertified` | Submit | Đánh dấu sản phẩm đạt chứng nhận |

### Sự kiện chuỗi cung ứng

| Hàm | Loại | Mô tả |
|-----|------|-------|
| `RecordInspection` | Submit | Ghi nhận sự kiện kiểm định |
| `RecordDelivery` | Submit | Ghi nhận sự kiện giao hàng |

### Truy vấn

| Hàm | Loại | Mô tả |
|-----|------|-------|
| `GetAllProducts` | Evaluate | Lấy tất cả sản phẩm (phân trang) |
| `GetProductsByFarmer` | Evaluate | Lấy sản phẩm theo nông dân (phân trang) |
| `GetProductsByStatus` | Evaluate | Lấy sản phẩm theo trạng thái (phân trang) |
| `GetProductsByOwner` | Evaluate | Lấy sản phẩm theo chủ sở hữu (phân trang) |
| `GetSupplyChainEvents` | Evaluate | Lấy sự kiện chuỗi cung ứng |
| `GetProductHistory` | Evaluate | Lấy lịch sử blockchain của sản phẩm |

---

## Hướng dẫn sử dụng chi tiết

### 1. Tạo sản phẩm mới

**Hàm:** `CreateProduct`

**Tham số:**
```
id, refID, farmID, farmName, farmerID, farmerName, status, qrCode, createdAt
```

**Ví dụ:**
```
CreateProduct("PROD-001", "uuid-xxx", "FARM-001", "Culi Farm", "USER-001", "Nguyen Van A", "Growing", "https://agri.trace/v1/uuid-xxx", "2024-01-01T08:00:00Z")
```

**Validation:**
- `id` không được rỗng
- `refID` không được rỗng (reference đến backend database)
- `farmerID` không được rỗng
- `qrCode` không được rỗng
- `status` phải là giá trị hợp lệ
- Sản phẩm với `id` đã tồn tại sẽ bị từ chối

**Giá trị mặc định:**
- `Certified = false`
- `CurrentOwner = farmerID`
- `CurrentRole = Farmer`

**Sự kiện blockchain:** Tự động tạo event `Created`

---

### 2. Đọc sản phẩm

**Hàm:** `ReadProduct`

**Tham số:**
```
id
```

**Ví dụ:**
```
ReadProduct("PROD-001")
```

**Trả về:** Object `Product` hoặc lỗi nếu không tìm thấy

---

### 3. Cập nhật trạng thái

**Hàm:** `UpdateProductStatus`

**Tham số:**
```
id, newStatus, updatedAt, actorID, actorName
```

**Ví dụ:**
```
UpdateProductStatus("PROD-001", "Harvested", "2024-01-15T10:00:00Z", "USER-001", "Nguyen Van A")
```

**Validation:**
- `newStatus` phải hợp lệ
- Chuyển đổi trạng thái phải tuân theo luồng cho phép
- Sản phẩm phải tồn tại

**Sự kiện blockchain:** Tự động tạo event `StatusChanged`

---

### 4. Chuyển giao sản phẩm

**Hàm:** `TransferProduct`

**Tham số:**
```
productID, newOwner, newOwnerRole, newOwnerName, updatedAt, actorID, actorName
```

**Ví dụ:**
```
TransferProduct("PROD-001", "USER-DIST-001", "Distributor", "Viet Transport Co.", "2024-01-20T14:00:00Z", "USER-001", "Nguyen Van A")
```

**Validation:**
- `newOwnerRole` phải là `Farmer`, `Distributor`, `Retailer`, hoặc `Inspector`
- Sản phẩm không được ở trạng thái `Sold`
- Sản phẩm phải tồn tại

**Sự kiện blockchain:** Tự động tạo event `Transferred`

---

### 5. Ghi nhận kiểm định

**Hàm:** `RecordInspection`

**Tham số:**
```
productID, inspectorID, inspectorName, inspectorRole, timestamp, location, description
```

**Ví dụ:**
```
RecordInspection("PROD-001", "USER-INS-001", "Agricultural Bureau", "Inspector", "2024-01-10T09:00:00Z", "Can Tho City", "Passed organic certification")
```

**Validation:**
- `inspectorRole` phải hợp lệ
- Sản phẩm phải tồn tại

**Lưu ý:** Event ID được tự động tạo từ TxID (`INSP-{txid_prefix}`)

---

### 6. Ghi nhận giao hàng

**Hàm:** `RecordDelivery`

**Tham số:**
```
eventID, productID, receiverID, receiverName, receiverRole, timestamp, location
```

**Ví dụ:**
```
RecordDelivery("DEL-001", "PROD-001", "USER-RET-001", "Saigon Mart", "Retailer", "2024-01-25T16:00:00Z", "Ho Chi Minh City")
```

**Validation:**
- Sản phẩm phải tồn tại

---

### 7. Đánh dấu chứng nhận

**Hàm:** `MarkAsCertified`

**Tham số:**
```
productID, certifiedAt, certifierID, certifierName
```

**Ví dụ:**
```
MarkAsCertified("PROD-001", "2024-01-12T11:00:00Z", "USER-CERT-001", "Organic Board")
```

**Validation:**
- Sản phẩm phải tồn tại
- Sản phẩm chưa được chứng nhận

**Sự kiện blockchain:** Tự động tạo event `Certified`

---

### 8. Truy vấn sản phẩm (phân trang)

**Hàm:** `GetAllProducts`, `GetProductsByFarmer`, `GetProductsByStatus`, `GetProductsByOwner`

**Tham số:**
```
pageSize, bookmark
```

**Ví dụ:**
```
GetAllProducts(25, "")
GetProductsByFarmer("USER-001", 25, "")
GetProductsByStatus("Harvested", 25, "")
GetProductsByOwner("USER-DIST-001", 25, "")
```

**Pagination:**
- `pageSize`: Số lượng kết quả mỗi trang (mặc định: 25, tối đa: 100)
- `bookmark`: Bookmark của trang tiếp theo (để trống cho trang đầu)
- Trả về `PaginatedQueryResults` với `bookmark` để lấy trang tiếp theo

**Validation (GetProductsByStatus):**
- `status` phải hợp lệ

---

### 9. Lấy sự kiện chuỗi cung ứng

**Hàm:** `GetSupplyChainEvents`

**Tham số:**
```
productID
```

**Ví dụ:**
```
GetSupplyChainEvents("PROD-001")
```

**Trả về:** Mảng các `SupplyChainEvent` theo thứ tự thời gian

---

### 10. Lấy lịch sử blockchain

**Hàm:** `GetProductHistory`

**Tham số:**
```
productID
```

**Ví dụ:**
```
GetProductHistory("PROD-001")
```

**Trả về:** Mảng các `SupplyChainEvent` thể hiện mọi thay đổi trên blockchain

---

### 11. Tạo QR Payload

**Hàm:** `GenerateQRPayload`

**Tham số:**
```
productID
```

**Ví dụ:**
```
GenerateQRPayload("PROD-001")
```

**Trả về:**
```json
{
  "id": "PROD-001",
  "refId": "uuid-xxx",
  "farm": "Culi Farm",
  "status": "Harvested",
  "url": "https://agri.trace/v1/uuid-xxx"
}
```

---

## Ví dụ

### Chuỗi luồng hoàn chỉnh

```javascript
// 1. Nông dân tạo sản phẩm
await contract.submitTransaction(
    'CreateProduct',
    'PROD-RICE-001',
    'uuid-ref-001',
    'FARM-MEKONG',
    'Mekong Delta Farm',
    'USER-FARM-001',
    'Tran Van A',
    'Growing',
    'https://agri.trace/v1/uuid-ref-001',
    '2024-01-01T08:00:00Z'
);

// 2. Cập nhật trạng thái sang Harvested
await contract.submitTransaction(
    'UpdateProductStatus',
    'PROD-RICE-001',
    'Harvested',
    '2024-03-01T10:00:00Z',
    'USER-FARM-001',
    'Tran Van A'
);

// 3. Ghi nhận kiểm định
await contract.submitTransaction(
    'RecordInspection',
    'PROD-RICE-001',
    'USER-INS-001',
    'Agricultural Bureau',
    'Inspector',
    '2024-03-02T09:00:00Z',
    'Can Tho Province',
    'Passed quality inspection'
);

// 4. Chuyển cho nhà phân phối
await contract.submitTransaction(
    'TransferProduct',
    'PROD-RICE-001',
    'USER-DIST-001',
    'Distributor',
    'Viet Transport Co.',
    '2024-03-05T14:00:00Z',
    'USER-FARM-001',
    'Tran Van A'
);

// 5. Đánh dấu chứng nhận hữu cơ
await contract.submitTransaction(
    'MarkAsCertified',
    'PROD-RICE-001',
    '2024-03-03T11:00:00Z',
    'USER-CERT-001',
    'Organic Certification Board'
);

// 6. Cập nhật trạng thái InTransit
await contract.submitTransaction(
    'UpdateProductStatus',
    'PROD-RICE-001',
    'InTransit',
    '2024-03-06T08:00:00Z',
    'USER-DIST-001',
    'Viet Transport Co.'
);

// 7. Ghi nhận giao hàng
await contract.submitTransaction(
    'RecordDelivery',
    'DEL-RICE-001',
    'PROD-RICE-001',
    'USER-RET-001',
    'Saigon Mart',
    'Retailer',
    '2024-03-08T16:00:00Z',
    'Ho Chi Minh City'
);

// 8. Cập nhật trạng thái Delivered
await contract.submitTransaction(
    'UpdateProductStatus',
    'PROD-RICE-001',
    'Delivered',
    '2024-03-08T17:00:00Z',
    'USER-RET-001',
    'Saigon Mart'
);

// 9. Chuyển cho nhà bán lẻ
await contract.submitTransaction(
    'TransferProduct',
    'PROD-RICE-001',
    'USER-RETAIL-001',
    'Retailer',
    'City Supermarket',
    '2024-03-10T09:00:00Z',
    'USER-RET-001',
    'Saigon Mart'
);

// 10. Cập nhật trạng thái Sold
await contract.submitTransaction(
    'UpdateProductStatus',
    'PROD-RICE-001',
    'Sold',
    '2024-03-15T10:00:00Z',
    'USER-RETAIL-001',
    'City Supermarket'
);

// Truy vấn dữ liệu
const product = await contract.evaluateTransaction('ReadProduct', 'PROD-RICE-001');
const events = await contract.evaluateTransaction('GetSupplyChainEvents', 'PROD-RICE-001');
const history = await contract.evaluateTransaction('GetProductHistory', 'PROD-RICE-001');
const qrPayload = await contract.evaluateTransaction('GenerateQRPayload', 'PROD-RICE-001');
```

---

## Lưu ý quan trọng

### 1. Phân biệt Submit vs Evaluate

- **Submit Transaction**: Ghi dữ liệu lên blockchain, yêu cầu endorsement từ peers
- **Evaluate Transaction**: Chỉ đọc dữ liệu từ một peer, không ghi gì

### 2. Validation

- Contract có đầy đủ validation cho trạng thái và vai trò
- Các chuyển đổi trạng thái không hợp lệ sẽ bị từ chối
- Sản phẩm đã `Sold` không thể chuyển nhượng

### 3. Sự kiện tự động

- `CreateProduct` → event `Created`
- `UpdateProductStatus` → event `StatusChanged`
- `TransferProduct` → event `Transferred`
- `MarkAsCertified` → event `Certified`
- `RecordInspection` và `RecordDelivery` tự tạo event riêng

### 4. Pagination

- Mặc định 25 kết quả mỗi trang
- Tối đa 100 kết quả mỗi trang
- Sử dụng `bookmark` để lấy trang tiếp theo

### 5. CouchDB

- Các query phân trang yêu cầu CouchDB làm state database
- Với LevelDB, chỉ sử dụng `ReadProduct` và `GetProductHistory`

### 6. QR Code

- URL base: `https://agri.trace/v1/`
- QR payload chứa ID, RefID, Farm, Status, và URL đầy đủ

---

## Cài đặt & Triển khai

### Build chaincode

```bash
cd smart-contract
go mod tidy
go build ./...
```

### Deploy lên Fabric

```bash
# Package chaincode
peer lifecycle chaincode package agri-trace.tar.gz --path smart-contract --lang golang --label agri-trace_1.0

# Install chaincode
peer lifecycle chaincode install agri-trace.tar.gz

# Approve chaincode
peer lifecycle chaincode approveformyorg --channelID nongsan --name agri-trace --version 1.0 --package-id <package-id> --sequence 1

# Commit chaincode
peer lifecycle chaincode commit --channelID nongsan --name agri-trace --version 1.0 --sequence 1
```

---

## Gateway Sample

Xem `gateway/src/app.js` để biết ví dụ hoàn chỉnh về cách gọi các hàm từ Node.js client.
