# Finance Collection Management System - Setup Guide

## Overview
A complete finance collection management system built with Next.js, React, and PostgreSQL. Features role-based access for Admins and Collectors with customer management, collection tracking, and analytics.

## Features
- **Authentication**: Secure login/registration with role-based access control
- **Admin Dashboard**: View analytics, manage customers, track expenses, and monitor collector performance
- **Collector Dashboard**: Record daily collection entries, view personal statistics
- **Customer Management**: Add, edit, and manage customer information with loan details
- **Collection Tracking**: Record and track customer collections by date and amount
- **Expense Management**: Admin expense tracking with category-based organization
- **Analytics**: Real-time performance metrics, revenue tracking, and status distribution

## Database Setup

### 1. Create PostgreSQL Database
```bash
createdb finance_collection
```

### 2. Run Schema Migration
Execute the SQL script to create all tables:
```bash
psql finance_collection < scripts/schema.sql
```

### 3. Initialize Loan Types (Optional)
```sql
INSERT INTO loan_types (name, description) VALUES
('Personal Loan', 'Unsecured personal loans'),
('Home Loan', 'Mortgage for home purchases'),
('Auto Loan', 'Vehicle financing loans');
```

## Environment Setup

### Required Environment Variables
Create a `.env.local` file in the root directory:

```
DATABASE_URL=postgresql://username:password@localhost:5432/finance_collection
NODE_ENV=development
```

Replace `username` and `password` with your PostgreSQL credentials.

## Installation

### 1. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Install Database Driver (if not already installed)
```bash
npm install pg
```

### 3. Run Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

Create test users in your database:

### Admin User
```sql
INSERT INTO users (email, password_hash, full_name, role, is_active) 
VALUES ('admin@example.com', 'hashed_password', 'Admin User', 'admin', true);
```

### Collector User
```sql
INSERT INTO users (email, password_hash, full_name, role, phone, is_active) 
VALUES ('collector@example.com', 'hashed_password', 'John Collector', 'collector', '+1-555-0000', true);
```

Note: Use the registration page to create users with proper password hashing.

## Project Structure

```
├── app/
│   ├── api/                  # API Routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── customers/       # Customer CRUD operations
│   │   ├── collections/     # Collection entry management
│   │   ├── expenses/        # Expense tracking
│   │   └── analytics/       # Analytics data
│   ├── auth/                # Authentication pages
│   ├── admin/               # Admin pages
│   ├── collector/           # Collector pages
│   └── layout.tsx
├── components/
│   ├── auth/               # Auth forms
│   └── collector/          # Collector components
├── lib/
│   ├── db.ts              # Database connection
│   ├── auth.ts            # Authentication utilities
│   └── middleware.ts      # Route protection
├── scripts/
│   └── schema.sql         # Database schema
└── public/                # Static assets
```

## Usage Guide

### For Admins
1. Login with admin credentials
2. View dashboard for analytics and KPIs
3. Manage customers: Add, view, and delete customer records
4. Track expenses: Record and categorize business expenses
5. Monitor collectors: View collection statistics by collector

### For Collectors
1. Login with collector credentials
2. View personal dashboard with daily stats
3. Record collections: Add new collection entries
4. Track daily progress: View amount collected and collection count

## Database Schema

### Key Tables
- **users**: User accounts with roles (admin/collector)
- **customers**: Customer information with loan details
- **loan_types**: Types of loans offered
- **collection_entries**: Daily collection records by collectors
- **expenses**: Expense tracking with categories
- **performance_metrics**: Analytics data for collectors

## Security Features
- Password hashing using PBKDF2
- HTTP-only session cookies
- Role-based access control
- Protected API routes
- SQL parameter binding to prevent injection

## Troubleshooting

### Database Connection Error
- Verify DATABASE_URL is correctly set
- Ensure PostgreSQL is running
- Check username and password credentials

### Authentication Issues
- Clear browser cookies
- Verify user role in database
- Check .env.local file is properly configured

### Missing Dependencies
- Run `npm install pg` for database driver
- Ensure all dependencies in package.json are installed

## Deployment

### Production Checklist
1. Set secure DATABASE_URL with production credentials
2. Update NODE_ENV to 'production'
3. Set secure session cookie flags
4. Configure CORS if needed
5. Enable SSL/TLS for database connections
6. Regular database backups

### Deployment to Vercel
1. Push code to GitHub
2. Connect GitHub repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## Future Enhancements
- Email notifications for collections
- SMS reminders for customers
- Advanced reporting with PDF export
- Multi-language support
- Mobile app integration
- Payment gateway integration
- Automated collection scheduling

## Support
For issues or questions, check the database schema and API documentation in the respective files.
