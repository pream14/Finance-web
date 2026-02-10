-- Users table with role-based access
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'collector')),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan types table
CREATE TABLE loan_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  loan_type_id INT NOT NULL REFERENCES loan_types(id),
  principal_amount DECIMAL(15, 2) NOT NULL,
  interest_rate DECIMAL(5, 2),
  start_date DATE,
  maturity_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'defaulted', 'suspended')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection entries table (daily collector activity)
CREATE TABLE collection_entries (
  id SERIAL PRIMARY KEY,
  collector_id INT NOT NULL REFERENCES users(id),
  customer_id INT NOT NULL REFERENCES customers(id),
  collection_date DATE NOT NULL,
  amount_collected DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'check', 'transfer', 'other')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table (admin expense tracking)
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category VARCHAR(100),
  date DATE NOT NULL,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table (for analytics)
CREATE TABLE performance_metrics (
  id SERIAL PRIMARY KEY,
  collector_id INT NOT NULL REFERENCES users(id),
  metric_date DATE NOT NULL,
  collections_count INT DEFAULT 0,
  total_collected DECIMAL(15, 2) DEFAULT 0,
  target_amount DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collector_id, metric_date)
);

-- Create indexes for common queries
CREATE INDEX idx_customers_loan_type ON customers(loan_type_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_collection_entries_collector ON collection_entries(collector_id);
CREATE INDEX idx_collection_entries_customer ON collection_entries(customer_id);
CREATE INDEX idx_collection_entries_date ON collection_entries(collection_date);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_performance_metrics_date ON performance_metrics(metric_date);
