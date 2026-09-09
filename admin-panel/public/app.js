/**
 * QuoteApp Master Admin Control Center - Client Application
 */

const API_BASE = ''; // Relative to origin

// Application State
const state = {
  stats: null,
  businesses: [],
  filteredBusinesses: [],
  selectedBusinessForReset: null,
  currentExplorerCollection: 'users',
  currentExplorerTenant: '',
  explorerDocuments: [],
  pendingRestoreData: null
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigationTabs();
  setupEventHandlers();
  loadDashboardData();
});

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navigation Tabs Setup
function setupNavigationTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTabId).classList.add('active');

      if (targetTabId === 'tab-data-explorer') {
        loadExplorerDocuments();
      }
    });
  });
}

// Global Event Handlers
function setupEventHandlers() {
  // Refresh stats
  document.getElementById('btn-refresh-stats').addEventListener('click', loadDashboardData);
  document.getElementById('btn-quick-backup').addEventListener('click', () => downloadBackup('ALL'));

  // Businesses Filter & Search
  document.getElementById('search-businesses').addEventListener('input', applyBusinessFilters);
  document.getElementById('filter-business-status').addEventListener('change', applyBusinessFilters);

  // Backup & Restore
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const scope = document.getElementById('backup-scope-select').value;
    downloadBackup(scope);
  });

  // Drag & Drop Restore
  const dropZone = document.getElementById('restore-drop-zone');
  const fileInput = document.getElementById('restore-file-input');

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => handleRestoreFileSelect(e.target.files[0]));

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      handleRestoreFileSelect(e.dataTransfer.files[0]);
    }
  });

  document.getElementById('btn-cancel-restore').addEventListener('click', resetRestorePreview);
  document.getElementById('btn-confirm-restore').addEventListener('click', executeRestore);

  // Password Reset Modal
  document.getElementById('btn-generate-password').addEventListener('click', generateRandomPassword);
  document.getElementById('btn-save-password').addEventListener('click', saveNewPassword);

  // Modal Closers
  document.querySelectorAll('.modal-close-btn, [data-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.getAttribute('data-modal');
      if (modalId && e.target === btn) {
        document.getElementById(modalId).classList.add('hidden');
      }
    });
  });

  // Data Explorer Controls
  document.getElementById('explorer-collection-select').addEventListener('change', (e) => {
    state.currentExplorerCollection = e.target.value;
    loadExplorerDocuments();
  });

  document.getElementById('explorer-tenant-select').addEventListener('change', (e) => {
    state.currentExplorerTenant = e.target.value;
    loadExplorerDocuments();
  });

  document.getElementById('btn-explorer-fetch').addEventListener('click', loadExplorerDocuments);
  document.getElementById('btn-explorer-new-doc').addEventListener('click', openNewDocumentEditor);
  document.getElementById('btn-save-doc-json').addEventListener('click', saveDocumentEditorJson);
}

// Fetch & Load Dashboard Data
async function loadDashboardData() {
  try {
    const [statsRes, bizRes] = await Promise.all([
      fetch(`${API_BASE}/api/stats`),
      fetch(`${API_BASE}/api/businesses`)
    ]);

    const stats = await statsRes.json();
    const bizData = await bizRes.json();

    state.stats = stats;
    state.businesses = bizData.businesses || [];

    renderMetrics(stats);
    renderBusinesses(state.businesses);
    populateTenantSelectors(state.businesses);

  } catch (err) {
    console.error('Failed to fetch admin metrics:', err);
    showToast('Could not connect to Admin Server API', 'error');
  }
}

// Render Header Metrics Cards
function renderMetrics(stats) {
  document.getElementById('stat-total-businesses').textContent = stats.totalBusinesses || 0;
  document.getElementById('stat-active-deactive-summary').textContent = `${stats.activeUsers || 0} Active / ${stats.disabledUsers || 0} Disabled`;
  document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
  document.getElementById('stat-total-revenue').textContent = `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`;
  document.getElementById('stat-quote-sales-breakdown').textContent = `Quotes: ₹${(stats.totalQuotesValue || 0).toLocaleString('en-IN')} | Sales: ₹${(stats.totalSalesRevenue || 0).toLocaleString('en-IN')}`;
  document.getElementById('stat-total-items').textContent = `${stats.totalProducts || 0} / ${stats.totalQuotes || 0}`;
}

