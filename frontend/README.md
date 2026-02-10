# Finance Collection Management System

A comprehensive, full-stack web application for managing loans, customer collections, and business expenses. Built with **Next.js 16**, **React**, **TypeScript**, and **PostgreSQL**.

## Features

### 🔐 Authentication & Authorization
- Secure login/registration with password hashing (PBKDF2)
- Role-based access control (Admin & Collector)
- HTTP-only session cookies
- Protected API routes

### 👥 Customer Management
- Add, edit, view, and delete customer records
- Multiple loan types support
- Track loan details (principal, interest rate, dates)
- Customer status tracking (active, paid, defaulted, suspended)
- Search and filter capabilities

### 💰 Collection Tracking
- Record daily collection entries
- Track payment methods (cash, check, transfer, other)
- View personal collection statistics (collectors)
- Daily, weekly, and custom date range reporting
- Collection amount and entry count tracking

### 📊 Analytics & Reporting
- Real-time performance dashboards
- Collector performance metrics
- Revenue tracking and analysis
- Customer status distribution
- Daily collection trends
- Expense tracking and categorization
- Net revenue calculations

### 💸 Expense Management (Admin)
- Record and categorize business expenses
- Category-based expense grouping
- Date range filtering
- Expense analytics and summaries

## Tech Stack

- **Frontend**: React 19, Next.js 16 (App Router)
- **Backend**: Next.js API Routes, TypeScript
- **Database**: PostgreSQL with custom migrations
- **Authentication**: Custom PBKDF2 password hashing, session-based auth
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **State Management**: React Hooks
- **Data Fetching**: Fetch API with async/await

## Project Structure

```
├── app/
│   ├── api/                          # Backend API Routes
│   │   ├── auth/
│   │   │   ├── login/               # POST: User login
│   │   │   ├── register/            # POST: User registration
│   │   │   ├── logout/              # POST: User logout
│   │   │   └── me/                  # GET: Current user
│   │   ├── customers/
│   │   │   ├── route.ts             # GET/POST customers
│   │   │   └── [id]/route.ts        # GET/PUT/DELETE specific customer
│   │   ├── collections/
│   │   │   └── route.ts             # GET/POST collection entries
│   │   ├── expenses/
│   │   │   ├── route.ts             # GET/POST expenses
│   │   │   └── [id]/route.ts        # DELETE specific expense
│   │   └── analytics/
│   │       └── route.ts             # GET analytics data
│   ├── auth/
│   │   ├── login/                   # Login page
│   │   └── register/                # Registration page
│   ├── admin/
│   │   ├── dashboard/               # Admin dashboard with analytics
│   │   ├── customers/               # Customer management page
│   │   └── expenses/                # Expense management page
│   ├── collector/
│   │   └── dashboard/               # Collector dashboard with entry form
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Home (redirect to login)
│   └── globals.css                  # Global styles
├── components/
│   ├── auth/
│   │   ├── login-form.tsx          # Login form component
│   │   └── register-form.tsx       # Registration form component
│   ├── collector/
│   │   └── collection-form.tsx     # Collection entry form
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── db.ts                       # PostgreSQL connection pool
│   ├── auth.ts                     # Authentication utilities
│   ├── middleware.ts               # Route protection middleware
│   └── utils.ts                    # Utility functions
├── scripts/
│   └── schema.sql                  # Database schema
├── public/                         # Static assets
├── SETUP.md                        # Setup & installation guide
├── API_DOCUMENTATION.md            # Comprehensive API docs
├── README.md                       # This file
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd finance-collection-system
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup PostgreSQL database**
```bash
# Create database
createdb finance_collection

# Run schema migration
psql finance_collection < scripts/schema.sql

# (Optional) Insert sample loan types
psql finance_collection << EOF
INSERT INTO loan_types (name, description) VALUES
('Personal Loan', 'Unsecured personal loans'),
('Home Loan', 'Mortgage for home purchases'),
('Auto Loan', 'Vehicle financing loans');
EOF
```

4. **Configure environment variables**
```bash
# Create .env.local file
cat > .env.local << EOF
DATABASE_URL=postgresql://username:password@localhost:5432/finance_collection
NODE_ENV=development
EOF
```

5. **Start development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Workflows

### Admin Workflow
1. Login with admin credentials
2. View analytics dashboard with key metrics
3. Manage customers (add, edit, delete)
4. Track expenses by category
5. Monitor collector performance
6. Generate reports by date range

### Collector Workflow
1. Login with collector credentials
2. View personal dashboard
3. Record collection entries for customers
4. Track daily collection statistics
5. Filter collections by date
6. View collection history

## API Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Record collection

### Expenses (Admin)
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `DELETE /api/expenses/[id]` - Delete expense

### Analytics (Admin)
- `GET /api/analytics` - Get analytics data

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## Database Schema

### Key Tables
- **users**: User accounts with authentication
- **customers**: Customer information with loan details
- **loan_types**: Types of loans (Personal, Home, Auto, etc.)
- **collection_entries**: Daily collection records by collectors
- **expenses**: Business expenses with categories
- **performance_metrics**: Analytics data aggregation

See [scripts/schema.sql](./scripts/schema.sql) for full schema details.

## Security Features

- ✅ Password hashing with PBKDF2 (100,000 iterations)
- ✅ HTTP-only session cookies
- ✅ Role-based access control (RBAC)
- ✅ Protected API endpoints
- ✅ SQL parameter binding (prevents injection)
- ✅ Input validation and sanitization
- ✅ Secure session management

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run type checking
npm run type-check
```

### Environment Variables

```
DATABASE_URL    # PostgreSQL connection string (required)
NODE_ENV        # development or production
```

## Deployment

### Vercel Deployment (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Checklist
- [ ] Database backups configured
- [ ] Environment variables secured
- [ ] CORS configured if needed
- [ ] SSL/TLS enabled
- [ ] Rate limiting implemented
- [ ] Monitoring and logging setup
- [ ] Error handling and logging
- [ ] Database connection pooling optimized

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct.

### Authentication Issues
**Solution**: Clear browser cookies and check session middleware is working.

### Port Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

## Performance Optimization

- Database connection pooling
- Indexed database queries
- Client-side state management
- Optimized API endpoints
- CSS-in-JS with Tailwind

## Future Enhancements

- [ ] Email notifications for collections
- [ ] SMS reminders for customers
- [ ] Advanced PDF report generation
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Automated collection scheduling
- [ ] Customer portal for payments
- [ ] Document upload/storage
- [ ] Audit logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support & Documentation

- **Setup Guide**: See [SETUP.md](./SETUP.md)
- **API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub discussions for questions

## Contact

For questions or support, please create an issue on the GitHub repository.

---

**Created with ❤️ using v0 and Next.js**

Last Updated: February 2026
Version: 1.0.0
