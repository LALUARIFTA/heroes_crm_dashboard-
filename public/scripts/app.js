const STORAGE_KEY = 'heroes_crm_v2';

const THEMES = {
  indigo: { label: 'Royal Indigo + Amber Gold', primary: '#4F46E5', hover: '#4338CA', soft: '#EEF2FF', glow: 'rgba(79,70,229,0.35)', accent: '#F59E0B', sidebar: '#161433' },
  emerald: { label: 'Emerald + Gold', primary: '#059669', hover: '#047857', soft: '#ECFDF5', glow: 'rgba(5,150,105,0.35)', accent: '#F59E0B', sidebar: '#0F241F' },
  cyan: { label: 'Slate + Cyan', primary: '#0284C7', hover: '#0369A1', soft: '#F0F9FF', glow: 'rgba(2,132,199,0.35)', accent: '#38BDF8', sidebar: '#0F172A' },
  violet: { label: 'Electric Violet + Rose', primary: '#7C3AED', hover: '#6D28D9', soft: '#F5F3FF', glow: 'rgba(124,58,237,0.35)', accent: '#F43F5E', sidebar: '#1E1136' }
};

function applyTheme(themeKey) {
  const t = THEMES[themeKey] || THEMES.indigo;
  const r = document.documentElement.style;
  r.setProperty('--primary', t.primary);
  r.setProperty('--primary-hover', t.hover);
  r.setProperty('--primary-soft', t.soft);
  r.setProperty('--primary-glow', t.glow);
  r.setProperty('--accent', t.accent);
  r.setProperty('--sidebar-bg', t.sidebar);
}

