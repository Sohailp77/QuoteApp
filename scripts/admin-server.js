/**
 * Quote App - Admin Panel Local Server
 *
 * Provides REST API and static web dashboard for administrative management:
 * - Business / Tenant activation & deactivation
 * - Owner password reset
 * - Full database backup & restore (JSON snapshots)
 * - Data explorer & master control over all Appwrite collections
 *
 * Usage: npm run admin  (or node scripts/admin-server.js)
 * Access UI: http://localhost:4000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Client, Databases, Users, Query, ID } = require('node-appwrite');

// ==========================================
// Appwrite Server Config
// ==========================================
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a2a9df8001ac14f2796';
const API_KEY = process.env.APPWRITE_API_KEY || 'standard_c3f8c962ab1eb584c5c6f2c9ae49c643fe5664a5904bd409ca4b6bc37293f1239609f5fe631699578ef6f44b7f7ad220e6bc1d64df91b8078266066f09cd82cb5e8f9f7b4e33014f75c3d2500209d1fadcbf910e098f55f58ddc2fb359bbec72baf12e9950e49c5887e79428b226720fa920349229b3ca7176c0014af589a735';
const DB_ID = '6a2a9e52003d6f85443e';

const PORT = process.env.PORT || 4000;
const PUBLIC_DIR = path.join(__dirname, '../admin-panel/public');

// Initialize Appwrite Admin SDK
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const usersService = new Users(client);

const COLLECTIONS = [
  'users',
  'company_settings',
  'employees',
  'categories',
  'tax_rates',
  'products',
  'customers',
  'stock_movements',
  'quotes',
  'vendors',
  'direct_sales'
];

// Helper to parse JSON request body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

// Helper to send JSON responses
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Helper for static file serving
function serveStaticFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA if not found
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Main HTTP request handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  try {
    // API Routes
    if (pathname === '/api/stats' && method === 'GET') {
      // System Overview Metrics
      const authUsers = await usersService.list();
      const companyDocs = await databases.listDocuments(DB_ID, 'company_settings', [Query.limit(100)]);
      const productsDocs = await databases.listDocuments(DB_ID, 'products', [Query.limit(500)]);
      const quotesDocs = await databases.listDocuments(DB_ID, 'quotes', [Query.limit(500)]);
      const salesDocs = await databases.listDocuments(DB_ID, 'direct_sales', [Query.limit(500)]);

      const activeUsers = authUsers.users.filter(u => u.status === true).length;
      const disabledUsers = authUsers.users.filter(u => u.status === false).length;

      let totalQuoteVal = 0;
      quotesDocs.documents.forEach(q => {
        totalQuoteVal += Number(q.total || 0);
      });

      let totalSalesVal = 0;
      salesDocs.documents.forEach(s => {
        totalSalesVal += Number(s.total || 0);
      });

      return sendJSON(res, {
        totalUsers: authUsers.total,
        activeUsers,
        disabledUsers,
        totalBusinesses: companyDocs.total,
        totalProducts: productsDocs.total,
        totalQuotes: quotesDocs.total,
        totalQuotesValue: Math.round(totalQuoteVal * 100) / 100,
        totalDirectSales: salesDocs.total,
        totalSalesRevenue: Math.round(totalSalesVal * 100) / 100,
        totalRevenue: Math.round((totalQuoteVal + totalSalesVal) * 100) / 100
      });
    }

    if (pathname === '/api/businesses' && method === 'GET') {
      // List all business accounts with details
      const authUsers = await usersService.list();
      const dbUsers = await databases.listDocuments(DB_ID, 'users', [Query.limit(500)]);
      const companySettings = await databases.listDocuments(DB_ID, 'company_settings', [Query.limit(500)]);
      const employees = await databases.listDocuments(DB_ID, 'employees', [Query.limit(500)]);
      const quotes = await databases.listDocuments(DB_ID, 'quotes', [Query.limit(500)]);
      const products = await databases.listDocuments(DB_ID, 'products', [Query.limit(500)]);

      // Map company settings by tenant_id
      const settingsMap = {};
      companySettings.documents.forEach(s => {
        settingsMap[s.tenant_id] = s;
      });

      // Map DB users by tenant_id or user id
      const dbUserMap = {};
      dbUsers.documents.forEach(u => {
        dbUserMap[u.id || u.$id] = u;
      });

      // Build business list
      const businesses = authUsers.users.map(authUser => {
        const dbUser = dbUserMap[authUser.$id] || {};
        const tenantId = dbUser.tenant_id || authUser.$id;
        const company = settingsMap[tenantId] || settingsMap[authUser.$id] || {};

        const tenantEmployees = employees.documents.filter(e => e.tenant_id === tenantId).length;
        const tenantProducts = products.documents.filter(p => p.tenant_id === tenantId).length;
        const tenantQuotes = quotes.documents.filter(q => q.tenant_id === tenantId);
        const quoteCount = tenantQuotes.length;

        let tenantRevenue = 0;
        tenantQuotes.forEach(q => { tenantRevenue += Number(q.total || 0); });

        return {
          id: authUser.$id,
          tenant_id: tenantId,
          email: authUser.email,
          displayName: authUser.name || dbUser.displayName || 'Unnamed Business',
          status: authUser.status, // true = active, false = deactivated
          emailVerification: authUser.emailVerification,
          role: dbUser.role || 'boss',
          registrationDate: authUser.$createdAt,
          lastSignIn: authUser.accessedAt,
          company: {
            name: company.company_name || 'Not Set',
            phone: company.phone || '',
            email: company.email || authUser.email,
            address: company.address || '',
            gst_number: company.gst_number || '',
            bank_name: company.bank_name || ''
          },
          stats: {
            employees: tenantEmployees,
            products: tenantProducts,
            quotes: quoteCount,
            revenue: Math.round(tenantRevenue * 100) / 100
          }
        };
      });

      return sendJSON(res, { businesses });
    }

    if (pathname.match(/^\/api\/businesses\/([^/]+)\/status$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/businesses\/([^/]+)\/status$/);
      const userId = match[1];
      const body = await parseJsonBody(req);
      const newStatus = Boolean(body.status);

      // Update Appwrite Auth user status (true = active, false = disabled)
      const updatedUser = await usersService.updateStatus(userId, newStatus);

      return sendJSON(res, {
        success: true,
        userId: updatedUser.$id,
        status: updatedUser.status,
        message: `Business account status successfully updated to ${newStatus ? 'ACTIVE' : 'DEACTIVATED'}.`
      });
    }

    if (pathname.match(/^\/api\/businesses\/([^/]+)\/reset-password$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/businesses\/([^/]+)\/reset-password$/);
      const userId = match[1];
      const body = await parseJsonBody(req);

      if (!body.password || body.password.length < 6) {
        return sendJSON(res, { error: 'Password must be at least 6 characters long.' }, 400);
      }

      // Update password using Appwrite Admin Users service
      await usersService.updatePassword(userId, body.password);

      return sendJSON(res, {
        success: true,
        userId,
        message: 'Password successfully updated for user.'
      });
    }

    if (pathname.match(/^\/api\/businesses\/([^/]+)$/) && method === 'DELETE') {
      const match = pathname.match(/^\/api\/businesses\/([^/]+)$/);
      const userId = match[1];

      // Find tenant_id for this user
      let tenantId = userId;
      try {
        const dbUsers = await databases.listDocuments(DB_ID, 'users', [Query.limit(100)]);
        const userDoc = dbUsers.documents.find(u => u.id === userId || u.$id === userId);
        if (userDoc && userDoc.tenant_id) {
          tenantId = userDoc.tenant_id;
        }
      } catch (e) {}

      const deletionSummary = {};
      let totalDocsDeleted = 0;

      // Delete all tenant documents across all 11 collections
      for (const colId of COLLECTIONS) {
        deletionSummary[colId] = 0;
        try {
          const docs = await databases.listDocuments(DB_ID, colId, [Query.limit(5000)]);
          const tenantDocs = docs.documents.filter(doc =>
            doc.tenant_id === tenantId || doc.id === userId || doc.$id === userId || doc.$id === tenantId
          );

          for (const doc of tenantDocs) {
            try {
              await databases.deleteDocument(DB_ID, colId, doc.$id);
              deletionSummary[colId]++;
              totalDocsDeleted++;
            } catch (err) {
              console.warn(`[Delete Warning] Failed to delete doc ${doc.$id} in ${colId}:`, err.message);
            }
          }
        } catch (colErr) {
          console.warn(`[Delete Warning] Failed listing ${colId}:`, colErr.message);
        }
      }

      // Delete user from Appwrite Auth
      try {
        await usersService.delete(userId);
      } catch (authErr) {
        console.warn(`[Delete Warning] Auth user delete failed:`, authErr.message);
      }

      return sendJSON(res, {
        success: true,
        userId,
        tenantId,
        totalDocsDeleted,
        details: deletionSummary,
        message: `Business tenant '${tenantId}' and ${totalDocsDeleted} database documents deleted permanently.`
      });
    }

    if (pathname === '/api/backup' && method === 'GET') {
      const tenantId = parsedUrl.query.tenant_id || null;

      const backupData = {
        meta: {
          app: 'QuoteApp Admin',
          exportTimestamp: new Date().toISOString(),
          tenant_id: tenantId || 'ALL_TENANTS',
          version: '1.0'
        },
        collections: {}
      };

      for (const colId of COLLECTIONS) {
        try {
          const docs = await databases.listDocuments(DB_ID, colId, [Query.limit(5000)]);
          let items = docs.documents;

          // If single tenant requested, filter by tenant_id if key exists
          if (tenantId) {
            items = items.filter(doc => doc.tenant_id === tenantId || doc.id === tenantId || doc.$id === tenantId);
          }

          // Strip system metadata fields ($databaseId, $permissions, etc.) for clean export
          backupData.collections[colId] = items.map(item => {
            const cleanDoc = { ...item };
            delete cleanDoc.$databaseId;
            delete cleanDoc.$collectionId;
            delete cleanDoc.$permissions;
            return cleanDoc;
          });
        } catch (colErr) {
          console.warn(`[Backup Warning] Could not export collection ${colId}:`, colErr.message);
          backupData.collections[colId] = [];
        }
      }

      return sendJSON(res, backupData);
    }

    if (pathname === '/api/restore' && method === 'POST') {
      const body = await parseJsonBody(req);

      if (!body.collections || typeof body.collections !== 'object') {
        return sendJSON(res, { error: 'Invalid backup file format. "collections" object required.' }, 400);
      }

      const results = {};
      let totalRestored = 0;

      for (const [colId, docs] of Object.entries(body.collections)) {
        if (!COLLECTIONS.includes(colId) || !Array.isArray(docs)) continue;

        results[colId] = { successCount: 0, errorCount: 0 };

        for (const doc of docs) {
          const docId = doc.$id || doc.id || ID.unique();
          const cleanDoc = { ...doc };

          // Remove Appwrite system fields before creation
          delete cleanDoc.$id;
          delete cleanDoc.$createdAt;
          delete cleanDoc.$updatedAt;
          delete cleanDoc.$databaseId;
          delete cleanDoc.$collectionId;
          delete cleanDoc.$permissions;

          try {
            // Try updating document first, or create if not present
            try {
              await databases.updateDocument(DB_ID, colId, docId, cleanDoc);
              results[colId].successCount++;
            } catch (updateErr) {
              await databases.createDocument(DB_ID, colId, docId, cleanDoc);
              results[colId].successCount++;
            }
            totalRestored++;
          } catch (err) {
            results[colId].errorCount++;
            console.error(`[Restore Error] ${colId}/${docId}:`, err.message);
          }
        }
      }

      return sendJSON(res, {
        success: true,
        totalRestored,
        details: results,
        message: `Restoration completed. ${totalRestored} documents imported/updated successfully.`
      });
    }

    if (pathname.match(/^\/api\/collections\/([^/]+)\/documents$/) && method === 'GET') {
      const match = pathname.match(/^\/api\/collections\/([^/]+)\/documents$/);
      const colId = match[1];

      if (!COLLECTIONS.includes(colId)) {
        return sendJSON(res, { error: `Collection '${colId}' not recognized.` }, 400);
      }

      const tenantId = parsedUrl.query.tenant_id;
      const queries = [Query.limit(500)];

      if (tenantId) {
        queries.push(Query.equal('tenant_id', tenantId));
      }

      const docs = await databases.listDocuments(DB_ID, colId, queries);
      return sendJSON(res, { collection: colId, total: docs.total, documents: docs.documents });
    }

    if (pathname.match(/^\/api\/collections\/([^/]+)\/documents$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/collections\/([^/]+)\/documents$/);
      const colId = match[1];
      const body = await parseJsonBody(req);

      if (!COLLECTIONS.includes(colId)) {
        return sendJSON(res, { error: `Collection '${colId}' not recognized.` }, 400);
      }

      const docId = body.documentId || body.$id || ID.unique();
      const data = body.data || body;

      delete data.documentId;
      delete data.$id;
      delete data.$createdAt;
      delete data.$updatedAt;
      delete data.$databaseId;
      delete data.$collectionId;
      delete data.$permissions;

      let resultDoc;
      try {
        resultDoc = await databases.updateDocument(DB_ID, colId, docId, data);
      } catch {
        resultDoc = await databases.createDocument(DB_ID, colId, docId, data);
      }

      return sendJSON(res, { success: true, document: resultDoc });
    }

    if (pathname.match(/^\/api\/collections\/([^/]+)\/documents\/([^/]+)$/) && method === 'DELETE') {
      const match = pathname.match(/^\/api\/collections\/([^/]+)\/documents\/([^/]+)$/);
      const colId = match[1];
      const docId = match[2];

      await databases.deleteDocument(DB_ID, colId, docId);
      return sendJSON(res, { success: true, collection: colId, documentId: docId });
    }

    // Static Web UI Serving
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html';
    }

    const targetFilePath = path.join(PUBLIC_DIR, safePath);

    // Verify path stays within PUBLIC_DIR
    if (targetFilePath.startsWith(PUBLIC_DIR)) {
      return serveStaticFile(req, res, targetFilePath);
    } else {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

  } catch (err) {
    console.error('[Admin Server Error]:', err);
    return sendJSON(res, { error: err.message || 'Internal Server Error' }, 500);
  }
});

const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('====================================================');
  console.log(`⚡ QuoteApp Admin Panel running at: http://localhost:${PORT}`);
  console.log(`📦 Appwrite Backend Endpoint: ${ENDPOINT}`);
  console.log(`🗄️ Database ID: ${DB_ID}`);
  console.log('====================================================');
});
