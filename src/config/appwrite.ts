import { Client, Account, TablesDB, ID, Query, Storage } from 'react-native-appwrite';

export const APPWRITE_ENDPOINT = 'https://syd.cloud.appwrite.io/v1';
export const APPWRITE_PROJECT_ID = "6a2a9df8001ac14f2796"
export const APPWRITE_PROJECT_NAME = "quote-app"
export const DATABASE_ID = '6a2a9e52003d6f85443e';
export const API_KEY = 'standard_c3f8c962ab1eb584c5c6f2c9ae49c643fe5664a5904bd409ca4b6bc37293f1239609f5fe631699578ef6f44b7f7ad220e6bc1d64df91b8078266066f09cd82cb5e8f9f7b4e33014f75c3d2500209d1fadcbf910e098f55f58ddc2fb359bbec72baf12e9950e49c5887e79428b226720fa920349229b3ca7176c0014af589a735';

export const TABLES = {
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

export const COLLECTIONS = TABLES;

// Init Appwrite SDK
export const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);

export { ID, Query };
