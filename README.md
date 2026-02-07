# Payment Backoffice System

**Backend API**: [nestjs-payment-api](https://github.com/mousebb/nestjs-payment-api)

A comprehensive payment management backoffice system built with Next.js, providing merchant management, transaction processing, gateway routing, and financial reporting capabilities.

## Tech Stack

- **Framework**: Next.js 15.3.3 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Internationalization**: next-intl (English & Chinese)
- **Charts**: ApexCharts
- **UI Components**: React Aria Components, Headless UI
- **Authentication**: JWT (Access Token & Refresh Token)
- **Real-time**: Server-Sent Events (SSE) for notifications
- **Date Handling**: date-fns-tz
- **Data Export**: jsPDF, PapaParse, FileSaver

## Features

### Core Modules

- **Dashboard**: Real-time statistics and analytics with daily/weekly/monthly views
- **Merchant Management**: Merchant accounts, fee settings, account transactions, and merchant summaries
- **Payment Processing**: Payment list, details, status updates, and payment logs
- **Withdrawal Management**: Withdrawal requests, status tracking, and processing
- **Refund Management**: Refund processing and status updates
- **Gateway Management**: Gateway configuration, status codes, and batch operations
- **Router Management**: Payment routing rules and configuration
- **Transaction Rules**: Transaction method rules and routing logic
- **Bank & Currency Management**: Bank and currency configuration
- **Settlement Methods**: Settlement cycle and method configuration
- **Financial Reports**: Daily and monthly statements, commission logs, and settlements
- **User & Permission Management**: Role-based access control (RBAC)
- **Access Logs**: API and web access logging
- **Notification System**: Real-time notifications via SSE

### System Features

- **Multi-language Support**: English and Chinese (中文)
- **Dark Mode**: Theme switching support
- **Tab-based Navigation**: Multi-tab interface for efficient workflow
- **Permission-based Access Control**: Granular permission system
- **Responsive Design**: Mobile and desktop support
- **Data Visualization**: Charts and graphs for analytics
- **Export Capabilities**: PDF and CSV export functionality

## Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

## Getting Started

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The application will be available at [http://localhost:3002](http://localhost:3002).

### Build

Build for production:

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

The production server will run on port 3002.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── login/             # Login page
│   ├── forgot-password/   # Password recovery
│   ├── gateways/          # Gateway pages
│   ├── reports/           # Report pages
│   └── withdrawals/       # Withdrawal pages
├── components/            # React components
│   ├── AuthContext.tsx   # Authentication context
│   ├── ThemeContext.tsx   # Theme context
│   ├── Sidebar.tsx       # Sidebar navigation
│   ├── Topbar.tsx        # Top navigation bar
│   └── ...               # Other components
├── constants/             # Configuration constants
│   ├── config.ts         # System configuration
│   ├── apiRoutes.ts      # API route definitions
│   └── locales.ts        # Locale configuration
├── hooks/                # Custom React hooks
│   ├── useAuthNavigation.ts
│   ├── usePermission.ts
│   ├── useNotificationSSE.ts
│   └── ...
├── lib/                  # Utility libraries
│   ├── utils.ts          # Utility functions
│   ├── basic-data.service.ts
│   └── locale.ts
├── i18n/                 # Internationalization
│   ├── config.ts
│   └── request.ts
├── messages/             # Translation files
│   ├── en.json
│   └── zh.json
├── types/                # TypeScript type definitions
├── views/                # View configuration
└── public/               # Static assets
```

## User Roles & Permissions

The system supports the following roles:

- **Admin**: Full system access
- **Operation**: Merchant management operations
- **Finance**: Financial statements and settlements
- **Merchant**: Payment creation and viewing
- **Agent**: Commission logs and settlements

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Configuration

### API Base URL

Configure the API base URL via environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=your-api-url
```

### Default Settings

- Default page size: 10 items
- Max page size: 1000 items
- Server port: 3002

## Development Notes

- The project uses Next.js App Router with React Server Components
- Authentication is handled via JWT tokens stored in cookies
- Internationalization is managed through next-intl
- Real-time notifications use Server-Sent Events (SSE)
- Large components are dynamically imported for code splitting
- Tab navigation state is synchronized with URL query parameters

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## ❤️ Support the Maintainer

This project is independently developed and maintained.

You can support ongoing development via:

**TRON (TRX / TRC20)**
`TRysLsvUqTUAyZN2pLMJjW95pYTNkGvrzM`

**Ethereum (ETH / ERC20)**
`0x0e6C46f49F4c3Bd90a855Ce18396Ee9666003146`

Thank you for supporting open infrastructure.