// Populate Tenant Dropdowns across Backup/Explorer UI
function populateTenantSelectors(businesses) {
  const backupScopeSelect = document.getElementById('backup-scope-select');
  const explorerTenantSelect = document.getElementById('explorer-tenant-select');

  // Keep defaults
  backupScopeSelect.innerHTML = '<option value="ALL">Full System (All 11 Database Collections)</option>';
  explorerTenantSelect.innerHTML = '<option value="">All Tenants</option>';

  businesses.forEach(b => {
    const label = `${b.company.name || b.displayName} (${b.email})`;

    const opt1 = document.createElement('option');
    opt1.value = b.tenant_id;
    opt1.textContent = `Tenant: ${label}`;
    backupScopeSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = b.tenant_id;
    opt2.textContent = label;
    explorerTenantSelect.appendChild(opt2);
  });
}

// Filter and Render Businesses
function applyBusinessFilters() {
  const query = document.getElementById('search-businesses').value.toLowerCase().trim();
  const statusFilter = document.getElementById('filter-business-status').value;

  state.filteredBusinesses = state.businesses.filter(b => {
    const matchesQuery = !query ||
      b.displayName.toLowerCase().includes(query) ||
      b.email.toLowerCase().includes(query) ||
      b.tenant_id.toLowerCase().includes(query) ||
      (b.company && b.company.name && b.company.name.toLowerCase().includes(query));

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = b.status === true;
    if (statusFilter === 'disabled') matchesStatus = b.status === false;

    return matchesQuery && matchesStatus;
  });

  renderBusinesses(state.filteredBusinesses);
}

