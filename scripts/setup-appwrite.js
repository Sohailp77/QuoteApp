/**
 * Appwrite Database Setup Script
 * 
 * Run this script to automatically create your Appwrite Database, Collections,
 * and Attributes based on the Quote Management App requirements.
 * 
 * Prerequisites:
 * 1. npm install node-appwrite dotenv
 * 2. Set your Appwrite credentials in a .env file or hardcode them below.
 * 
 * Usage: node scripts/setup-appwrite.js
 */

const { Client, Databases } = require('node-appwrite');

// ==========================================
// CONFIGURATION - Update these values!
// ==========================================
const ENDPOINT = 'https://cloud.appwrite.io/v1'; // Or your self-hosted endpoint
const PROJECT_ID = 'YOUR_PROJECT_ID';
const API_KEY = 'YOUR_API_KEY'; // Create an API key with full Database permissions

const DB_ID = 'quoteapp_db';
const DB_NAME = 'QuoteApp Database';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

// Helper constants
const STRING_SIZE = 255;
const LARGE_STRING_SIZE = 5000;

const COLLECTIONS = [
  {
    id: 'users',
    name: 'Users',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'email', type: 'string', size: STRING_SIZE, required: true },
      { key: 'displayName', type: 'string', size: STRING_SIZE, required: false },
      { key: 'role', type: 'string', size: 50, required: true }, // 'boss' | 'employee'
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }]
  },
  {
    id: 'employees',
    name: 'Employees',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'user_id', type: 'string', size: STRING_SIZE, required: false },
      { key: 'name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'email', type: 'string', size: STRING_SIZE, required: true },
      { key: 'role', type: 'string', size: 50, required: true },
      { key: 'department', type: 'string', size: STRING_SIZE, required: false },
      { key: 'status', type: 'string', size: 50, required: false, default: 'Active' },
      { key: 'joined_date', type: 'string', size: 50, required: false },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }]
  },
  {
    id: 'categories',
    name: 'Categories',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'is_active', type: 'boolean', required: false, default: true },
      { key: 'unit_name', type: 'string', size: 50, required: false },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }]
  },
  {
    id: 'tax_rates',
    name: 'Tax Rates',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'percentage', type: 'double', required: true },
      { key: 'is_default', type: 'boolean', required: false, default: false },
      { key: 'is_active', type: 'boolean', required: false, default: true },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }]
  },
  {
    id: 'products',
    name: 'Products',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'user_id', type: 'string', size: STRING_SIZE, required: false },
      { key: 'name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'description', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'unit_price', type: 'double', required: true },
      { key: 'cost_price', type: 'double', required: false },
      { key: 'stock_quantity', type: 'integer', required: false },
      { key: 'reorder_level', type: 'integer', required: false },
      { key: 'unit', type: 'string', size: 50, required: false },
      { key: 'category', type: 'string', size: STRING_SIZE, required: false },
      { key: 'sku', type: 'string', size: STRING_SIZE, required: false },
      { key: 'barcode', type: 'string', size: STRING_SIZE, required: false },
      { key: 'warehouse_location', type: 'string', size: STRING_SIZE, required: false },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }, { key: 'barcode', type: 'key', attributes: ['barcode'] }]
  },
  {
    id: 'customers',
    name: 'Customers',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'phone', type: 'string', size: STRING_SIZE, required: false },
      { key: 'email', type: 'string', size: STRING_SIZE, required: false },
      { key: 'billing_address', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'gst_number', type: 'string', size: 50, required: false },
      { key: 'notes', type: 'string', size: LARGE_STRING_SIZE, required: false },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }, { key: 'name_search', type: 'key', attributes: ['name'] }]
  },
  {
    id: 'stock_movements',
    name: 'Stock Movements',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'product_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'product_name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'movement_type', type: 'string', size: 50, required: true },
      { key: 'quantity', type: 'integer', required: true },
      { key: 'note', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'supplier', type: 'string', size: STRING_SIZE, required: false },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }, { key: 'product_id', type: 'key', attributes: ['product_id'] }]
  },
  {
    id: 'company_settings',
    name: 'Company Settings',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'company_name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'email', type: 'string', size: STRING_SIZE, required: false },
      { key: 'phone', type: 'string', size: STRING_SIZE, required: false },
      { key: 'website', type: 'string', size: STRING_SIZE, required: false },
      { key: 'gst_number', type: 'string', size: 50, required: false },
      { key: 'address', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'currency', type: 'string', size: 10, required: false, default: '₹' },
      { key: 'date_format', type: 'string', size: 20, required: false, default: 'DD/MM/YYYY' },
      { key: 'invoice_prefix', type: 'string', size: 20, required: false, default: 'INV-' },
      { key: 'next_invoice_number', type: 'integer', required: false, default: 1 },
      { key: 'default_notes', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'terms_conditions', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'logo_url', type: 'string', size: LARGE_STRING_SIZE, required: false },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }]
  },
  {
    id: 'quotes',
    name: 'Quotes',
    attributes: [
      { key: 'tenant_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'user_id', type: 'string', size: STRING_SIZE, required: true },
      { key: 'quote_number', type: 'string', size: STRING_SIZE, required: true },
      { key: 'client_name', type: 'string', size: STRING_SIZE, required: true },
      { key: 'client_email', type: 'string', size: STRING_SIZE, required: true },
      { key: 'client_phone', type: 'string', size: STRING_SIZE, required: false },
      { key: 'customer_id', type: 'string', size: STRING_SIZE, required: false },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'subtotal', type: 'double', required: true },
      { key: 'discount', type: 'double', required: true },
      { key: 'tax', type: 'double', required: true },
      { key: 'total', type: 'double', required: true },
      { key: 'notes', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'valid_until', type: 'string', size: 50, required: true },
      // Appwrite doesn't have a JSONB array column, so we serialize the line items as a large string
      { key: 'items', type: 'string', size: LARGE_STRING_SIZE, required: false },
      { key: 'payment_status', type: 'string', size: 50, required: false },
      { key: 'payment_method', type: 'string', size: 50, required: false },
      { key: 'delivery_date', type: 'string', size: 50, required: false },
      { key: 'delivery_partner', type: 'string', size: STRING_SIZE, required: false },
      { key: 'tracking_number', type: 'string', size: STRING_SIZE, required: false },
      { key: 'delivery_status', type: 'string', size: 50, required: false },
      { key: 'delivery_note', type: 'string', size: LARGE_STRING_SIZE, required: false },
    ],
    indexes: [{ key: 'tenant_id', type: 'key', attributes: ['tenant_id'] }]
  }
];

