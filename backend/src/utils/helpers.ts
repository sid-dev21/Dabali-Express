/* Helper functions for various utilities */

import { SubscriptionType } from '../types';

/* Function to calculate the end date of a subscription based on its type */

export const calculateEndDate = (
  startDate: Date,
  type: SubscriptionType
): Date => {
  const endDate = new Date(startDate);

  switch (type) {
    case SubscriptionType.MONTHLY:
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case SubscriptionType.TRIMESTER:
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case SubscriptionType.ANNUAL:
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  return endDate;
};

// Format money in XOF

export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-BF', {
    style: 'currency',
    currency: 'XOF',
  }).format(amount);
};

// Generate a random reference string for payments

export const generatePaymentReference = (method: string): string => {
  const prefix = method === 'ORANGE_MONEY' ? 'OM' : 
                 method === 'MOOV_MONEY' ? 'MM' : 'CASH';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${date}${random}`;
};

// Calculate pagination offsets

export const calculatePagination = (
  page: number = 1,
  limit: number = 10,
  total: number
) => {
  const offset = (page - 1) * limit;
  const pages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    pages,
    offset,
  };
};

// Format date to YYYY-MM-DD 

export const formatDateForDB = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Check if two dates are in the future 

export const isFutureDate = (date: Date): boolean => {
  return date > new Date();
};

// Check if date is in the past

export const isPastDate = (date: Date): boolean => {
  return date < new Date();
};




