# Hướng dẫn Khởi tạo Mạng Blockchain

Tài liệu này liệt kê các lệnh từng bước để khởi tạo mạng Hyperledger Fabric từ đầu.

//cd /mnt/data/petd/linh_TN/block-chain-net/test-network

# Upgrade chaincode
./network.sh deployCC -c nongsan -ccn agri-trace -ccp ../smart-contract -ccl go -ccv 2.0 -ccs 2

---

## 1. Khởi tạo mạng Fabric

```bash
cd /mnt/data/petd/linh_TN/block-chain-net/

./install-fabric.sh docker samples binary


Xóa dữ liệu cũ và tạo mạng mới.

```bash
cd /mnt/data/petd/linh_TN/block-chain-net/test-network

sudo apt update
sudo apt install -y jq

# Dừng mạng cũ (nếu có)
./network.sh down

# Xóa thư mục chứng chỉ cũ
rm -rf organizations/peerOrganizations
rm -rf organizations/ordererOrganizations

# Tạo mạng mới
./network.sh up createChannel -c nongsan -s couchdb
```



## 3. Deploy Chaincode

Deploy chaincode `agri-trace` lên channel `nongsan`.

### 3.1. Build và đóng gói chaincode

```bash
cd /mnt/data/petd/linh_TN/block-chain-net/test-network

./network.sh deployCC -c nongsan -ccn agri-trace -ccp ../smart-contract -ccl go
```

# Backend (chạy trong terminal 1)
cd "d:\petd\linh_TN\block-chain-net\backend" && node src/server.js

# Frontend (chạy trong terminal 2)
cd "d:\petd\linh_TN\block-chain-net\frontend" && pnpm dev -- -p 3001