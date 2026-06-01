# AgriTrace Frontend

Next.js frontend for the AgriTrace blockchain-based agricultural supply chain system.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **QR Code**: qrcode.react

## Features

### Role-Based Access

- **FARMER**: Create products, view own products, trace history
- **INSPECTOR**: Approve products, view all products, generate QR codes
- **DISTRIBUTOR**: Accept shipments, update shipping status, scan QR codes
- **RETAILER**: Create shipment requests, mark products as sold, scan QR codes
- **ADMIN**: Full access to all features

### Pages

- `/login` - Authentication page
- `/dashboard` - Role-specific dashboard with KPIs
- `/products` - Product listing with filters
- `/products/[id]` - Product detail with history timeline and QR code
- `/shipments` - Shipment management
- `/shipments/[id]` - Shipment detail
- `/scan` - QR code scanning and status updates
- `/trace/[productId]` - Public trace page (no auth required)

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running at http://localhost:8080

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build

```bash
npm run build
npm start
```

## Default Test Accounts

| Username | Password | Role |
|----------|----------|------|
| farmer1 | password123 | FARMER |
| farmer2 | password123 | FARMER |
| inspector1 | password123 | INSPECTOR |
| inspector2 | password123 | INSPECTOR |
| distributor1 | password123 | DISTRIBUTOR |
| distributor2 | password123 | DISTRIBUTOR |
| retailer1 | password123 | RETAILER |
| retailer2 | password123 | RETAILER |
| admin | admin123 | ADMIN |

## API Configuration

The API base URL is configured in `lib/constants.ts`:

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

To change the API URL, set the `NEXT_PUBLIC_API_URL` environment variable.

## Project Structure

```
frontend/
├── app/
│   ├── (authenticated)/    # Protected routes
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── shipments/
│   │   └── scan/
│   ├── login/              # Login page
│   └── trace/              # Public trace page
├── components/             # Reusable UI components
├── contexts/               # React contexts
├── services/               # API service layer
├── types/                  # TypeScript types
└── lib/                    # Constants and utilities
```

## Color Theme

- Primary: Emerald/Green (agricultural theme)
- Status colors:
  - Registered: Gray
  - Inspected: Blue
  - In Transit: Yellow
  - Delivered: Green
  - Sold: Purple
