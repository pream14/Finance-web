'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Customer {
  id: number;
  name: string;
}

export default function CollectionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    collectionDate: new Date().toISOString().split('T')[0],
    amountCollected: '',
    paymentMethod: 'cash',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers?status=active');
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomers();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: parseInt(formData.customerId),
          collectionDate: formData.collectionDate,
          amountCollected: parseFloat(formData.amountCollected),
          paymentMethod: formData.paymentMethod,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save collection');
      }

      setSuccess('Collection recorded successfully!');
      setFormData({
        customerId: '',
        collectionDate: new Date().toISOString().split('T')[0],
        amountCollected: '',
        paymentMethod: 'cash',
        notes: '',
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save collection');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading customers...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Collection</CardTitle>
        <CardDescription>Add a new collection entry for a customer</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="customerId" className="text-sm font-medium">
              Customer
            </label>
            <select
              id="customerId"
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
              disabled={isSubmitting}
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="collectionDate" className="text-sm font-medium">
                Collection Date
              </label>
              <Input
                id="collectionDate"
                name="collectionDate"
                type="date"
                value={formData.collectionDate}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="amountCollected" className="text-sm font-medium">
                Amount Collected
              </label>
              <Input
                id="amountCollected"
                name="amountCollected"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amountCollected}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="paymentMethod" className="text-sm font-medium">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={isSubmitting}
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Add any notes about this collection..."
              value={formData.notes}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : 'Record Collection'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