function renderBusinesses(businesses) {
  const container = document.getElementById('businesses-list');

  if (!businesses || businesses.length === 0) {
    container.innerHTML = `
      <div class="loading-spinner-container">
        <i class="ri-store-3-line" style="font-size: 40px; color: var(--text-dim);"></i>
        <p class="mt-3">No businesses found matching criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = businesses.map(b => {
    const isActive = b.status === true;
    const formattedDate = new Date(b.registrationDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    return `
      <div class="biz-card ${isActive ? '' : 'disabled'}">
        <div class="biz-card-header">
          <div class="biz-title-area">
            <h3>${escapeHtml(b.company.name !== 'Not Set' ? b.company.name : b.displayName)}</h3>
            <p><i class="ri-mail-line"></i> ${escapeHtml(b.email)}</p>
          </div>
          <span class="badge ${isActive ? 'badge-active' : 'badge-disabled'}">
            ${isActive ? 'Active' : 'Disabled'}
          </span>
        </div>

        <div class="biz-meta-list">
          <div class="biz-meta-item">
            <span>Tenant ID</span>
            <strong style="font-family: var(--font-mono); font-size: 11px;">${b.tenant_id}</strong>
          </div>
          <div class="biz-meta-item">
            <span>Registered</span>
            <strong>${formattedDate}</strong>
          </div>
          <div class="biz-meta-item">
            <span>Catalog Products</span>
            <strong>${b.stats.products} Products</strong>
          </div>
          <div class="biz-meta-item">
            <span>Quotes Issued</span>
            <strong>${b.stats.quotes} Quotes (₹${b.stats.revenue.toLocaleString('en-IN')})</strong>
          </div>
        </div>

        <div class="biz-card-actions">
          <button class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'}" onclick="toggleBusinessStatus('${b.id}', ${!isActive})">
            <i class="${isActive ? 'ri-user-unfollow-line' : 'ri-user-follow-line'}"></i>
            ${isActive ? 'Deactivate Business' : 'Activate Business'}
          </button>

          <button class="btn btn-secondary btn-sm" onclick="openResetPasswordModal('${b.id}', '${escapeHtml(b.email)}')">
            <i class="ri-key-2-line"></i> Reset Password
          </button>

          <button class="btn btn-secondary btn-sm" onclick="downloadBackup('${b.tenant_id}')" title="Export this business database">
            <i class="ri-download-line"></i> Export DB
          </button>

          <button class="btn btn-danger btn-sm" onclick="deleteBusinessAccount('${b.id}', '${escapeHtml(b.email)}')" title="Permanently delete business and database records">
            <i class="ri-delete-bin-2-line"></i> Delete & Purge DB
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Business Account Status Toggle (Activate / Deactivate)
async function toggleBusinessStatus(userId, newStatus) {
  const actionText = newStatus ? 'Activate' : 'Deactivate';
  if (!confirm(`Are you sure you want to ${actionText.toUpperCase()} this business account?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/businesses/${userId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message || `Account ${actionText}d successfully`);
      loadDashboardData();
    } else {
      showToast(data.error || 'Failed to update status', 'error');
    }
  } catch (err) {
    showToast('Server error updating status', 'error');
  }
}

// Delete Business & Purge All Database Records
async function deleteBusinessAccount(userId, email) {
  const confirmText = prompt(`🔴 CRITICAL ACTION: Are you sure you want to PERMANENTLY DELETE business '${email}'?\n\nThis will wipe out the user account AND all associated database records (products, quotes, employees, settings, sales).\n\nType "${email}" to confirm deletion:`);

  if (!confirmText || confirmText.trim().toLowerCase() !== email.toLowerCase()) {
    showToast('Deletion canceled. Email confirmation did not match.', 'error');
    return;
  }

  try {
    showToast(`Deleting business '${email}' and purging database...`);
    const res = await fetch(`${API_BASE}/api/businesses/${userId}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Business and database records purged successfully!');
      loadDashboardData();
    } else {
      showToast(data.error || 'Failed to delete business', 'error');
    }
  } catch (err) {
    showToast('Server error during business deletion', 'error');
  }
}

// Password Reset Modal Handlers
function openResetPasswordModal(userId, email) {
  state.selectedBusinessForReset = userId;
  document.getElementById('reset-target-email').textContent = email;
  document.getElementById('input-new-password').value = '';
  document.getElementById('modal-password-reset').classList.remove('hidden');
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('input-new-password').value = pwd;
}

async function saveNewPassword() {
  const userId = state.selectedBusinessForReset;
  const newPassword = document.getElementById('input-new-password').value.trim();

  if (!newPassword || newPassword.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/businesses/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Password updated successfully! Password copied to memory preview.');
      document.getElementById('modal-password-reset').classList.add('hidden');
    } else {
      showToast(data.error || 'Failed to reset password', 'error');
    }
  } catch (err) {
    showToast('Server error resetting password', 'error');
  }
}

// Database Backup & JSON Download
async function downloadBackup(scope = 'ALL') {
  try {
    showToast('Generating database backup payload...');
    const url = scope === 'ALL' ? `${API_BASE}/api/backup` : `${API_BASE}/api/backup?tenant_id=${scope}`;
    const res = await fetch(url);
    const data = await res.json();

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);

    const filename = `QuoteApp_Backup_${scope}_${new Date().toISOString().split('T')[0]}.json`;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    showToast(`Backup successfully downloaded (${filename})`);
  } catch (err) {
    showToast('Failed to download database backup', 'error');
  }
}

// Restore Handler
function handleRestoreFileSelect(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.collections || typeof parsed.collections !== 'object') {
        showToast('Invalid backup file format.', 'error');
        return;
      }

      state.pendingRestoreData = parsed;
      showRestorePreview(parsed);
    } catch (err) {
      showToast('Error parsing JSON backup file.', 'error');
    }
  };
  reader.readAsText(file);
}

function showRestorePreview(data) {
  document.getElementById('restore-preview-container').classList.remove('hidden');
  document.getElementById('preview-timestamp').textContent = data.meta ? data.meta.exportTimestamp : 'Unknown Date';

  const listContainer = document.getElementById('preview-collections-list');
  listContainer.innerHTML = '';

  for (const [col, docs] of Object.entries(data.collections)) {
    const item = document.createElement('div');
    item.style.cssText = 'background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; font-size: 12px; font-family: var(--font-mono); display: flex; justify-content: space-between; margin-bottom: 6px;';
    item.innerHTML = `<span>${col}</span><strong>${docs.length} records</strong>`;
    listContainer.appendChild(item);
  }
}