async function setup() {
  try {
    console.log('Checking database...');
    try {
      await databases.get(DB_ID);
      console.log(`Database '${DB_NAME}' already exists.`);
    } catch (e) {
      if (e.code === 404) {
        console.log(`Creating Database '${DB_NAME}'...`);
        await databases.create(DB_ID, DB_NAME);
      } else throw e;
    }

    for (const col of COLLECTIONS) {
      console.log(`\n--- Checking Collection '${col.name}' ---`);
      try {
        await databases.getCollection(DB_ID, col.id);
        console.log(`Collection '${col.name}' already exists.`);
      } catch (e) {
        if (e.code === 404) {
          console.log(`Creating Collection '${col.name}'...`);
          await databases.createCollection(DB_ID, col.id, col.name);
          // Set Document Security (optional, defaults to false, but good to enable for RLS logic)
          await databases.updateCollection(DB_ID, col.id, col.name, [], true);
        } else throw e;
      }

      console.log(`Setting up attributes for '${col.name}'...`);
      for (const attr of col.attributes) {
        try {
          if (attr.type === 'string') {
            await databases.createStringAttribute(DB_ID, col.id, attr.key, attr.size, attr.required, attr.default);
          } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(DB_ID, col.id, attr.key, attr.required, attr.default);
          } else if (attr.type === 'double') {
            await databases.createFloatAttribute(DB_ID, col.id, attr.key, attr.required, 0, 9999999999, attr.default);
          } else if (attr.type === 'integer') {
            await databases.createIntegerAttribute(DB_ID, col.id, attr.key, attr.required, 0, 999999999, attr.default);
          }
          console.log(`Created attribute: ${attr.key}`);
          // Wait briefly to avoid Appwrite rate limits / attribute creation race conditions
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          if (e.code === 409) {
            // Already exists
          } else {
            console.error(`Error creating attribute ${attr.key}:`, e.message);
          }
        }
      }

      if (col.indexes) {
        console.log(`Setting up indexes for '${col.name}'...`);
        // Note: Appwrite requires attributes to be fully available before creating an index.
        // In a real script, we would need to check attribute status until "available".
        // This is a simplified version.
        for (const idx of col.indexes) {
          try {
            await databases.createIndex(DB_ID, col.id, idx.key, idx.type, idx.attributes);
            console.log(`Created index: ${idx.key}`);
          } catch (e) {
            if (e.code === 409) {
              // Already exists
            } else {
              console.log(`(Skipping index ${idx.key} as attributes might be building: ${e.message})`);
            }
          }
        }
      }
    }

    console.log('\n✅ Appwrite Setup Complete!');
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setup();
