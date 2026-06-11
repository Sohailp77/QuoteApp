import { Client, Account, Databases, ID, Query } from 'react-native-appwrite';

// Replace these with your actual Appwrite project details
export const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1'; // e.g. 'http://localhost/v1' for self-hosted
export const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID'; // e.g. '64f...'
export const DATABASE_ID = 'quoteapp_db'; // We will use this string ID for the DB

// Collection IDs
export const COLLECTIONS = {
  USERS: 'users',
  EMPLOYEES: 'employees',
  CATEGORIES: 'categories',
  TAX_RATES: 'tax_rates',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  STOCK_MOVEMENTS: 'stock_movements',
  COMPANY_SETTINGS: 'company_settings',
  QUOTES: 'quotes',
};

// Init Appwrite SDK
const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query };