function resetRestorePreview() {
  state.pendingRestoreData = null;
  document.getElementById('restore-preview-container').classList.add('hidden');
  document.getElementById('restore-file-input').value = '';
}

async function executeRestore() {
  if (!state.pendingRestoreData) return;

  if (!confirm('WARNING: Restoring will write/overwrite records in your database. Continue?')) {
    return;
  }

  try {
    showToast('Restoring database snapshot...');
    const res = await fetch(`${API_BASE}/api/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.pendingRestoreData)
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Restoration complete!');
      resetRestorePreview();
      loadDashboardData();
    } else {
      showToast(data.error || 'Restore failed', 'error');
    }
  } catch (err) {
    showToast('Server error executing database restore', 'error');
  }
}

// Data Explorer Logic
async function loadExplorerDocuments() {
  const colId = state.currentExplorerCollection;
  const tenantId = state.currentExplorerTenant;

  const url = tenantId ? `${API_BASE}/api/collections/${colId}/documents?tenant_id=${tenantId}` : `${API_BASE}/api/collections/${colId}/documents`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    state.explorerDocuments = data.documents || [];
    renderExplorerTable(state.explorerDocuments);
  } catch (err) {
    showToast('Error loading collection documents', 'error');
  }
}

function renderExplorerTable(documents) {
  const tbody = document.getElementById('explorer-table-body');

  if (!documents || documents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 30px;">No documents in this collection.</td></tr>`;
    return;
  }

  tbody.innerHTML = documents.map(doc => {
    const docId = doc.$id || doc.id;
    const tenantId = doc.tenant_id || '--';

    // Highlight key summary text based on document fields
    const summaryText = doc.name || doc.company_name || doc.quote_number || doc.sale_number || doc.email || doc.displayName || JSON.stringify(doc).slice(0, 80);

    return `
      <tr>
        <td><code>${docId}</code></td>
        <td><code>${tenantId}</code></td>
        <td><strong>${escapeHtml(String(summaryText))}</strong></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editExplorerDoc('${docId}')">
            <i class="ri-edit-line"></i> Edit JSON
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteExplorerDoc('${docId}')">
            <i class="ri-delete-bin-line"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openNewDocumentEditor() {
  document.getElementById('doc-editor-title').textContent = `New Document in '${state.currentExplorerCollection}'`;
  const defaultObj = { tenant_id: state.currentExplorerTenant || 'default_tenant' };
  document.getElementById('doc-editor-json').value = JSON.stringify(defaultObj, null, 2);
  document.getElementById('modal-doc-editor').classList.remove('hidden');
}

function editExplorerDoc(docId) {
  const doc = state.explorerDocuments.find(d => (d.$id === docId || d.id === docId));
  if (!doc) return;

  const cleanDoc = { ...doc };
  delete cleanDoc.$databaseId;
  delete cleanDoc.$collectionId;
  delete cleanDoc.$permissions;

  document.getElementById('doc-editor-title').textContent = `Edit Document '${docId}'`;
  document.getElementById('doc-editor-json').value = JSON.stringify(cleanDoc, null, 2);
  document.getElementById('modal-doc-editor').classList.remove('hidden');
}

async function saveDocumentEditorJson() {
  const jsonText = document.getElementById('doc-editor-json').value;
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    showToast('Invalid JSON syntax', 'error');
    return;
  }

  const colId = state.currentExplorerCollection;
  try {
    const res = await fetch(`${API_BASE}/api/collections/${colId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: parsed })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Document saved successfully');
      document.getElementById('modal-doc-editor').classList.add('hidden');
      loadExplorerDocuments();
    } else {
      showToast(data.error || 'Failed to save document', 'error');
    }
  } catch (err) {
    showToast('Server error saving document', 'error');
  }
}

async function deleteExplorerDoc(docId) {
  if (!confirm(`Are you sure you want to permanently delete document '${docId}'?`)) return;

  const colId = state.currentExplorerCollection;
  try {
    const res = await fetch(`${API_BASE}/api/collections/${colId}/documents/${docId}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (data.success) {
      showToast('Document deleted');
      loadExplorerDocuments();
    } else {
      showToast(data.error || 'Failed to delete document', 'error');
    }
  } catch (err) {
    showToast('Server error deleting document', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
