# Hướng Dẫn Chạy AgriTrace - Từ Đầu Đến Cuối

## Tổng Quan Luồng

```
Docker Network → Chaincode → Gateway → Test
```

---

## BƯỚC 1: Reset Network (Nếu cần reset sạch)

> Bỏ qua bước này nếu network đang chạy bình thường và chỉ muốn restart gateway

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/test-network
./network.sh down
```

---

## BƯỚC 2: Rebuild Chaincode Mới

> Thực hiện MỖI LẦN khi có thay đổi code `chaincode.go`

```bash
# 1. Xóa chaincode cũ
rm -f ../smart-contract/agri-trace.tar.gz

# 2. Vendor dependencies
cd ../smart-contract
go mod tidy
go mod vendor

# 3. Package chaincode
cd ../test-network
peer lifecycle chaincode package ../smart-contract/agri-trace.tar.gz \
  --path ../smart-contract \
  --lang golang \
  --label agri-trace_1.0
```

---

## BƯỚC 3: Start Network & Tạo Channel

> Thực hiện SAU BƯỚC 2. Chạy ĐÚNG 1 LẦN, không chạy 2 lần liên tiếp

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/test-network
./network.sh up createChannel -c nongsan -s couchdb
```

**Lưu ý:** Nếu chạy lệnh này 2 lần liên tiếp sẽ bị lỗi:
```
Error: cannot create ledger from genesis block: ledger [nongsan] already exists
```
→ Khi đó phải `./network.sh down` trước rồi chạy lại.

---

## BƯỚC 4: Deploy Chaincode

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/test-network
./network.sh deployCC -c nongsan -cci InitLedger
```

---

## BƯỚC 5: Start Gateway

> Mở **terminal riêng** (terminal 1)

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/gateway
node src/app.js
```

**Dấu hiệu chạy thành công:**
```
*** AgriTrace Gateway REST API listening on port 4000
*** Fabric connection established
```

---

## BƯỚC 6: Chạy Test

> Mở **terminal riêng** (terminal 2)

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/gateway
node test/run_all.js
```

### Chạy từng test riêng

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/gateway

node test/01_create_product.test.js    # Tạo sản phẩm
node test/02_approve_product.test.js    # Inspector duyệt
node test/03_shipment.test.js          # Vận chuyển
node test/04_mark_sold.test.js         # Đánh dấu bán
node test/05_qr_trace.test.js          # Verify chuỗi sự kiện
node test/06_invalid_transitions.test.js  # Test lỗi bất hợp lệ
```

> **Quan trọng:** Test 01 → 05 phải chạy theo thứ tự vì dùng chung product IDs.

---

## Luồng Nghiệp Vụ Được Test

```
[Farmer]
  POST /api/products
  → status: Registered, owner: Farmer
       ↓
[Inspector]
  POST /api/products/:id/approve
  → status: Inspected
       ↓
[Distributor]
  POST /api/products/:id/ship
  → status: InTransit, owner: Distributor
       ↓
[Retailer]
  POST /api/products/:id/receive
  → status: Delivered, owner: Retailer
       ↓
  PUT /api/products/:id/status (Sold)
  → status: Sold
```

---

## Mẹo Xử Lý Lỗi Thường Gặp

### Lỗi quyền truy cập `node_modules`

```bash
chmod -R 777 /mnt/d/petd/linh_TN/block-chain-net/gateway
cd /mnt/d/petd/linh_TN/block-chain-net/gateway
rm -rf node_modules
npm i
```

### Lỗi `Cannot find module 'axios'`

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/gateway
npm install axios
```

### Lỗi test fail toàn bộ (500 error)

→ Gateway chưa chạy. Kiểm tra terminal 1 đã start `node src/app.js` chưa.

### Lỗi `ledger already exists`

→ Network đang chạy. Không cần chạy `network.sh up` nữa, chỉ cần restart gateway.

### Muốn reset test sạch

```bash
cd /mnt/d/petd/linh_TN/block-chain-net/test-network
./network.sh down
# Quay lại BƯỚC 2
```

---

## Kiểm Tra Docker Containers

```bash
docker ps
```

**Phải thấy đủ:**
- `peer0.org1.example.com`
- `peer0.org2.example.com`
- `orderer.example.com`
- `couchdb0`, `couchdb1`
- `dev-peer0.org1.example.com-agri-trace_1.0-*`