function avatarFallbackSvg(name, bg = '#4F46E5') {
  const initials = (name || 'HC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="60" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Inter,sans-serif" font-size="44" font-weight="700">${initials}</text></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function imgTag(src, alt, cls = 'w-8 h-8 rounded-full object-cover', bg = '#4F46E5') {
  const fb = avatarFallbackSvg(alt, bg);
  return `<img src="${escapeHtml(src || fb)}" alt="${escapeHtml(alt)}" class="${cls}" onerror="this.onerror=null;this.src=${escapeHtml(JSON.stringify(fb))};" />`;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function formatCurrency(val) {
  return '$' + Math.round(Number(val || 0)).toLocaleString('en-US');
}

/* =========================================================
   2. STATE MANAGEMENT, UNDO STACK & PERSISTENCE
   ========================================================= */
let appState = loadState();
let undoSnapshot = null;
let currentView = 'dashboard';
let dealsViewMode = 'table'; // 'table' | 'kanban'
let calYear = 2025, calMonth = 4; // May 2025 (0-indexed)
let forecastSim = { winRate: 28, avgDeal: 32000, monthlyQuota: 120000, velocity: 1.0 };

const tableState = {};
function getTableState(key) {
  if (!tableState[key]) {
    tableState[key] = { search: '', filter: 'ALL', sortCol: null, sortDir: 'asc', page: 1, pageSize: 5, selected: new Set() };
  }
  return tableState[key];
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Storage load error:', e); }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); } catch (e) { console.warn('Storage save error:', e); }
}

function captureUndoSnapshot() {
  undoSnapshot = JSON.parse(JSON.stringify(appState));
}

function performUndo() {
  if (!undoSnapshot) return;
  appState = undoSnapshot;
  undoSnapshot = null;
  saveState();
  applyTheme(appState.theme);
  syncProfileUI();
  renderNotifications();
  renderCurrentView();
  showToast('Action undone — previous state restored.', 'info');
}

function resetDefaultData() {
  appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState();
  Object.keys(tableState).forEach(k => delete tableState[k]);
  applyTheme(appState.theme);
  syncProfileUI();
  renderNotifications();
  renderCurrentView();
  showToast('All datasets restored to Heroes CRM v2.0 defaults.', 'success');
}

/* =========================================================
   3. NAVIGATION, NOTIFICATIONS & SHELL
   ========================================================= */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid' },
  { id: 'leads', label: 'Leads', icon: 'users' },
  { id: 'deals', label: 'Deals', icon: 'briefcase' },
  { id: 'contacts', label: 'Contacts', icon: 'contact' },
  { id: 'accounts', label: 'Accounts', icon: 'building-2' },
  { id: 'activities', label: 'Activities', icon: 'clipboard-list' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'reports', label: 'Reports', icon: 'bar-chart-3' },
  { id: 'forecast', label: 'Forecast', icon: 'trending-up' },
  { id: 'products', label: 'Products', icon: 'package' },
  { id: 'documents', label: 'Documents', icon: 'file-text' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

function renderSidebarNav() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = NAV_ITEMS.map(item => {
    const active = currentView === item.id;
    return `
      <button onclick="navigateTo('${item.id}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
        active
          ? 'bg-primary text-white shadow-brand-glow'
          : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.06]'
      }">
        <i data-lucide="${item.icon}" class="w-[17px] h-[17px] ${active ? 'text-white' : 'text-slate-400'}"></i>
        <span>${item.label}</span>
      </button>
    `;
  }).join('');
  lucide.createIcons();
}

function navigateTo(viewId, presetFilter = null) {
  currentView = viewId;
  if (presetFilter && viewId === 'deals') {
    const ts = getTableState('deals');
    ts.filter = presetFilter;
    ts.page = 1;
  }
  toggleMobileSidebar(false);
  renderSidebarNav();
  renderCurrentView();
  document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileSidebar(open) {
  const sb = document.getElementById('app-sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  sb.classList.toggle('-translate-x-full', !open);
  bd.classList.toggle('hidden', !open);
}

function syncProfileUI() {
  const p = appState.profile;
  const av = document.getElementById('topbar-avatar');
  av.src = p.avatar || avatarFallbackSvg(p.name);
  av.onerror = () => { av.src = avatarFallbackSvg(p.name); };
  document.getElementById('topbar-name').textContent = p.name;
  document.getElementById('topbar-role').textContent = p.role;
}

function renderNotifications() {
  const list = appState.notifications || [];
  const unread = list.filter(n => n.unread).length;
  const badge = document.getElementById('notif-badge');
  if (unread > 0) {
    badge.textContent = unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
  const box = document.getElementById('notif-list');
  box.innerHTML = list.map(n => `
    <div onclick="closeAllDropdowns(); navigateTo('${n.view}')" class="p-3.5 hover:bg-slate-50 flex gap-3 cursor-pointer ${n.unread ? 'bg-indigo-50/30' : ''}">
      <div class="w-8 h-8 rounded-full ${n.bg} flex items-center justify-center shrink-0"><i data-lucide="${n.icon}" class="w-4 h-4"></i></div>
      <div class="min-w-0">
        <p class="font-medium text-slate-800 truncate">${escapeHtml(n.title)}</p>
        <p class="text-slate-500 mt-0.5 text-[11.5px]">${escapeHtml(n.sub)}</p>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function markNotificationsRead() {
  (appState.notifications || []).forEach(n => n.unread = false);
  saveState();
  renderNotifications();
  closeAllDropdowns();
  showToast('All notifications marked as read.', 'info');
}

/* =========================================================
   7. REUSABLE INTERACTIVE TABLE ENGINE (WITH BULK CSV)
   ========================================================= */
function statusBadgeClass(status) {
  const map = {
    'Closed Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Converted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Active': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Confirmed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Signed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Qualified': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Enterprise': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'VIP': 'bg-violet-50 text-violet-700 border-violet-200',
    'Prospecting': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'New': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Sent': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Qualification': 'bg-sky-50 text-sky-700 border-sky-200',
    'Contacted': 'bg-sky-50 text-sky-700 border-sky-200',
    'Scheduled': 'bg-sky-50 text-sky-700 border-sky-200',
    'Viewed': 'bg-sky-50 text-sky-700 border-sky-200',
    'Proposal': 'bg-violet-50 text-violet-700 border-violet-200',
    'Negotiation': 'bg-amber-50 text-amber-700 border-amber-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    'Draft': 'bg-amber-50 text-amber-700 border-amber-200',
    'Unqualified': 'bg-slate-100 text-slate-600 border-slate-200',
    'Inactive': 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function renderInteractiveTable(containerId, cfg) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const ts = getTableState(cfg.stateKey);
  const rawData = appState[cfg.entity] || [];

  let filtered = rawData.filter(item => {
    const matchesFilter = ts.filter === 'ALL' || item[cfg.filterField] === ts.filter;
    const q = ts.search.trim().toLowerCase();
    const matchesSearch = !q || cfg.searchFields.some(f => String(item[f] || '').toLowerCase().includes(q));
    return matchesFilter && matchesSearch;
  });

  if (ts.sortCol) {
    filtered.sort((a, b) => {
      let va = a[ts.sortCol], vb = b[ts.sortCol];
      if (typeof va === 'number' && typeof vb === 'number') return ts.sortDir === 'asc' ? va - vb : vb - va;
      return ts.sortDir === 'asc' ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''));
    });
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ts.pageSize));
  if (ts.page > totalPages) ts.page = totalPages;
  const startIdx = (ts.page - 1) * ts.pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + ts.pageSize);
  const allPageSelected = pageRows.length > 0 && pageRows.every(r => ts.selected.has(r.id));
  const selectedCount = ts.selected.size;

  wrap.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 class="text-[16px] font-bold text-slate-900">${escapeHtml(cfg.title)}</h2>
          <p class="text-[12px] text-slate-500 mt-0.5">${total} records · Click status badges to cycle status</p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="relative flex-1 sm:flex-initial">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input type="text" value="${escapeHtml(ts.search)}" placeholder="Search ${cfg.entity}..."
              oninput="updateTableSearch('${containerId}', '${cfg.stateKey}', this.value)"
              class="pl-9 pr-3 py-2 w-full sm:w-52 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:border-primary" />
          </div>
          <select onchange="updateTableFilter('${containerId}', '${cfg.stateKey}', this.value)"
            class="px-3 py-2 rounded-xl border border-slate-200 text-[13px] bg-white text-slate-700 focus:outline-none focus:border-primary">
            <option value="ALL" ${ts.filter === 'ALL' ? 'selected' : ''}>All ${cfg.filterLabel || 'Statuses'}</option>
            ${cfg.filterOptions.map(opt => `<option value="${opt}" ${ts.filter === opt ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
          ${cfg.extraHeaderBtn || ''}
          <button onclick="openCrudModal('${cfg.entity}')" class="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-brand-glow transition-all active:scale-95">
            <i data-lucide="plus" class="w-4 h-4"></i><span>Add ${cfg.singular}</span>
          </button>
        </div>
      </div>

      ${selectedCount > 0 ? `
        <div class="px-5 py-2.5 bg-primary-soft border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 animate-view">
          <div class="text-[13px] font-semibold text-primary flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-primary text-white text-[11px] flex items-center justify-center">${selectedCount}</span>
            <span>item${selectedCount > 1 ? 's' : ''} selected</span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="bulkCycleStatus('${cfg.entity}', '${cfg.stateKey}', '${cfg.filterField}')" class="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-primary text-[12px] font-semibold hover:bg-indigo-50">Advance Status</button>
            <button onclick="bulkExportCSV('${cfg.entity}', '${cfg.stateKey}')" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[12px] font-semibold hover:bg-slate-50">Export CSV</button>
            <button onclick="confirmBulkDelete('${cfg.entity}', '${cfg.stateKey}')" class="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[12px] font-semibold hover:bg-rose-700">Delete Selected</button>
            <button onclick="clearTableSelection('${containerId}', '${cfg.stateKey}')" class="px-2.5 py-1.5 rounded-lg text-slate-600 text-[12px] hover:bg-white">Clear</button>
          </div>
        </div>
      ` : ''}

      <div class="overflow-x-auto">
        ${pageRows.length === 0 ? `
          <div class="py-14 px-6 text-center">
            <div class="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-3"><i data-lucide="inbox" class="w-6 h-6"></i></div>
            <h4 class="text-[15px] font-bold text-slate-800">No matching ${cfg.entity} found</h4>
            <p class="text-[13px] text-slate-500 mt-1 max-w-xs mx-auto">Try adjusting your search query or clearing active filters.</p>
            <button onclick="resetTableFilters('${containerId}', '${cfg.stateKey}')" class="mt-4 px-4 py-2 rounded-xl bg-primary-soft text-primary font-semibold text-[13px] hover:opacity-80">Reset Filter</button>
          </div>
        ` : `
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-100 text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
                <th class="py-3 pl-5 pr-2 w-10"><input type="checkbox" ${allPageSelected ? 'checked' : ''} onchange="toggleSelectAll('${containerId}', '${cfg.stateKey}', this.checked)" class="rounded border-slate-300 text-primary cursor-pointer" /></th>
                ${cfg.columns.map(col => `
                  <th class="py-3 px-3 ${col.sortable ? 'cursor-pointer hover:text-primary select-none' : ''}" ${col.sortable ? `onclick="toggleTableSort('${containerId}', '${cfg.stateKey}', '${col.key}')"` : ''}>
                    <div class="flex items-center gap-1"><span>${col.label}</span>${col.sortable ? `<i data-lucide="${ts.sortCol === col.key ? (ts.sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : 'chevrons-up-down'}" class="w-3.5 h-3.5 ${ts.sortCol === col.key ? 'text-primary' : 'text-slate-300'}"></i>` : ''}</div>
                  </th>
                `).join('')}
                <th class="py-3 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-[13px]">
              ${pageRows.map(row => {
                const checked = ts.selected.has(row.id);
                return `
                  <tr class="hover:bg-primary-soft/35 transition-colors ${checked ? 'bg-primary-soft/40' : ''}">
                    <td class="py-3 pl-5 pr-2"><input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleRowSelect('${containerId}', '${cfg.stateKey}', '${row.id}', this.checked)" class="rounded border-slate-300 text-primary cursor-pointer" /></td>
                    ${cfg.columns.map(col => `<td class="py-3 px-3">${col.render ? col.render(row) : escapeHtml(row[col.key])}</td>`).join('')}
                    <td class="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                      <div class="inline-flex items-center gap-1">
                        ${cfg.rowExtraActions ? cfg.rowExtraActions(row) : ''}
                        <button onclick="openDetailDrawer('${cfg.entity}', '${row.id}')" title="View Details" class="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary-soft transition-colors"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <button onclick="openCrudModal('${cfg.entity}', '${row.id}')" title="Edit" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button onclick="confirmDeleteRecord('${cfg.entity}', '${row.id}')" title="Delete" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      ${total > 0 ? `
        <div class="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12.5px] text-slate-500">
          <div class="flex items-center gap-3">
            <span>Showing <strong class="text-slate-800">${startIdx + 1}–${Math.min(startIdx + ts.pageSize, total)}</strong> of <strong class="text-slate-800">${total}</strong></span>
            <select onchange="updatePageSize('${containerId}', '${cfg.stateKey}', Number(this.value))" class="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12px]">
              ${[5, 10, 25].map(sz => `<option value="${sz}" ${ts.pageSize === sz ? 'selected' : ''}>${sz} / page</option>`).join('')}
            </select>
          </div>
          <div class="flex items-center gap-1">
            <button ${ts.page <= 1 ? 'disabled' : ''} onclick="goToPage('${containerId}', '${cfg.stateKey}', ${ts.page - 1})" class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium">Prev</button>
            ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
              <button onclick="goToPage('${containerId}', '${cfg.stateKey}', ${p})" class="w-8 h-8 rounded-lg font-semibold ${p === ts.page ? 'bg-primary text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}">${p}</button>
            `).join('')}
            <button ${ts.page >= totalPages ? 'disabled' : ''} onclick="goToPage('${containerId}', '${cfg.stateKey}', ${ts.page + 1})" class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-medium">Next</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  window._activeTableConfigs = window._activeTableConfigs || {};
  window._activeTableConfigs[containerId] = cfg;
  lucide.createIcons();
}

function rerenderTable(cid) { const cfg = window._activeTableConfigs?.[cid]; if (cfg) renderInteractiveTable(cid, cfg); }
function updateTableSearch(cid, sk, val) { const ts = getTableState(sk); ts.search = val; ts.page = 1; rerenderTable(cid); }
function updateTableFilter(cid, sk, val) { const ts = getTableState(sk); ts.filter = val; ts.page = 1; rerenderTable(cid); }
function resetTableFilters(cid, sk) { const ts = getTableState(sk); ts.search = ''; ts.filter = 'ALL'; ts.page = 1; rerenderTable(cid); }
function toggleTableSort(cid, sk, col) { const ts = getTableState(sk); ts.sortCol === col ? (ts.sortDir = ts.sortDir === 'asc' ? 'desc' : 'asc') : (ts.sortCol = col, ts.sortDir = 'asc'); rerenderTable(cid); }
function goToPage(cid, sk, page) { getTableState(sk).page = page; rerenderTable(cid); }
function updatePageSize(cid, sk, sz) { const ts = getTableState(sk); ts.pageSize = sz; ts.page = 1; rerenderTable(cid); }
function toggleRowSelect(cid, sk, id, checked) { const ts = getTableState(sk); checked ? ts.selected.add(id) : ts.selected.delete(id); rerenderTable(cid); }
function toggleSelectAll(cid, sk, checked) { const cfg = window._activeTableConfigs[cid]; const ts = getTableState(sk); (appState[cfg.entity] || []).forEach(r => checked ? ts.selected.add(r.id) : ts.selected.delete(r.id)); rerenderTable(cid); }
function clearTableSelection(cid, sk) { getTableState(sk).selected.clear(); rerenderTable(cid); }

function quickCycleStatus(entity, id, field, options) {
  const rec = (appState[entity] || []).find(r => r.id === id);
  if (!rec) return;
  rec[field] = options[(options.indexOf(rec[field]) + 1) % options.length];
  saveState();
  renderCurrentView();
  showToast(`Status updated to "${rec[field]}"`, 'success');
}

function bulkCycleStatus(entity, sk, field) {
  const ts = getTableState(sk);
  const opts = ENTITY_SCHEMAS[entity].statusOptions;
  (appState[entity] || []).forEach(r => { if (ts.selected.has(r.id)) r[field] = opts[(opts.indexOf(r[field]) + 1) % opts.length]; });
  ts.selected.clear();
  saveState();
  renderCurrentView();
  showToast('Selected records updated.', 'success');
}

function bulkExportCSV(entity, sk) {
  const ts = getTableState(sk);
  const rows = (appState[entity] || []).filter(r => ts.selected.has(r.id));
  exportArrayToCSV(rows, `heroes-crm-${entity}-selected.csv`);
}

function exportArrayToCSV(arr, filename) {
  if (!arr.length) return showToast('No records to export.', 'warning');
  const keys = Object.keys(arr[0]).filter(k => k !== 'avatar' && k !== 'image');
  const csv = [keys.join(','), ...arr.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  showToast(`Exported ${arr.length} rows to ${filename}`, 'success');
}

function confirmBulkDelete(entity, sk) {
  const ts = getTableState(sk);
  openConfirmModal('Delete Selected Records', `Delete ${ts.selected.size} selected item(s)?`, () => {
    captureUndoSnapshot();
    appState[entity] = appState[entity].filter(r => !ts.selected.has(r.id));
    ts.selected.clear();
    saveState();
    renderCurrentView();
    showToast('Selected records deleted.', 'success', true);
  });
}

/* =========================================================
   8. TABLE CONFIGURATIONS FOR ALL ENTITIES
   ========================================================= */
function getDealsTableConfig(stateKey = 'deals', title = 'All Deals & Opportunities') {
  const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won'];
  return {
    entity: 'deals', stateKey, title, singular: 'Deal',
    filterField: 'stage', filterLabel: 'Stages', filterOptions: stages,
    searchFields: ['title', 'company', 'owner', 'stage'],
    columns: [
      { key: 'company', label: 'Deal / Company', sortable: true, render: r => `<div class="flex items-center gap-2.5"><span class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0" style="background:${r.color||'#4F46E5'}">${escapeHtml(r.company.slice(0,2).toUpperCase())}</span><div><div class="font-semibold text-slate-900">${escapeHtml(r.title)}</div><div class="text-[11.5px] text-slate-500">${escapeHtml(r.company)}</div></div></div>` },
      { key: 'stage', label: 'Stage', sortable: true, render: r => `<button onclick="quickCycleStatus('deals','${r.id}','stage',${JSON.stringify(stages).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.stage)}">${escapeHtml(r.stage)}</button>` },
      { key: 'value', label: 'Value', sortable: true, render: r => `<span class="font-bold text-slate-900">${formatCurrency(r.value)}</span>` },
      { key: 'owner', label: 'Owner', sortable: true },
      { key: 'closeDate', label: 'Close Date', sortable: true }
    ]
  };
}

function getLeadsTableConfig() {
  const statuses = ['New', 'Contacted', 'Qualified', 'Converted', 'Unqualified'];
  return {
    entity: 'leads', stateKey: 'leads', title: 'Leads Management', singular: 'Lead',
    filterField: 'status', filterLabel: 'Statuses', filterOptions: statuses,
    searchFields: ['name', 'company', 'email', 'source', 'owner'],
    rowExtraActions: r => `
      ${r.status !== 'Converted' ? `<button onclick="openConvertLeadModal('${r.id}')" title="Convert Lead to Deal" class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold mr-1">Convert</button>` : ''}
      <button onclick="openSoftphone('${escapeHtml(r.name)}', '${escapeHtml(r.phone || '+1 (415) 555-0192')}')" title="Call Lead" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><i data-lucide="phone" class="w-4 h-4"></i></button>
    `,
    columns: [
      { key: 'name', label: 'Lead', sortable: true, render: r => `<div class="flex items-center gap-2.5">${imgTag(r.avatar, r.name, 'w-8 h-8 rounded-full object-cover')}<div><div class="font-semibold text-slate-900">${escapeHtml(r.name)}</div><div class="text-[11.5px] text-slate-500">${escapeHtml(r.email)}</div></div></div>` },
      { key: 'company', label: 'Company', sortable: true },
      { key: 'status', label: 'Status', sortable: true, render: r => `<button onclick="quickCycleStatus('leads','${r.id}','status',${JSON.stringify(statuses).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</button>` },
      { key: 'source', label: 'Source', sortable: true },
      { key: 'value', label: 'Est. Value', sortable: true, render: r => `<span class="font-bold text-slate-900">${formatCurrency(r.value)}</span>` }
    ]
  };
}

function getContactsTableConfig() {
  const statuses = ['Active', 'VIP', 'Inactive'];
  return {
    entity: 'contacts', stateKey: 'contacts', title: 'Contacts Directory', singular: 'Contact',
    filterField: 'status', filterLabel: 'Statuses', filterOptions: statuses,
    searchFields: ['name', 'company', 'email', 'role'],
    rowExtraActions: r => `
      <button onclick="openSoftphone('${escapeHtml(r.name)}', '${escapeHtml(r.phone)}')" title="Call" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><i data-lucide="phone" class="w-4 h-4"></i></button>
      <button onclick="openEmailComposer('${escapeHtml(r.email)}')" title="Email" class="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary-soft"><i data-lucide="mail" class="w-4 h-4"></i></button>
    `,
    columns: [
      { key: 'name', label: 'Contact', sortable: true, render: r => `<div class="flex items-center gap-2.5">${imgTag(r.avatar, r.name, 'w-8 h-8 rounded-full object-cover')}<div><div class="font-semibold text-slate-900">${escapeHtml(r.name)}</div><div class="text-[11.5px] text-slate-500">${escapeHtml(r.role)}</div></div></div>` },
      { key: 'company', label: 'Company', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'phone', label: 'Phone', sortable: false },
      { key: 'status', label: 'Status', sortable: true, render: r => `<button onclick="quickCycleStatus('contacts','${r.id}','status',${JSON.stringify(statuses).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</button>` }
    ]
  };
}

function getAccountsTableConfig() {
  const statuses = ['Active', 'Enterprise', 'Inactive'];
  return {
    entity: 'accounts', stateKey: 'accounts', title: 'Customer Accounts', singular: 'Account',
    filterField: 'status', filterLabel: 'Tiers', filterOptions: statuses,
    searchFields: ['name', 'industry', 'location', 'owner'],
    columns: [
      { key: 'name', label: 'Account Name', sortable: true, render: r => `<div class="font-semibold text-slate-900">${escapeHtml(r.name)}<div class="text-[11.5px] text-slate-500 font-normal">${escapeHtml(r.location)}</div></div>` },
      { key: 'industry', label: 'Industry', sortable: true },
      { key: 'revenue', label: 'Annual Revenue', sortable: true, render: r => `<span class="font-bold text-slate-900">${formatCurrency(r.revenue)}</span>` },
      { key: 'employees', label: 'Employees', sortable: true },
      { key: 'status', label: 'Tier', sortable: true, render: r => `<button onclick="quickCycleStatus('accounts','${r.id}','status',${JSON.stringify(statuses).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</button>` }
    ]
  };
}

function getActivitiesTableConfig() {
  const statuses = ['Completed', 'In Progress', 'Scheduled'];
  return {
    entity: 'activities', stateKey: 'activities', title: 'Activity & Engagement Log', singular: 'Activity',
    filterField: 'status', filterLabel: 'Statuses', filterOptions: statuses,
    searchFields: ['title', 'company', 'type', 'owner', 'notes'],
    columns: [
      { key: 'title', label: 'Activity', sortable: true, render: r => `<div class="font-semibold text-slate-900">${escapeHtml(r.title)}<div class="text-[11.5px] text-slate-500 font-normal truncate max-w-xs">${escapeHtml(r.notes || '')}</div></div>` },
      { key: 'company', label: 'Company', sortable: true },
      { key: 'type', label: 'Type', sortable: true },
      { key: 'time', label: 'Logged', sortable: true },
      { key: 'status', label: 'Status', sortable: true, render: r => `<button onclick="quickCycleStatus('activities','${r.id}','status',${JSON.stringify(statuses).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</button>` }
    ]
  };
}

function getMeetingsTableConfig() {
  const statuses = ['Scheduled', 'Confirmed', 'Completed'];
  return {
    entity: 'meetings', stateKey: 'meetings', title: 'Scheduled Meetings & Follow-ups', singular: 'Meeting',
    filterField: 'status', filterLabel: 'Statuses', filterOptions: statuses,
    searchFields: ['title', 'company', 'type', 'owner'],
    columns: [
      { key: 'date', label: 'Date & Time', sortable: true, render: r => `<div class="font-semibold text-slate-900">${escapeHtml(r.date)}</div><div class="text-[11.5px] text-primary font-medium">${escapeHtml(r.time)}</div>` },
      { key: 'company', label: 'Company', sortable: true },
      { key: 'title', label: 'Agenda', sortable: true },
      { key: 'type', label: 'Channel', sortable: true },
      { key: 'status', label: 'Status', sortable: true, render: r => `<button onclick="quickCycleStatus('meetings','${r.id}','status',${JSON.stringify(statuses).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</button>` }
    ]
  };
}

function getProductsTableConfig() {
  const statuses = ['Active', 'Draft', 'Inactive'];
  return {
    entity: 'products', stateKey: 'products', title: 'Products & Pricing Catalog', singular: 'Product',
    filterField: 'status', filterLabel: 'Statuses', filterOptions: statuses,
    searchFields: ['name', 'sku', 'category'],
    extraHeaderBtn: `<button onclick="openQuoteModal()" class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-sm"><i data-lucide="receipt" class="w-4 h-4"></i> Generate Quote</button>`,
    columns: [
      { key: 'name', label: 'Product', sortable: true, render: r => `<div class="flex items-center gap-3">${imgTag(r.image, r.name, 'w-10 h-10 rounded-xl object-cover shrink-0')}<div><div class="font-semibold text-slate-900">${escapeHtml(r.name)}</div><div class="text-[11.5px] text-slate-500">${escapeHtml(r.sku)}</div></div></div>` },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'price', label: 'Unit Price', sortable: true, render: r => `<span class="font-bold text-slate-900">${formatCurrency(r.price)}</span>` },
      { key: 'stock', label: 'Availability', sortable: false },
      { key: 'status', label: 'Status', sortable: true, render: r => `<button onclick="quickCycleStatus('products','${r.id}','status',${JSON.stringify(statuses).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</button>` }
    ]
  };
}

function getDocumentsTableConfig() {
  const statuses = ['Sent', 'Viewed', 'Signed'];
  return {
    entity: 'documents', stateKey: 'documents', title: 'Sales Documents & Proposals', singular: 'Document',
    filterField: 'status', filterLabel: 'Statuses', filterOptions: statuses,
    searchFields: ['name', 'company', 'category'],
    rowExtraActions: r => `<button onclick="openDocPreviewModal('${r.id}')" title="Live Preview" class="px-2 py-1 rounded-lg bg-primary-soft text-primary hover:opacity-80 text-[11px] font-bold mr-1">Preview</button>`,
    columns: [
      { key: 'name', label: 'Document Name', sortable: true, render: r => `<div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0"><i data-lucide="file-text" class="w-4 h-4"></i></div><span class="font-semibold text-slate-900">${escapeHtml(r.name)}</span></div>` },
      { key: 'company', label: 'Account', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'size', label: 'Size', sortable: false },
      { key: 'status', label: 'Status', sortable: true, render: r => `<button onclick="quickCycleStatus('documents','${r.id}','status',${JSON.stringify(statuses).replace(/"/g,"'")})" class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</button>` }
    ]
  };
}

/* =========================================================
   9. ALL 12 SPA VIEWS
   ========================================================= */
function renderCurrentView() {
  const main = document.getElementById('main-content');
  if (currentView === 'dashboard') return renderDashboard();

  if (['leads', 'contacts', 'accounts', 'activities', 'documents'].includes(currentView)) {
    const map = { leads: getLeadsTableConfig, contacts: getContactsTableConfig, accounts: getAccountsTableConfig, activities: getActivitiesTableConfig, documents: getDocumentsTableConfig };
    main.innerHTML = `<div class="animate-view space-y-5"><div id="sub-table-wrap"></div></div>`;
    renderInteractiveTable('sub-table-wrap', map[currentView]());
    return;
  }

  if (currentView === 'deals') {
    const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won'];
    main.innerHTML = `
      <div class="animate-view space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-[22px] font-bold text-slate-900">Deals & Pipeline</h1>
            <p class="text-[13px] text-slate-500">Drag cards across columns in Kanban mode or manage in Table mode.</p>
          </div>
          <div class="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
            <button onclick="dealsViewMode='table'; renderCurrentView()" class="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold ${dealsViewMode==='table' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}">Table View</button>
            <button onclick="dealsViewMode='kanban'; renderCurrentView()" class="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold ${dealsViewMode==='kanban' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}">Kanban Board</button>
          </div>
        </div>
        ${dealsViewMode === 'table'
          ? `<div id="deals-table-wrap"></div>`
          : `<div class="overflow-x-auto pb-2"><div class="grid grid-cols-5 gap-4 min-w-[980px]">
              ${stages.map(st => {
                const list = appState.deals.filter(d => d.stage === st);
                const sum = list.reduce((s, d) => s + Number(d.value), 0);
                const weighted = list.reduce((s, d) => s + Number(d.value) * (Number(d.probability||50)/100), 0);
                return `
                  <div ondragover="handleStageDragOver(event)" ondragleave="handleStageDragLeave(event)" ondrop="handleStageDrop(event, '${st}')"
                       class="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/70 flex flex-col gap-2.5 min-h-[380px] transition-colors">
                    <div class="flex items-center justify-between px-1">
                      <span class="text-[12.5px] font-bold text-slate-800">${st}</span>
                      <span class="text-[11px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full">${list.length}</span>
                    </div>
                    <div class="px-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span class="font-bold text-slate-700">${formatCurrency(sum)}</span>
                      <span>Wtd: ${formatCurrency(weighted)}</span>
                    </div>
                    <div class="space-y-2.5 flex-1">
                      ${list.map(d => `
                        <div draggable="true" ondragstart="handleDealDragStart(event, '${d.id}')" ondragend="handleDealDragEnd(event)"
                             onclick="openDetailDrawer('deals','${d.id}')"
                             class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-primary cursor-grab active:cursor-grabbing card-lift">
                          <div class="text-[13px] font-bold text-slate-900">${escapeHtml(d.title)}</div>
                          <div class="text-[11.5px] text-slate-500 mt-0.5">${escapeHtml(d.company)}</div>
                          <div class="mt-3 flex items-center justify-between">
                            <span class="text-[13px] font-extrabold text-primary">${formatCurrency(d.value)}</span>
                            <span class="text-[11px] text-slate-400">${escapeHtml(d.closeDate)}</span>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>`;
              }).join('')}
            </div></div>`
        }
      </div>
    `;
    if (dealsViewMode === 'table') renderInteractiveTable('deals-table-wrap', getDealsTableConfig('deals', 'All Deals & Opportunities'));
    lucide.createIcons();
    return;
  }

  if (currentView === 'calendar') {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(`<div class="min-h-[82px] rounded-xl bg-slate-50/40"></div>`);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const evts = appState.meetings.filter(m => m.date === dateStr);
      const isToday = calYear === 2025 && calMonth === 4 && d === 15;
      cells.push(`
        <div onclick="openCrudModal('meetings', null, { date: '${dateStr}' })" class="min-h-[82px] p-2 rounded-xl border ${isToday ? 'border-primary bg-primary-soft/40' : 'border-slate-100 bg-white hover:border-indigo-200'} flex flex-col gap-1 cursor-pointer transition-colors">
          <span class="text-[11.5px] font-bold ${isToday ? 'text-primary' : 'text-slate-600'}">${d}</span>
          ${evts.map(e => `<button onclick="event.stopPropagation(); openDetailDrawer('meetings','${e.id}')" class="text-left text-[10px] font-semibold px-1.5 py-0.5 rounded ${e.type==='Call'?'bg-amber-500':'bg-primary'} text-white truncate hover:opacity-90">${escapeHtml(e.time)} ${escapeHtml(e.company)}</button>`).join('')}
        </div>
      `);
    }

    main.innerHTML = `
      <div class="animate-view space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-[22px] font-bold text-slate-900">Sales Calendar — ${monthNames[calMonth]} ${calYear}</h1>
            <p class="text-[13px] text-slate-500">Click any date cell to schedule a meeting, or click an event to inspect.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="shiftCalendarMonth(-1)" class="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
            <button onclick="calYear=2025; calMonth=4; renderCurrentView()" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-[12.5px] font-semibold hover:bg-slate-50">May 2025</button>
            <button onclick="shiftCalendarMonth(1)" class="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
            <button onclick="openCrudModal('meetings')" class="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold shadow-brand-glow">+ Schedule</button>
          </div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card overflow-x-auto">
          <div class="grid grid-cols-7 gap-2 min-w-[640px] text-center text-[11.5px] font-semibold text-slate-400 mb-2">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div class="grid grid-cols-7 gap-2 min-w-[640px]">${cells.join('')}</div>
        </div>
        <div id="calendar-table-wrap"></div>
      </div>
    `;
    renderInteractiveTable('calendar-table-wrap', getMeetingsTableConfig());
    lucide.createIcons();
    return;
  }

  if (currentView === 'reports') {
    const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won'];
    const stageTotals = stages.map(st => ({ st, val: appState.deals.filter(d => d.stage === st).reduce((s, d) => s + Number(d.value), 0) }));
    const maxStage = Math.max(...stageTotals.map(x => x.val), 1);

    main.innerHTML = `
      <div class="animate-view space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-[22px] font-bold text-slate-900">Executive Reports & Analytics</h1>
            <p class="text-[13px] text-slate-500">Revenue by stage, team quota attainment, and instant exports.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="exportArrayToCSV(appState.deals, 'heroes-crm-deals.csv')" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-primary text-slate-700 text-[12.5px] font-semibold flex items-center gap-1.5"><i data-lucide="download" class="w-4 h-4 text-primary"></i> Deals CSV</button>
            <button onclick="exportArrayToCSV(appState.leads, 'heroes-crm-leads.csv')" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-primary text-slate-700 text-[12.5px] font-semibold flex items-center gap-1.5"><i data-lucide="download" class="w-4 h-4 text-emerald-600"></i> Leads CSV</button>
            <button onclick="window.print()" class="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[12.5px] font-semibold flex items-center gap-1.5 shadow-brand-glow"><i data-lucide="printer" class="w-4 h-4"></i> Print Summary</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- Revenue by Stage Chart -->
          <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
            <h3 class="font-bold text-[15px] text-slate-900 mb-4">Revenue by Pipeline Stage</h3>
            <div class="space-y-3">
              ${stageTotals.map(x => `
                <div>
                  <div class="flex justify-between text-[12.5px] mb-1"><span class="font-medium text-slate-700">${x.st}</span><span class="font-bold text-slate-900">${formatCurrency(x.val)}</span></div>
                  <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-primary rounded-full" style="width:${Math.round((x.val/maxStage)*100)}%"></div></div>
                </div>
              `).join('')}
            </div>
          </div>
          <!-- Win/Loss Funnel -->
          <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
            <h3 class="font-bold text-[15px] text-slate-900 mb-4">Conversion & Win/Loss Funnel</h3>
            <div class="space-y-2.5 text-[12.5px]">
              <div class="p-3 rounded-xl bg-indigo-50 flex justify-between font-semibold text-indigo-900"><span>1. Inbound Leads</span><span>1,248 (100%)</span></div>
              <div class="p-3 rounded-xl bg-sky-50 flex justify-between font-semibold text-sky-900 mx-3"><span>2. Qualified Opportunities</span><span>412 (33%)</span></div>
              <div class="p-3 rounded-xl bg-amber-50 flex justify-between font-semibold text-amber-900 mx-6"><span>3. Proposals Sent</span><span>168 (13.5%)</span></div>
              <div class="p-3 rounded-xl bg-emerald-50 flex justify-between font-semibold text-emerald-900 mx-9"><span>4. Closed Won Deals</span><span>86 (6.9%)</span></div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          <div class="p-5 border-b border-slate-100 font-bold text-[15.5px]">Full Sales Team Leaderboard</div>
          <div class="overflow-x-auto">
            <table class="w-full text-left min-w-[600px]">
              <thead class="bg-slate-50 text-[11.5px] font-semibold uppercase text-slate-500 border-b border-slate-100">
                <tr><th class="py-3 px-5">Rep</th><th class="py-3 px-4">Role</th><th class="py-3 px-4">Revenue</th><th class="py-3 px-4">Quota</th><th class="py-3 px-4">Deals Closed</th><th class="py-3 px-5">Win Rate</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-[13px]">
                ${appState.team.map(r => {
                  const pct = Math.round((r.revenue / r.target) * 100);
                  return `<tr onclick="openRepModal('${r.id}')" class="hover:bg-primary-soft/30 cursor-pointer"><td class="py-3 px-5"><div class="flex items-center gap-2.5">${imgTag(r.avatar, r.name, 'w-8 h-8 rounded-full object-cover')}<span class="font-semibold text-slate-900">${escapeHtml(r.name)}</span></div></td><td class="py-3 px-4 text-slate-600">${escapeHtml(r.role)}</td><td class="py-3 px-4 font-bold text-slate-900">${formatCurrency(r.revenue)}</td><td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${pct>=90?'bg-emerald-50 text-emerald-700':'bg-indigo-50 text-indigo-700'}">${pct}%</span></td><td class="py-3 px-4 font-medium">${r.dealsClosed}</td><td class="py-3 px-5 font-semibold text-emerald-600">${r.winRate}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  if (currentView === 'forecast') {
    const predicted = Math.round((forecastSim.winRate / 100) * forecastSim.avgDeal * 120 * forecastSim.velocity);
    const bestCase = Math.round(predicted * 1.24);
    const commit = Math.round(predicted * 0.88);
    const yEnd = Math.max(18, Math.min(82, 95 - Math.round((predicted / 2000000) * 75)));

    main.innerHTML = `
      <div class="animate-view space-y-5">
        <div>
          <h1 class="text-[22px] font-bold text-slate-900">What-If Revenue Forecast Simulator</h1>
          <p class="text-[13px] text-slate-500">Adjust live sales levers below to model Predicted, Best Case, and Commit revenue.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card space-y-4 text-[13px]">
            <div>
              <div class="flex justify-between font-semibold mb-1"><span>Win Rate</span><span class="text-primary">${forecastSim.winRate}%</span></div>
              <input type="range" min="10" max="60" value="${forecastSim.winRate}" oninput="forecastSim.winRate=Number(this.value); renderCurrentView()" class="w-full accent-indigo-600" />
            </div>
            <div>
              <div class="flex justify-between font-semibold mb-1"><span>Average Deal Value</span><span class="text-primary">${formatCurrency(forecastSim.avgDeal)}</span></div>
              <input type="range" min="10000" max="80000" step="2000" value="${forecastSim.avgDeal}" oninput="forecastSim.avgDeal=Number(this.value); renderCurrentView()" class="w-full accent-indigo-600" />
            </div>
            <div>
              <div class="flex justify-between font-semibold mb-1"><span>Pipeline Velocity</span><span class="text-primary">${forecastSim.velocity.toFixed(2)}x</span></div>
              <input type="range" min="0.7" max="1.5" step="0.05" value="${forecastSim.velocity}" oninput="forecastSim.velocity=Number(this.value); renderCurrentView()" class="w-full accent-indigo-600" />
            </div>
          </div>
          <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="p-3.5 rounded-xl bg-primary-soft border border-indigo-100"><div class="text-[11px] font-semibold text-primary uppercase">Predicted</div><div class="text-[19px] font-extrabold text-slate-900 mt-0.5">${formatCurrency(predicted)}</div></div>
              <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100"><div class="text-[11px] font-semibold text-emerald-700 uppercase">Best Case</div><div class="text-[19px] font-extrabold text-emerald-800 mt-0.5">${formatCurrency(bestCase)}</div></div>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[11px] font-semibold text-slate-500 uppercase">Commit</div><div class="text-[19px] font-extrabold text-slate-800 mt-0.5">${formatCurrency(commit)}</div></div>
            </div>
            <svg class="w-full h-36 overflow-visible" viewBox="0 0 400 110">
              <path d="M 10 92 L 90 78 L 170 64 L 250 ${Math.round((64+yEnd)/2)} L 330 ${yEnd} L 390 ${Math.max(12, yEnd-6)} L 390 100 L 10 100 Z" fill="var(--primary-soft)" />
              <path d="M 10 92 L 90 78 L 170 64 L 250 ${Math.round((64+yEnd)/2)} L 330 ${yEnd} L 390 ${Math.max(12, yEnd-6)}" fill="none" stroke="var(--primary)" stroke-width="3" />
            </svg>
          </div>
        </div>
        <div id="forecast-table-wrap"></div>
      </div>
    `;
    renderInteractiveTable('forecast-table-wrap', getDealsTableConfig('forecast_deals', 'Weighted Forecast Breakdown'));
    return;
  }

  if (currentView === 'products') {
    main.innerHTML = `
      <div class="animate-view space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${appState.products.map(p => `
            <div onclick="openDetailDrawer('products','${p.id}')" class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-card card-lift cursor-pointer">
              ${imgTag(p.image, p.name, 'w-full h-36 object-cover')}
              <div class="p-4">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-semibold text-primary uppercase">${escapeHtml(p.category)}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${statusBadgeClass(p.status)}">${escapeHtml(p.status)}</span>
                </div>
                <h3 class="font-bold text-[14px] text-slate-900 mt-1 truncate">${escapeHtml(p.name)}</h3>
                <div class="text-[16px] font-extrabold text-slate-900 mt-2">${formatCurrency(p.price)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div id="products-table-wrap"></div>
      </div>
    `;
    renderInteractiveTable('products-table-wrap', getProductsTableConfig());
    return;
  }

  if (currentView === 'settings') {
    const p = appState.profile;
    main.innerHTML = `
      <div class="animate-view max-w-3xl space-y-5">
        <div>
          <h1 class="text-[22px] font-bold text-slate-900">Settings, Themes & Data Portability</h1>
          <p class="text-[13px] text-slate-500">Customize your profile, annual sales target, brand theme, or export/import JSON backups.</p>
        </div>
        <form onsubmit="saveSettingsForm(event)" class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
          <div class="flex items-center gap-4 pb-4 border-b border-slate-100">
            ${imgTag(p.avatar, p.name, 'w-16 h-16 rounded-full object-cover ring-4 ring-indigo-50')}
            <div><div class="font-bold text-[15px] text-slate-900">${escapeHtml(p.name)}</div><div class="text-[12.5px] text-slate-500">${escapeHtml(p.role)} · Heroes CRM v2.0</div></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
            <div><label class="block font-semibold text-slate-700 mb-1">Full Name</label><input name="name" value="${escapeHtml(p.name)}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-primary outline-none" /></div>
            <div><label class="block font-semibold text-slate-700 mb-1">Role / Title</label><input name="role" value="${escapeHtml(p.role)}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-primary outline-none" /></div>
            <div><label class="block font-semibold text-slate-700 mb-1">Annual Sales Target ($)</label><input name="annualTarget" type="number" value="${Number(p.annualTarget || 1000000)}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-primary outline-none" /></div>
            <div><label class="block font-semibold text-slate-700 mb-1">Avatar URL</label><input name="avatar" value="${escapeHtml(p.avatar)}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-primary outline-none" /></div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex justify-end">
            <button type="submit" class="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-[13px] shadow-brand-glow">Save Profile & Target</button>
          </div>
        </form>

        <!-- Accent Theme Switcher -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-3">
          <h3 class="font-bold text-[15px] text-slate-900">Accent Theme Switcher</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${Object.entries(THEMES).map(([k, t]) => `
              <button onclick="switchTheme('${k}')" class="p-3 rounded-xl border text-left flex items-center justify-between transition-all ${appState.theme===k ? 'border-primary bg-primary-soft/50 ring-2 ring-indigo-100' : 'border-slate-200 hover:bg-slate-50'}">
                <span class="text-[13px] font-semibold text-slate-800">${t.label}</span>
                <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-full" style="background:${t.primary}"></span><span class="w-4 h-4 rounded-full" style="background:${t.accent}"></span></span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- JSON Backup & Reset -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-[15px] text-slate-900">Data Portability & Reset</h3>
            <p class="text-[12.5px] text-slate-500">Export full CRM JSON backup, restore from file, or reset defaults.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="exportJsonBackup()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[12.5px]">Export JSON</button>
            <label class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[12.5px] cursor-pointer">Import JSON<input type="file" accept=".json" onchange="importJsonBackup(event)" class="hidden" /></label>
            <button onclick="confirmResetData()" class="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[12.5px]">Reset Defaults</button>
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  }
}

function shiftCalendarMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCurrentView();
}

function switchTheme(key) {
  appState.theme = key;
  saveState();
  applyTheme(key);
  renderCurrentView();
  showToast(`Theme switched to ${THEMES[key].label}`, 'success');
}

function saveSettingsForm(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  appState.profile.name = fd.get('name').trim();
  appState.profile.role = fd.get('role').trim();
  appState.profile.annualTarget = Number(fd.get('annualTarget') || 1000000);
  appState.profile.avatar = fd.get('avatar').trim();
  saveState();
  syncProfileUI();
  renderCurrentView();
  showToast('Profile & Annual Sales Target updated!', 'success');
}

function exportJsonBackup() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' }));
  a.download = 'heroes-crm-v2-backup.json';
  a.click();
  showToast('Full JSON backup exported.', 'success');
}

function importJsonBackup(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.deals || !parsed.leads) throw new Error('Invalid backup');
      appState = parsed;
      saveState();
      applyTheme(appState.theme);
      syncProfileUI();
      renderNotifications();
      renderCurrentView();
      showToast('JSON backup imported successfully!', 'success');
    } catch { showToast('Invalid JSON backup file.', 'warning'); }
  };
  reader.readAsText(file);
}

/* =========================================================
   10. ENTERPRISE v2.0 MODULES (SOFTPHONE, EMAIL, LEAD CONVERT,
       QUOTE BUILDER, DOC PREVIEW, COMMAND PALETTE)
   ========================================================= */
// --- VOIP SOFTPHONE ---
let spTimerInterval = null, spSeconds = 0, spMuted = false, spHeld = false;

function openSoftphone(clientName = '', phone = '') {
  const w = document.getElementById('softphone-widget');
  const sel = document.getElementById('sp-client-select');
  const allClients = [
    ...appState.contacts.map(c => ({ label: `${c.name} (${c.company})`, phone: c.phone })),
    ...appState.leads.map(l => ({ label: `${l.name} (${l.company})`, phone: l.phone || '+1 (415) 555-0192' }))
  ];
  sel.innerHTML = `<option value="">-- Select Contact / Lead --</option>` + allClients.map(c => `<option value="${escapeHtml(c.phone)}" data-name="${escapeHtml(c.label)}">${escapeHtml(c.label)}</option>`).join('');
  if (phone) document.getElementById('sp-number-input').value = phone;
  if (clientName) {
    const opt = Array.from(sel.options).find(o => o.text.includes(clientName));
    if (opt) opt.selected = true;
  }
  w.classList.remove('hidden');
  lucide.createIcons();
}
function closeSoftphone() { document.getElementById('softphone-widget').classList.add('hidden'); }
function syncSoftphoneNumber() {
  const val = document.getElementById('sp-client-select').value;
  if (val) document.getElementById('sp-number-input').value = val;
}
function dialKey(k) { document.getElementById('sp-number-input').value += k; }

function startSoftphoneCall() {
  const num = document.getElementById('sp-number-input').value.trim();
  if (!num) return showToast('Enter a phone number or select a client.', 'warning');
  spSeconds = 0; spMuted = false; spHeld = false;
  document.getElementById('sp-dialpad').classList.add('hidden');
  document.getElementById('sp-active-controls').classList.remove('hidden');
  document.getElementById('sp-dial-btn').classList.add('hidden');
  document.getElementById('sp-end-btn').classList.remove('hidden');
  document.getElementById('sp-call-banner').classList.remove('hidden');
  document.getElementById('sp-call-state').textContent = 'Ringing...';
  document.getElementById('sp-status-dot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse';
  document.getElementById('softphone-live-dot').classList.remove('hidden');

  clearInterval(spTimerInterval);
  spTimerInterval = setInterval(() => {
    spSeconds++;
    if (spSeconds === 2) document.getElementById('sp-call-state').textContent = 'Connected';
    const mm = String(Math.floor(spSeconds / 60)).padStart(2, '0');
    const ss = String(spSeconds % 60).padStart(2, '0');
    document.getElementById('sp-call-timer').textContent = `${mm}:${ss}`;
  }, 1000);
}

function toggleSoftphoneMute() {
  spMuted = !spMuted;
  document.getElementById('sp-mute-btn').classList.toggle('bg-amber-50', spMuted);
  document.getElementById('sp-mute-btn').classList.toggle('text-amber-700', spMuted);
}
function toggleSoftphoneHold() {
  spHeld = !spHeld;
  document.getElementById('sp-hold-btn').classList.toggle('bg-amber-50', spHeld);
  document.getElementById('sp-hold-btn').classList.toggle('text-amber-700', spHeld);
}

function endAndLogSoftphoneCall() {
  clearInterval(spTimerInterval);
  const sel = document.getElementById('sp-client-select');
  const clientLabel = sel.selectedOptions[0]?.dataset?.name || document.getElementById('sp-number-input').value;
  const outcome = document.getElementById('sp-outcome').value;
  const notes = document.getElementById('sp-notes').value.trim();
  const duration = document.getElementById('sp-call-timer').textContent;

  appState.activities.unshift({
    id: 'act' + Date.now(),
    title: `Call: ${outcome}`,
    company: clientLabel,
    type: 'Call',
    status: 'Completed',
    time: 'Just now',
    owner: appState.profile.name,
    notes: `Duration ${duration}. ${notes || 'Logged via Heroes VoIP Softphone.'}`
  });
  saveState();

  document.getElementById('sp-dialpad').classList.remove('hidden');
  document.getElementById('sp-active-controls').classList.add('hidden');
  document.getElementById('sp-dial-btn').classList.remove('hidden');
  document.getElementById('sp-end-btn').classList.add('hidden');
  document.getElementById('sp-call-banner').classList.add('hidden');
  document.getElementById('sp-notes').value = '';
  document.getElementById('sp-status-dot').className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
  document.getElementById('softphone-live-dot').classList.add('hidden');
  closeSoftphone();
  renderCurrentView();
  showToast(`Call logged (${duration} · ${outcome}) into Activity Timeline.`, 'success');
}

// --- EMAIL COMPOSER ---
const EMAIL_TEMPLATES = {
  proposal: { subj: 'Following up on our Heroes CRM Enterprise Proposal', body: 'Hi there,\n\nI wanted to check in on the Q2 Enterprise Proposal we shared earlier this week. Do you have 10 minutes tomorrow to review any questions with your team?\n\nBest regards,\nAlex Morgan' },
  demo: { subj: 'Invitation: Personalized Heroes CRM Live Demo', body: 'Hi there,\n\nExcited to show you how Heroes CRM streamlines pipeline visibility and revenue forecasting. Please let me know what time works best for a 20-minute walkthrough.\n\nBest regards,\nAlex Morgan' },
  renewal: { subj: 'Upcoming Annual Partnership Renewal & Loyalty Tier', body: 'Hi there,\n\nThank you for being a valued Heroes CRM partner! Ahead of your upcoming renewal, I prepared an exclusive multi-year loyalty upgrade for your team.\n\nBest regards,\nAlex Morgan' },
  intro: { subj: 'Scaling your sales team velocity with Heroes CRM', body: 'Hi there,\n\nI noticed your team is expanding rapidly. High-growth revenue teams use Heroes CRM to lift win rates by 22% with zero spreadsheet friction. Open to a quick chat?\n\nBest regards,\nAlex Morgan' }
};

function openEmailComposer(prefillEmail = '') {
  const sel = document.getElementById('email-recipient');
  const list = [...appState.contacts, ...appState.leads];
  sel.innerHTML = list.map(c => `<option value="${escapeHtml(c.email)}" data-company="${escapeHtml(c.company)}" ${c.email===prefillEmail?'selected':''}>${escapeHtml(c.name)} (${escapeHtml(c.company)})</option>`).join('');
  document.getElementById('email-template').value = '';
  document.getElementById('email-subject').value = '';
  document.getElementById('email-body').value = '';
  const m = document.getElementById('email-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
  lucide.createIcons();
}
function closeEmailComposer() { const m = document.getElementById('email-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
function applyEmailTemplate(key) {
  const t = EMAIL_TEMPLATES[key];
  if (!t) return;
  document.getElementById('email-subject').value = t.subj;
  document.getElementById('email-body').value = t.body;
}
function handleSendEmail(e) {
  e.preventDefault();
  const sel = document.getElementById('email-recipient');
  const company = sel.selectedOptions[0]?.dataset?.company || sel.value;
  const subj = document.getElementById('email-subject').value.trim();
  appState.activities.unshift({
    id: 'act' + Date.now(), title: 'Demo Email Logged', company, type: 'Email', status: 'Completed', time: 'Just now', owner: appState.profile.name, notes: `Subject: ${subj}`
  });
  saveState();
  closeEmailComposer();
  renderCurrentView();
  showToast(`Demo email for ${company} logged. No email was sent.`, 'success');
}

// --- 1-CLICK LEAD CONVERSION ---
let convertingLeadId = null;
function openConvertLeadModal(leadId) {
  const lead = appState.leads.find(l => l.id === leadId);
  if (!lead) return;
  convertingLeadId = leadId;
  document.getElementById('convert-lead-form').innerHTML = `
    <p class="text-slate-600">Convert <strong class="text-slate-900">${escapeHtml(lead.name)}</strong> (${escapeHtml(lead.company)}) into a live Deal, Contact, and Account.</p>
    <div><label class="block font-semibold text-slate-700 mb-1">New Deal Title</label><input name="title" value="${escapeHtml(lead.company)} — Enterprise Deal" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:border-primary" /></div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="block font-semibold text-slate-700 mb-1">Deal Value ($)</label><input name="value" type="number" value="${lead.value}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:border-primary" /></div>
      <div><label class="block font-semibold text-slate-700 mb-1">Initial Stage</label><select name="stage" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"><option>Qualification</option><option>Proposal</option><option>Negotiation</option></select></div>
    </div>
    <div class="pt-3 border-t border-slate-100 flex justify-end gap-2">
      <button type="button" onclick="closeConvertLeadModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium">Cancel</button>
      <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Convert Now</button>
    </div>
  `;
  const m = document.getElementById('convert-lead-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
}
function closeConvertLeadModal() { const m = document.getElementById('convert-lead-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
function handleConvertLeadSubmit(e) {
  e.preventDefault();
  const lead = appState.leads.find(l => l.id === convertingLeadId);
  if (!lead) return;
  const fd = new FormData(e.target);
  lead.status = 'Converted';
  appState.deals.unshift({
    id: 'd' + Date.now(), title: fd.get('title').trim(), company: lead.company, stage: fd.get('stage'), value: Number(fd.get('value') || 0),
    owner: appState.profile.name, probability: 55, closeDate: '2025-06-30', color: '#4F46E5', notes: `Converted from Lead: ${lead.name}`
  });
  if (!appState.contacts.some(c => c.email === lead.email)) {
    appState.contacts.unshift({ id: 'c' + Date.now(), name: lead.name, role: 'Decision Maker', company: lead.company, email: lead.email, phone: lead.phone || '+1 (415) 555-0199', status: 'Active', avatar: lead.avatar });
  }
  if (!appState.accounts.some(a => a.name === lead.company)) {
    appState.accounts.unshift({ id: 'a' + Date.now(), name: lead.company, industry: 'Technology', revenue: 5000000, employees: 120, status: 'Active', owner: appState.profile.name, location: 'United States' });
  }
  appState.activities.unshift({ id: 'act' + Date.now(), title: 'Lead Converted', company: lead.company, type: 'Document', status: 'Completed', time: 'Just now', owner: appState.profile.name, notes: `Converted ${lead.name} into ${fd.get('title')}` });
  saveState();
  closeConvertLeadModal();
  closeDetailDrawer();
  renderCurrentView();
  showToast(`🎉 ${lead.name} converted into Deal, Contact & Account!`, 'success');
}

// --- QUICK QUOTE BUILDER ---
let quoteState = { company: 'BrightWave Ltd.', discount: 10, items: [{ productId: 'p1', qty: 5 }] };
function openQuoteModal() {
  renderQuoteModalBody();
  const m = document.getElementById('quote-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
  lucide.createIcons();
}
function closeQuoteModal() { const m = document.getElementById('quote-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
function renderQuoteModalBody() {
  const subtotal = quoteState.items.reduce((s, it) => {
    const p = appState.products.find(x => x.id === it.productId);
    return s + (p ? p.price * it.qty : 0);
  }, 0);
  const discAmt = subtotal * (quoteState.discount / 100);
  const tax = (subtotal - discAmt) * 0.08;
  const total = subtotal - discAmt + tax;

  document.getElementById('quote-modal-body').innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label class="block font-semibold text-slate-700 mb-1">Client Account</label>
        <select onchange="quoteState.company=this.value" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
          ${appState.accounts.map(a => `<option value="${escapeHtml(a.name)}" ${quoteState.company===a.name?'selected':''}>${escapeHtml(a.name)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block font-semibold text-slate-700 mb-1">Discount (%)</label>
        <input type="number" min="0" max="50" value="${quoteState.discount}" onchange="quoteState.discount=Number(this.value||0); renderQuoteModalBody()" class="w-full px-3 py-2 rounded-xl border border-slate-200" />
      </div>
    </div>
    <div class="space-y-2">
      <div class="flex items-center justify-between"><span class="font-bold text-slate-800">Line Items</span><button type="button" onclick="quoteState.items.push({productId:appState.products[0].id, qty:1}); renderQuoteModalBody()" class="text-primary font-semibold text-[12px] hover:underline">+ Add Line</button></div>
      ${quoteState.items.map((it, i) => `
        <div class="flex items-center gap-2">
          <select onchange="quoteState.items[${i}].productId=this.value; renderQuoteModalBody()" class="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white">
            ${appState.products.map(p => `<option value="${p.id}" ${it.productId===p.id?'selected':''}>${escapeHtml(p.name)} (${formatCurrency(p.price)})</option>`).join('')}
          </select>
          <input type="number" min="1" value="${it.qty}" onchange="quoteState.items[${i}].qty=Math.max(1,Number(this.value)); renderQuoteModalBody()" class="w-20 px-3 py-2 rounded-xl border border-slate-200 text-center" />
          <button type="button" onclick="quoteState.items.splice(${i},1); renderQuoteModalBody()" class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      `).join('')}
    </div>
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-right">
      <div class="text-slate-500">Subtotal: <strong class="text-slate-800">${formatCurrency(subtotal)}</strong></div>
      <div class="text-emerald-600">Discount (${quoteState.discount}%): <strong>-${formatCurrency(discAmt)}</strong></div>
      <div class="text-slate-500">Est. Tax (8%): <strong class="text-slate-800">${formatCurrency(tax)}</strong></div>
      <div class="text-[18px] font-extrabold text-primary pt-1 border-t border-slate-200">Total Quote: ${formatCurrency(total)}</div>
    </div>
    <div class="flex justify-end gap-2">
      <button onclick="closeQuoteModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium">Cancel</button>
      <button onclick="saveGeneratedQuote(${Math.round(total)})" class="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold shadow-brand-glow">Save Quote to Documents</button>
    </div>
  `;
  lucide.createIcons();
}
function saveGeneratedQuote(total) {
  const docName = `Quote — ${quoteState.company} (${formatCurrency(total)}).pdf`;
  appState.documents.unshift({
    id: 'doc' + Date.now(), name: docName, company: quoteState.company, category: 'Proposal', size: '420 KB',
    updated: new Date().toISOString().slice(0, 10), status: 'Sent',
    summary: `Generated via Heroes CRM Quick Quote Builder for ${quoteState.company}. Includes ${quoteState.items.length} line item(s) with ${quoteState.discount}% discount. Grand Total: ${formatCurrency(total)}.`
  });
  saveState();
  closeQuoteModal();
  navigateTo('documents');
  showToast(`Saved "${docName}" to Documents!`, 'success');
}

// --- DOCUMENT PREVIEW MODAL ---
function openDocPreviewModal(docId) {
  const doc = appState.documents.find(d => d.id === docId);
  if (!doc) return;
  document.getElementById('doc-preview-title').textContent = doc.name;
  document.getElementById('doc-preview-body').innerHTML = `
    <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div class="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <div class="text-[11px] font-bold text-primary uppercase tracking-wider">HEROES CRM OFFICIAL ${escapeHtml(doc.category)}</div>
          <h4 class="text-[18px] font-extrabold text-slate-900 mt-1">${escapeHtml(doc.name)}</h4>
          <p class="text-[12.5px] text-slate-500">Prepared for <strong>${escapeHtml(doc.company)}</strong> · Updated ${escapeHtml(doc.updated)}</p>
        </div>
        <span class="px-3 py-1 rounded-full text-[11.5px] font-bold border ${statusBadgeClass(doc.status)}">${escapeHtml(doc.status)}</span>
      </div>
      <p class="text-[13.5px] text-slate-700 leading-relaxed">${escapeHtml(doc.summary || 'Standard enterprise sales agreement and pricing terms prepared by Heroes CRM.')}</p>
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 text-[12px] text-slate-500">
        Authorized Representative: <strong class="text-slate-800">${escapeHtml(appState.profile.name)}</strong> (${escapeHtml(appState.profile.email)})
      </div>
    </div>
  `;
  document.getElementById('doc-preview-footer').innerHTML = `
    <button onclick="updateDocStatus('${doc.id}', 'Sent')" class="px-4 py-2 rounded-xl bg-primary-soft text-primary font-semibold text-[13px] hover:opacity-80">Mark as Sent</button>
    <button onclick="updateDocStatus('${doc.id}', 'Signed')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13px]">Mark as Signed</button>
  `;
  const m = document.getElementById('doc-preview-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
}
function closeDocPreviewModal() { const m = document.getElementById('doc-preview-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
function updateDocStatus(id, status) {
  const doc = appState.documents.find(d => d.id === id);
  if (doc) doc.status = status;
  saveState();
  closeDocPreviewModal();
  renderCurrentView();
  showToast(`Document marked as "${status}".`, 'success');
}

// --- COMMAND PALETTE (Cmd+K) ---
function openCommandPalette() {
  const m = document.getElementById('command-palette-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
  const inp = document.getElementById('command-palette-input');
  inp.value = '';
  renderCommandPalette('');
  setTimeout(() => inp.focus(), 40);
}
function closeCommandPalette() { const m = document.getElementById('command-palette-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
function renderCommandPalette(query) {
  const q = query.trim().toLowerCase();
  const quickCmds = [
    { label: 'Create New Deal', icon: 'briefcase', action: "closeCommandPalette(); openCrudModal('deals')" },
    { label: 'Open VoIP Softphone', icon: 'phone', action: "closeCommandPalette(); openSoftphone()" },
    { label: 'Compose Sales Email', icon: 'mail', action: "closeCommandPalette(); openEmailComposer()" },
    { label: 'Switch to Deals Kanban Board', icon: 'columns-3', action: "closeCommandPalette(); dealsViewMode='kanban'; navigateTo('deals')" },
    { label: 'Generate Quick Quote', icon: 'receipt', action: "closeCommandPalette(); openQuoteModal()" },
    { label: 'Export Full JSON Backup', icon: 'download', action: "closeCommandPalette(); exportJsonBackup()" }
  ].filter(c => !q || c.label.toLowerCase().includes(q));

  const hits = [];
  ['deals', 'leads', 'contacts', 'accounts', 'products', 'documents'].forEach(entity => {
    (appState[entity] || []).forEach(r => {
      const label = r.title || r.name || '';
      const sub = r.company || r.industry || r.category || '';
      if (!q || label.toLowerCase().includes(q) || sub.toLowerCase().includes(q)) hits.push({ entity, id: r.id, label, sub });
    });
  });

  document.getElementById('command-palette-results').innerHTML = `
    ${quickCmds.length ? `
      <div class="px-2 pt-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Quick Actions</div>
      <div class="space-y-0.5">${quickCmds.map(c => `<button onclick="${c.action}" class="w-full px-3 py-2 rounded-xl hover:bg-primary-soft hover:text-primary flex items-center gap-2.5 text-[13px] font-medium text-slate-700"><i data-lucide="${c.icon}" class="w-4 h-4 text-primary"></i>${c.label}</button>`).join('')}</div>
    ` : ''}
    <div class="px-2 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Records (${hits.length})</div>
    <div class="space-y-0.5">
      ${hits.slice(0, 8).map(h => `
        <button onclick="closeCommandPalette(); openDetailDrawer('${h.entity}', '${h.id}')" class="w-full px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-left">
          <div><div class="text-[13px] font-semibold text-slate-800">${escapeHtml(h.label)}</div><div class="text-[11.5px] text-slate-500">${escapeHtml(h.sub)}</div></div>
          <span class="text-[10.5px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">${h.entity}</span>
        </button>
      `).join('') || `<div class="py-6 text-center text-[13px] text-slate-400">No matching records.</div>`}
    </div>
  `;
  lucide.createIcons();
}

/* =========================================================
   11. CRUD MODAL, DETAIL DRAWER, CONFIRMATION & TOASTS
   ========================================================= */
const ENTITY_SCHEMAS = {
  deals: { label: 'Deal', statusOptions: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won'], fields: [{ name:'title', label:'Deal Title', type:'text', required:true }, { name:'company', label:'Company', type:'text', required:true }, { name:'stage', label:'Stage', type:'select', options:['Prospecting','Qualification','Proposal','Negotiation','Closed Won'] }, { name:'value', label:'Value ($)', type:'number', required:true }, { name:'owner', label:'Owner', type:'text', default:'Alex Morgan' }, { name:'closeDate', label:'Close Date', type:'date', default:'2025-06-15' }, { name:'notes', label:'Notes', type:'textarea' }] },
  leads: { label: 'Lead', statusOptions: ['New', 'Contacted', 'Qualified', 'Converted', 'Unqualified'], fields: [{ name:'name', label:'Full Name', type:'text', required:true }, { name:'company', label:'Company', type:'text', required:true }, { name:'email', label:'Email', type:'email', required:true }, { name:'phone', label:'Phone', type:'text' }, { name:'status', label:'Status', type:'select', options:['New','Contacted','Qualified','Converted','Unqualified'] }, { name:'source', label:'Source', type:'select', options:['Website','Referral','LinkedIn','Webinar','Outbound','Partner'] }, { name:'value', label:'Est. Value ($)', type:'number', required:true }, { name:'avatar', label:'Avatar URL', type:'text' }] },
  contacts: { label: 'Contact', statusOptions: ['Active', 'VIP', 'Inactive'], fields: [{ name:'name', label:'Full Name', type:'text', required:true }, { name:'role', label:'Role', type:'text', required:true }, { name:'company', label:'Company', type:'text', required:true }, { name:'email', label:'Email', type:'email', required:true }, { name:'phone', label:'Phone', type:'text' }, { name:'status', label:'Status', type:'select', options:['Active','VIP','Inactive'] }, { name:'avatar', label:'Avatar URL', type:'text' }] },
  accounts: { label: 'Account', statusOptions: ['Active', 'Enterprise', 'Inactive'], fields: [{ name:'name', label:'Account Name', type:'text', required:true }, { name:'industry', label:'Industry', type:'text', required:true }, { name:'revenue', label:'Annual Revenue ($)', type:'number', required:true }, { name:'employees', label:'Employees', type:'number' }, { name:'location', label:'Location', type:'text' }, { name:'status', label:'Tier', type:'select', options:['Active','Enterprise','Inactive'] }] },
  activities: { label: 'Activity', statusOptions: ['Completed', 'In Progress', 'Scheduled'], fields: [{ name:'title', label:'Title', type:'text', required:true }, { name:'company', label:'Company', type:'text', required:true }, { name:'type', label:'Type', type:'select', options:['Email','Call','Document','Download','Meeting','Note'] }, { name:'status', label:'Status', type:'select', options:['Completed','In Progress','Scheduled'] }, { name:'notes', label:'Notes', type:'textarea' }] },
  meetings: { label: 'Meeting', statusOptions: ['Scheduled', 'Confirmed', 'Completed'], fields: [{ name:'title', label:'Agenda', type:'text', required:true }, { name:'company', label:'Company', type:'text', required:true }, { name:'date', label:'Date', type:'date', default:'2025-05-15', required:true }, { name:'time', label:'Time', type:'text', default:'3:00 PM', required:true }, { name:'type', label:'Channel', type:'select', options:['Call','Meeting'] }, { name:'status', label:'Status', type:'select', options:['Scheduled','Confirmed','Completed'] }] },
  products: { label: 'Product', statusOptions: ['Active', 'Draft', 'Inactive'], fields: [{ name:'name', label:'Product Name', type:'text', required:true }, { name:'sku', label:'SKU', type:'text', required:true }, { name:'category', label:'Category', type:'text', required:true }, { name:'price', label:'Price ($)', type:'number', required:true }, { name:'stock', label:'Availability', type:'text', default:'Unlimited' }, { name:'status', label:'Status', type:'select', options:['Active','Draft','Inactive'] }, { name:'image', label:'Image URL', type:'text' }] },
  documents: { label: 'Document', statusOptions: ['Sent', 'Viewed', 'Signed'], fields: [{ name:'name', label:'File Name', type:'text', required:true }, { name:'company', label:'Account', type:'text', required:true }, { name:'category', label:'Category', type:'select', options:['Proposal','Contract','Compliance','Brochure'] }, { name:'size', label:'Size', type:'text', default:'1.2 MB' }, { name:'status', label:'Status', type:'select', options:['Sent','Viewed','Signed'] }, { name:'summary', label:'Executive Summary', type:'textarea' }] }
};

let activeCrudCtx = null;
function openCrudModal(entity, editId = null, defaults = {}) {
  const schema = ENTITY_SCHEMAS[entity];
  if (!schema) return;
  const existing = editId ? (appState[entity] || []).find(r => r.id === editId) : null;
  activeCrudCtx = { entity, editId };
  document.getElementById('crud-modal-title').textContent = existing ? `Edit ${schema.label}` : `Add New ${schema.label}`;
  document.getElementById('crud-form').innerHTML = schema.fields.map(f => {
    const val = existing ? (existing[f.name] ?? '') : (defaults[f.name] ?? f.default ?? '');
    if (f.type === 'select') return `<div><label class="block text-[12.5px] font-semibold text-slate-700 mb-1">${f.label}</label><select name="${f.name}" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-[13px] bg-white focus:border-primary outline-none">${f.options.map(o => `<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
    if (f.type === 'textarea') return `<div><label class="block text-[12.5px] font-semibold text-slate-700 mb-1">${f.label}</label><textarea name="${f.name}" rows="3" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-[13px] focus:border-primary outline-none">${escapeHtml(val)}</textarea></div>`;
    return `<div><label class="block text-[12.5px] font-semibold text-slate-700 mb-1">${f.label}</label><input name="${f.name}" type="${f.type}" value="${escapeHtml(val)}" ${f.required?'required':''} class="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-[13px] focus:border-primary outline-none" /></div>`;
  }).join('') + `<div class="pt-3 border-t border-slate-100 flex justify-end gap-2"><button type="button" onclick="closeCrudModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-[13px] font-medium">Cancel</button><button type="submit" class="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold shadow-brand-glow">${existing?'Save Changes':'Create '+schema.label}</button></div>`;
  const m = document.getElementById('crud-modal'); m.classList.remove('hidden'); m.classList.add('flex');
}
function closeCrudModal() { const m = document.getElementById('crud-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }

function handleCrudSubmit(e) {
  e.preventDefault();
  if (!activeCrudCtx) return;
  const { entity, editId } = activeCrudCtx;
  const fd = new FormData(e.target);
  const payload = {};
  ENTITY_SCHEMAS[entity].fields.forEach(f => {
    const raw = fd.get(f.name);
    payload[f.name] = f.type === 'number' ? Number(raw || 0) : String(raw || '').trim();
  });
  if (editId) {
    const idx = appState[entity].findIndex(r => r.id === editId);
    if (idx !== -1) appState[entity][idx] = { ...appState[entity][idx], ...payload };
    showToast(`${ENTITY_SCHEMAS[entity].label} updated.`, 'success');
  } else {
    appState[entity].unshift({ id: entity.slice(0,2) + Date.now(), color: '#4F46E5', time: 'Just now', updated: new Date().toISOString().slice(0,10), owner: appState.profile.name, probability: 50, ...payload });
    showToast(`New ${ENTITY_SCHEMAS[entity].label} created.`, 'success');
  }
  saveState(); closeCrudModal(); renderCurrentView();
}

function openDetailDrawer(entity, id) {
  const rec = (appState[entity] || []).find(r => r.id === id);
  if (!rec) return;
  document.getElementById('drawer-subtitle').textContent = `${ENTITY_SCHEMAS[entity]?.label || entity} 360° View`;
  document.getElementById('drawer-title').textContent = rec.title || rec.name || rec.company;
  const entries = Object.entries(rec).filter(([k]) => !['id', 'color', 'avatar', 'image'].includes(k));
  document.getElementById('drawer-body').innerHTML = `
    ${(rec.avatar || rec.image) ? `<div>${imgTag(rec.avatar || rec.image, rec.name || rec.title, rec.image ? 'w-full h-40 rounded-xl object-cover' : 'w-16 h-16 rounded-full object-cover ring-4 ring-indigo-50')}</div>` : ''}
    <div class="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden">
      ${entries.map(([k, v]) => `<div class="px-4 py-3 flex items-start justify-between gap-4 text-[13px] bg-white"><span class="text-slate-500 capitalize font-medium">${escapeHtml(k)}</span><span class="text-slate-900 font-semibold text-right">${['value','revenue','price'].includes(k)?formatCurrency(v):escapeHtml(v)}</span></div>`).join('')}
    </div>
  `;
  document.getElementById('drawer-footer').innerHTML = `
    ${entity === 'leads' && rec.status !== 'Converted' ? `<button onclick="openConvertLeadModal('${id}')" class="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold mr-auto">Convert to Deal</button>` : ''}
    ${entity === 'documents' ? `<button onclick="closeDetailDrawer(); openDocPreviewModal('${id}')" class="px-3.5 py-2 rounded-xl bg-primary-soft text-primary text-[13px] font-semibold mr-auto">Live Preview</button>` : ''}
    <button onclick="closeDetailDrawer(); confirmDeleteRecord('${entity}', '${id}')" class="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-[13px] font-semibold">Delete</button>
    <button onclick="closeDetailDrawer(); openCrudModal('${entity}', '${id}')" class="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold shadow-brand-glow">Edit</button>
  `;
  document.getElementById('detail-drawer-backdrop').classList.remove('hidden');
  document.getElementById('detail-drawer').classList.remove('translate-x-full');
}
function closeDetailDrawer() { document.getElementById('detail-drawer-backdrop').classList.add('hidden'); document.getElementById('detail-drawer').classList.add('translate-x-full'); }

let confirmCallback = null;
function openConfirmModal(title, msg, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = msg;
  confirmCallback = onConfirm;
  const m = document.getElementById('confirm-modal'); m.classList.remove('hidden'); m.classList.add('flex');
}
function closeConfirmModal() { const m = document.getElementById('confirm-modal'); m.classList.add('hidden'); m.classList.remove('flex'); confirmCallback = null; }
document.getElementById('confirm-action-btn').addEventListener('click', () => { const fn = confirmCallback; closeConfirmModal(); if (fn) fn(); });

function confirmDeleteRecord(entity, id) {
  openConfirmModal('Delete Record', 'Permanently remove this record? You can undo right after.', () => {
    captureUndoSnapshot();
    appState[entity] = appState[entity].filter(r => r.id !== id);
    saveState();
    renderCurrentView();
    showToast('Record deleted.', 'success', true);
  });
}
function confirmResetData() { openConfirmModal('Reset Default Data', 'Restore all Heroes CRM v2.0 datasets to factory defaults?', resetDefaultData); }

function openProModal() { const m = document.getElementById('pro-modal'); m.classList.remove('hidden'); m.classList.add('flex'); }
function closeProModal() { const m = document.getElementById('pro-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
function openShortcutsModal() { const m = document.getElementById('shortcuts-modal'); m.classList.remove('hidden'); m.classList.add('flex'); }
function closeShortcutsModal() { const m = document.getElementById('shortcuts-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }

function toggleDropdown(id) {
  const el = document.getElementById(id);
  const isHidden = el.classList.contains('hidden');
  closeAllDropdowns();
  if (isHidden) el.classList.remove('hidden');
}
function closeAllDropdowns() {
  ['quick-create-menu', 'notif-menu', 'profile-menu', 'date-range-menu', 'dash-filter-menu'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
}

function showToast(message, type = 'success', allowUndo = false) {
  const container = document.getElementById('toast-container');
  const colors = { success: 'bg-slate-900 text-white border-emerald-500/40', info: 'bg-slate-900 text-white border-indigo-500/40', warning: 'bg-amber-600 text-white border-amber-400' };
  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl border text-[13px] font-medium animate-view ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <div class="flex items-center gap-2.5"><i data-lucide="${type==='success'?'check-circle-2':'info'}" class="w-4 h-4 shrink-0 ${type==='success'?'text-emerald-400':'text-indigo-400'}"></i><span>${escapeHtml(message)}</span></div>
    ${allowUndo ? `<button onclick="performUndo(); this.closest('div').remove();" class="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-amber-300 font-bold text-[11.5px] shrink-0">Undo</button>` : ''}
  `;
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.25s'; setTimeout(() => toast.remove(), 260); }, allowUndo ? 5500 : 3200);
}

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(); }
  if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { e.preventDefault(); openShortcutsModal(); }
  if (e.key === 'Escape') { closeCommandPalette(); closeCrudModal(); closeDetailDrawer(); closeConfirmModal(); closeProModal(); closeEmailComposer(); closeConvertLeadModal(); closeQuoteModal(); closeDocPreviewModal(); closeRepModal(); closeShortcutsModal(); closeAllDropdowns(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.relative')) closeAllDropdowns(); });

/* =========================================================
   12. BOOTSTRAP APPLICATION
   ========================================================= */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sp-dialpad').innerHTML = [...'123456789*0#'].map(key =>
    `<button type="button" onclick="dialKey('${key}')" class="py-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-primary font-bold text-slate-700 border border-slate-200/70 transition-colors">${key}</button>`
  ).join('');
  applyTheme(appState.theme);
  syncProfileUI();
  renderNotifications();
  renderSidebarNav();
  renderCurrentView();
});
