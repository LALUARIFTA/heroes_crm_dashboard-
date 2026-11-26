/* =========================================================
   4. KPI CALCULATIONS, DATE SCALING & COUNT-UP
   ========================================================= */
const DATE_SCALE = {
  'May 12 – May 18, 2025': 1.0,
  'Today': 0.18,
  'Last 7 Days': 0.92,
  'This Month': 1.15,
  'This Quarter': 1.45,
  'This Year': 2.1
};

function computeMetrics() {
  const scale = DATE_SCALE[appState.dateRange] || 1.0;
  const df = appState.dashFilters || { rep: 'ALL', stage: 'ALL', minVal: 0 };
  const filteredDeals = appState.deals.filter(d =>
    (df.rep === 'ALL' || d.owner === df.rep) &&
    (df.stage === 'ALL' || d.stage === df.stage) &&
    Number(d.value) >= Number(df.minVal || 0)
  );

  const totalLeads = Math.round((1240 + appState.leads.length) * (scale === 1 ? 1 : (0.5 + scale * 0.5)));
  const openDeals = Math.round((74 + filteredDeals.filter(d => d.stage !== 'Closed Won').length) * (scale === 1 ? 1 : (0.6 + scale * 0.4)));
  const closedWonSum = filteredDeals.filter(d => d.stage === 'Closed Won').reduce((s, d) => s + Number(d.value), 0);
  const revenueMTD = Math.round((314900 + closedWonSum) * scale);
  const annualTarget = Number(appState.profile.annualTarget || 1000000);
  const achieved = Math.min(annualTarget, Math.round((598000 + closedWonSum) * Math.min(scale, 1.25)));
  const targetPct = Math.min(100, Math.round((achieved / annualTarget) * 100));
  return { totalLeads, openDeals, revenueMTD, annualTarget, achieved, remaining: Math.max(0, annualTarget - achieved), targetPct, filteredDeals };
}

function animateCountUps() {
  document.querySelectorAll('[data-countup]').forEach(el => {
    const target = Number(el.dataset.countup);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 500;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/* =========================================================
   5. HTML5 DRAG-AND-DROP ENGINE (DASHBOARD & DEALS KANBAN)
   ========================================================= */
let draggedDealId = null;

function handleDealDragStart(e, dealId) {
  draggedDealId = dealId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dealId);
  e.currentTarget.classList.add('dnd-dragging');
}
function handleDealDragEnd(e) {
  e.currentTarget.classList.remove('dnd-dragging');
  document.querySelectorAll('.dnd-dropzone-active').forEach(el => el.classList.remove('dnd-dropzone-active'));
}
function handleStageDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('dnd-dropzone-active');
}
function handleStageDragLeave(e) {
  e.currentTarget.classList.remove('dnd-dropzone-active');
}
function handleStageDrop(e, newStage) {
  e.preventDefault();
  e.currentTarget.classList.remove('dnd-dropzone-active');
  const id = draggedDealId || e.dataTransfer.getData('text/plain');
  draggedDealId = null;
  const deal = appState.deals.find(d => d.id === id);
  if (!deal || deal.stage === newStage) return;

  captureUndoSnapshot();
  const oldStage = deal.stage;
  deal.stage = newStage;
  if (newStage === 'Closed Won') deal.probability = 100;
  appState.activities.unshift({
    id: 'act' + Date.now(),
    title: newStage === 'Closed Won' ? 'Deal Won 🎉' : `Moved to ${newStage}`,
    company: deal.company,
    type: 'Document',
    status: 'Completed',
    time: 'Just now',
    owner: appState.profile.name,
    notes: `${deal.title} moved from ${oldStage} to ${newStage} (${formatCurrency(deal.value)}).`
  });
  saveState();
  renderCurrentView();
  if (newStage === 'Closed Won') {
    showToast(`🎉 Deal Won! ${deal.company} (${formatCurrency(deal.value)}) closed!`, 'success', true);
  } else {
    showToast(`Moved "${deal.company}" to ${newStage}`, 'info', true);
  }
}

/* =========================================================
   6. DASHBOARD VIEW (1:1 CLONE + DND + LIVE WIDGETS)
   ========================================================= */
function renderDashboard() {
  const m = computeMetrics();
  const firstName = appState.profile.name.split(' ')[0];
  const df = appState.dashFilters || { rep: 'ALL', stage: 'ALL', minVal: 0 };

  const stages = [
    { name: 'Prospecting', bg: 'bg-primary', cls: 'chevron-first', extraBase: 15, totalBase: 157000 },
    { name: 'Qualification', bg: 'bg-[#2563EB]', cls: 'chevron-mid', extraBase: 19, totalBase: 230000 },
    { name: 'Proposal', bg: 'bg-[#1E1B4B]', cls: 'chevron-mid', extraBase: 13, totalBase: 163000 },
    { name: 'Negotiation', bg: 'bg-[#F59E0B]', cls: 'chevron-mid', extraBase: 7, totalBase: 40000 },
    { name: 'Closed Won', bg: 'bg-[#10B981]', cls: 'chevron-last', extraBase: 17, totalBase: 344000 }
  ];

  const pipelineColsHtml = stages.map(st => {
    const stageDeals = m.filteredDeals.filter(d => d.stage === st.name);
    const stageTotal = st.totalBase + stageDeals.reduce((s, d) => s + Number(d.value), 0);
    const dealCount = st.extraBase + stageDeals.length;
    const top3 = stageDeals.slice(0, 3);
    const moreCount = Math.max(0, dealCount - top3.length);
    return `
      <div ondragover="handleStageDragOver(event)" ondragleave="handleStageDragLeave(event)" ondrop="handleStageDrop(event, '${st.name}')"
           class="min-w-[138px] flex-1 flex flex-col p-1 transition-colors rounded-xl">
        <div class="${st.bg} ${st.cls} text-white px-3 py-2.5 select-none">
          <div class="text-[12px] font-bold leading-tight truncate">${st.name}</div>
          <div class="text-[10.5px] text-white/80 mt-0.5">${dealCount} Deals</div>
        </div>
        <div class="text-[12.5px] font-bold text-slate-800 px-1.5 py-2 border-b border-slate-100">${formatCurrency(stageTotal)}</div>
        <div class="space-y-2 pt-2 flex-1">
          ${top3.map(d => `
            <div draggable="true" ondragstart="handleDealDragStart(event, '${d.id}')" ondragend="handleDealDragEnd(event)"
                 onclick="openDetailDrawer('deals', '${d.id}')"
                 class="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover:bg-primary-soft transition-colors group cursor-grab active:cursor-grabbing border border-transparent hover:border-indigo-200">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-xs" style="background:${d.color || '#4F46E5'}">${escapeHtml(d.company.slice(0, 2).toUpperCase())}</span>
              <div class="min-w-0">
                <div class="text-[11.5px] font-semibold text-slate-800 truncate group-hover:text-primary">${escapeHtml(d.company)}</div>
                <div class="text-[10.5px] text-slate-500">${formatCurrency(d.value)}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <button onclick="navigateTo('deals', '${st.name}')" class="mt-2 text-left px-1.5 text-[11px] font-medium text-slate-400 hover:text-primary transition-colors">+${moreCount} more</button>
      </div>
    `;
  }).join('');

  const months = [
    { m: 'Jan', v: 32, active: true }, { m: 'Feb', v: 46, active: true }, { m: 'Mar', v: 58, active: true },
    { m: 'Apr', v: 64, active: true }, { m: 'May', v: 92, active: true }, { m: 'Jun', v: 78, active: true },
    { m: 'Jul', v: 54, active: false }, { m: 'Aug', v: 40, active: false }, { m: 'Sep', v: 26, active: false },
    { m: 'Oct', v: 18, active: false }, { m: 'Nov', v: 15, active: false }, { m: 'Dec', v: 12, active: false }
  ];

  const leadNew = 530 + appState.leads.filter(l => l.status === 'New').length;
  const leadContacted = 322 + appState.leads.filter(l => l.status === 'Contacted').length;
  const leadQualified = 246 + appState.leads.filter(l => l.status === 'Qualified' || l.status === 'Converted').length;
  const leadUnqualified = 143 + appState.leads.filter(l => l.status === 'Unqualified').length;
  const leadSum = leadNew + leadContacted + leadQualified + leadUnqualified;

  const donutC = 2 * Math.PI * 46;
  const seg1 = (leadNew / leadSum) * donutC;
  const seg2 = (leadContacted / leadSum) * donutC;
  const seg3 = (leadQualified / leadSum) * donutC;
  const seg4 = (leadUnqualified / leadSum) * donutC;

  const semiC = Math.PI * 64;
  const semiOffset = semiC * (1 - m.targetPct / 100);
  const kpiRingC = 2 * Math.PI * 22;
  const kpiRingOffset = kpiRingC * (1 - m.targetPct / 100);

  const actColors = { Email: 'bg-primary', Document: 'bg-[#161433]', Download: 'bg-[#F59E0B]', Meeting: 'bg-[#7C3AED]', Call: 'bg-emerald-600', Note: 'bg-sky-600' };
  const actIcons = { Email: 'mail-open', Document: 'file-text', Download: 'download', Meeting: 'calendar-check', Call: 'phone-call', Note: 'sticky-note' };

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="animate-view space-y-5">
      <!-- Welcome Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-[22px] sm:text-[24px] font-bold tracking-tight text-slate-900">Welcome back, ${escapeHtml(firstName)}! 👋</h1>
          <p class="text-[13px] text-slate-500 mt-0.5">Here's what's happening with your sales today.</p>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- Date Range Picker -->
          <div class="relative">
            <button onclick="toggleDropdown('date-range-menu')" class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-[13px] font-medium text-slate-700 hover:border-primary shadow-2xs transition-colors">
              <i data-lucide="calendar" class="w-4 h-4 text-slate-400"></i>
              <span>${escapeHtml(appState.dateRange)}</span>
              <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400"></i>
            </button>
            <div id="date-range-menu" class="hidden absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-40 text-[13px]">
              ${Object.keys(DATE_SCALE).map(r => `
                <button onclick="setDateRange('${r}')" class="w-full px-3.5 py-2 text-left hover:bg-primary-soft hover:text-primary ${appState.dateRange === r ? 'font-semibold text-primary bg-primary-soft/60' : 'text-slate-700'}">${r}</button>
              `).join('')}
            </div>
          </div>
          <!-- Interactive Filters Popover -->
          <div class="relative">
            <button onclick="toggleDropdown('dash-filter-menu')" class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border ${(df.rep!=='ALL'||df.stage!=='ALL'||df.minVal>0) ? 'border-primary text-primary bg-primary-soft/40' : 'border-slate-200/90 text-slate-700'} text-[13px] font-medium hover:border-primary shadow-2xs transition-colors">
              <i data-lucide="filter" class="w-4 h-4"></i>
              <span>Filters</span>
            </button>
            <div id="dash-filter-menu" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-40 text-[12.5px] space-y-3">
              <div class="font-bold text-slate-900">Filter Dashboard Pipeline</div>
              <div>
                <label class="block text-slate-500 mb-1">Sales Rep</label>
                <select onchange="updateDashFilter('rep', this.value)" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                  <option value="ALL">All Reps</option>
                  ${appState.team.map(t => `<option value="${t.name}" ${df.rep===t.name?'selected':''}>${t.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-slate-500 mb-1">Stage</label>
                <select onchange="updateDashFilter('stage', this.value)" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                  <option value="ALL">All Stages</option>
                  ${stages.map(s => `<option value="${s.name}" ${df.stage===s.name?'selected':''}>${s.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-slate-500 mb-1">Min Deal Value: <strong class="text-primary">${formatCurrency(df.minVal)}</strong></label>
                <input type="range" min="0" max="50000" step="5000" value="${df.minVal}" onchange="updateDashFilter('minVal', Number(this.value))" class="w-full accent-indigo-600" />
              </div>
              <button onclick="resetDashFilters()" class="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">Reset Filters</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ROW 1: 4 KPI CARDS (CLICKABLE DRILL-DOWNS) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div onclick="navigateTo('leads')" class="stagger-1 cursor-pointer bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card card-lift flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shrink-0 shadow-brand-glow"><i data-lucide="users" class="w-5 h-5"></i></div>
          <div class="min-w-0">
            <div class="text-[12.5px] font-medium text-slate-500">Total Leads</div>
            <div class="text-[24px] font-extrabold text-slate-900 leading-tight mt-0.5" data-countup="${m.totalLeads}">${m.totalLeads.toLocaleString()}</div>
            <div class="text-[11.5px] font-medium text-emerald-600 mt-1">↑ 18.6% <span class="text-slate-400 font-normal">vs last week</span></div>
          </div>
        </div>
        <div onclick="navigateTo('deals')" class="stagger-2 cursor-pointer bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card card-lift flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-[#161433] text-white flex items-center justify-center shrink-0"><i data-lucide="briefcase" class="w-5 h-5"></i></div>
          <div class="min-w-0">
            <div class="text-[12.5px] font-medium text-slate-500">Open Deals</div>
            <div class="text-[24px] font-extrabold text-slate-900 leading-tight mt-0.5" data-countup="${m.openDeals}">${m.openDeals}</div>
            <div class="text-[11.5px] font-medium text-emerald-600 mt-1">↑ 12.4% <span class="text-slate-400 font-normal">vs last week</span></div>
          </div>
        </div>
        <div onclick="navigateTo('reports')" class="stagger-3 cursor-pointer bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card card-lift flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shrink-0"><i data-lucide="dollar-sign" class="w-5 h-5"></i></div>
          <div class="min-w-0">
            <div class="text-[12.5px] font-medium text-slate-500">Revenue (MTD)</div>
            <div class="text-[24px] font-extrabold text-slate-900 leading-tight mt-0.5" data-countup="${m.revenueMTD}" data-prefix="$">${formatCurrency(m.revenueMTD)}</div>
            <div class="text-[11.5px] font-medium text-emerald-600 mt-1">↑ 22.7% <span class="text-slate-400 font-normal">vs last month</span></div>
          </div>
        </div>
        <div onclick="navigateTo('forecast')" class="stagger-4 cursor-pointer bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card card-lift flex items-center justify-between gap-3">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-12 h-12 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0"><i data-lucide="target" class="w-5 h-5"></i></div>
            <div class="min-w-0">
              <div class="text-[12.5px] font-medium text-slate-500">Sales Target</div>
              <div class="text-[24px] font-extrabold text-slate-900 leading-tight mt-0.5" data-countup="${m.targetPct}" data-suffix="%">${m.targetPct}%</div>
              <div class="text-[11.5px] text-slate-500 mt-1">$${Math.round(m.achieved/1000)}K / $${(m.annualTarget/1000000).toFixed(1)}M</div>
            </div>
          </div>
          <svg class="w-14 h-14 -rotate-90 shrink-0" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#EEF2FF" stroke-width="5.5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--primary)" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="${kpiRingC}" stroke-dashoffset="${kpiRingOffset}" class="svg-ring-progress" />
          </svg>
        </div>
      </div>

      <!-- ROW 2: 7 COLS DEALS PIPELINE (DRAG & DROP) + 5 COLS SALES TARGET PROGRESS -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col">
          <div class="flex items-center justify-between mb-3.5">
            <div>
              <h2 class="text-[15.5px] font-bold text-slate-900">Deals Pipeline</h2>
              <p class="text-[11px] text-slate-400">Drag deals across stages to update pipeline live</p>
            </div>
            <button onclick="navigateTo('deals')" class="text-[12.5px] font-semibold text-primary hover:underline">View All</button>
          </div>
          <div class="overflow-x-auto pb-1 flex-1">
            <div class="flex gap-1 min-w-[700px]">${pipelineColsHtml}</div>
          </div>
        </div>

        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-[15.5px] font-bold text-slate-900">Sales Target Progress</h2>
            <button onclick="navigateTo('reports')" class="text-[12.5px] font-semibold text-primary hover:underline">View Report</button>
          </div>
          <div class="flex items-center justify-between gap-2 my-1">
            <div class="space-y-2.5">
              <div><div class="text-[11px] text-slate-400 font-medium">Annual Target</div><div class="text-[17px] font-extrabold text-slate-900">${formatCurrency(m.annualTarget)}</div></div>
              <div><div class="text-[11px] text-slate-400 font-medium">Achieved</div><div class="text-[15px] font-bold text-primary">${formatCurrency(m.achieved)}</div></div>
              <div><div class="text-[11px] text-slate-400 font-medium">Remaining</div><div class="text-[15px] font-bold text-[#F59E0B]">${formatCurrency(m.remaining)}</div></div>
            </div>
            <div class="relative w-40 h-28 flex items-end justify-center shrink-0">
              <svg class="w-40 h-24 overflow-visible" viewBox="0 0 160 95">
                <path d="M 16 84 A 64 64 0 0 1 144 84" fill="none" stroke="#E2E8F0" stroke-width="13" stroke-linecap="round" />
                <path d="M 16 84 A 64 64 0 0 1 144 84" fill="none" stroke="var(--primary)" stroke-width="13" stroke-linecap="round" stroke-dasharray="${semiC}" stroke-dashoffset="${semiOffset}" class="svg-ring-progress" />
              </svg>
              <div class="absolute bottom-2 text-center">
                <div class="text-[22px] font-extrabold text-slate-900 leading-none">${m.targetPct}%</div>
                <div class="text-[10.5px] text-slate-500 mt-1">of annual target</div>
              </div>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 relative">
            <div class="absolute left-0 right-0 top-[46%] border-t border-dashed border-indigo-300 pointer-events-none flex justify-end">
              <span class="text-[9.5px] font-semibold text-primary bg-white px-1 -mt-2">Target</span>
            </div>
            <div class="flex items-end justify-between gap-1.5 h-24 pt-2">
              ${months.map(mo => `
                <div class="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">$${mo.v}K</div>
                  <div class="w-full rounded-t-md transition-all duration-300 ${mo.active ? 'bg-primary opacity-90 group-hover:opacity-100' : 'bg-slate-200 group-hover:bg-slate-300'}" style="height:${mo.v}%"></div>
                  <span class="text-[9.5px] text-slate-400 font-medium">${mo.m}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- ROW 3: 3-COL GRID (LEADS OVERVIEW, TEAM PERFORMANCE, FOLLOW-UP REMINDERS) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Leads Overview -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[15.5px] font-bold text-slate-900">Leads Overview</h2>
            <button onclick="navigateTo('leads')" class="text-[12.5px] font-semibold text-primary hover:underline">View All</button>
          </div>
          <div class="flex items-center justify-between gap-4 my-auto">
            <div class="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg class="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" fill="none" stroke="var(--primary)" stroke-width="14" stroke-dasharray="${seg1} ${donutC}" stroke-dashoffset="0" class="hover:opacity-80 cursor-pointer"><title>New: ${leadNew}</title></circle>
                <circle cx="60" cy="60" r="46" fill="none" stroke="#3B82F6" stroke-width="14" stroke-dasharray="${seg2} ${donutC}" stroke-dashoffset="${-seg1}" class="hover:opacity-80 cursor-pointer"><title>Contacted: ${leadContacted}</title></circle>
                <circle cx="60" cy="60" r="46" fill="none" stroke="#F59E0B" stroke-width="14" stroke-dasharray="${seg3} ${donutC}" stroke-dashoffset="${-(seg1+seg2)}" class="hover:opacity-80 cursor-pointer"><title>Qualified: ${leadQualified}</title></circle>
                <circle cx="60" cy="60" r="46" fill="none" stroke="#CBD5E1" stroke-width="14" stroke-dasharray="${seg4} ${donutC}" stroke-dashoffset="${-(seg1+seg2+seg3)}" class="hover:opacity-80 cursor-pointer"><title>Unqualified: ${leadUnqualified}</title></circle>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span class="text-[18px] font-extrabold text-slate-900 leading-none">${leadSum.toLocaleString()}</span>
                <span class="text-[10px] text-slate-400 mt-1">Total Leads</span>
              </div>
            </div>
            <div class="flex-1 space-y-2.5 text-[12px]">
              <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-primary"></span>New</span><span class="font-semibold text-slate-800">${leadNew} <span class="text-slate-400 font-normal">(${((leadNew/leadSum)*100).toFixed(1)}%)</span></span></div>
              <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>Contacted</span><span class="font-semibold text-slate-800">${leadContacted} <span class="text-slate-400 font-normal">(${((leadContacted/leadSum)*100).toFixed(1)}%)</span></span></div>
              <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>Qualified</span><span class="font-semibold text-slate-800">${leadQualified} <span class="text-slate-400 font-normal">(${((leadQualified/leadSum)*100).toFixed(1)}%)</span></span></div>
              <div class="flex items-center justify-between"><span class="flex items-center gap-2 text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-slate-300"></span>Unqualified</span><span class="font-semibold text-slate-800">${leadUnqualified} <span class="text-slate-400 font-normal">(${((leadUnqualified/leadSum)*100).toFixed(1)}%)</span></span></div>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px]">
            <div><span class="text-slate-400 block text-[11px]">Conversion Rate</span><span class="text-[16px] font-extrabold text-primary">18.7%</span></div>
            <span class="text-emerald-600 font-semibold">↑ 3.2% <span class="text-slate-400 font-normal">vs last week</span></span>
          </div>
        </div>

        <!-- Team Performance -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
          <div class="flex items-center justify-between mb-3.5">
            <h2 class="text-[15.5px] font-bold text-slate-900">Team Performance</h2>
            <button onclick="navigateTo('reports')" class="text-[12.5px] font-semibold text-primary hover:underline">View All</button>
          </div>
          <div class="space-y-3">
            ${appState.team.map((rep, idx) => {
              const pct = Math.round((rep.revenue / rep.target) * 100);
              return `
                <div onclick="openRepModal('${rep.id}')" class="flex items-center gap-3 p-1 -mx-1 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                  ${imgTag(rep.avatar, rep.name, 'w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-slate-100')}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between text-[12px] mb-1">
                      <span class="font-semibold text-slate-800 truncate">${escapeHtml(rep.name)}</span>
                      <span class="font-bold text-slate-700">${formatCurrency(rep.revenue)}</span>
                    </div>
                    <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div class="h-full rounded-full ${idx < 3 ? 'bg-primary' : 'bg-amber-500'}" style="width:${Math.min(100, pct)}%"></div>
                    </div>
                  </div>
                  <span class="text-[11.5px] font-semibold text-slate-500 w-9 text-right">${pct}%</span>
                </div>
              `;
            }).join('')}
          </div>
          <button onclick="navigateTo('reports')" class="mt-3 pt-2.5 border-t border-slate-100 text-center text-[12.5px] font-semibold text-primary hover:underline w-full">View Full Leaderboard</button>
        </div>

        <!-- Follow-up Reminders -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
          <div class="flex items-center justify-between mb-3.5">
            <h2 class="text-[15.5px] font-bold text-slate-900">Follow-up Reminders</h2>
            <button onclick="navigateTo('calendar')" class="text-[12.5px] font-semibold text-primary hover:underline">View All</button>
          </div>
          <div class="divide-y divide-slate-100">
            ${appState.meetings.filter(mt => mt.status !== 'Completed').slice(0, 4).map((mt, idx) => {
              const timeColors = ['text-rose-500', 'text-primary', 'text-amber-600', 'text-emerald-600'];
              return `
                <div class="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <input type="checkbox" title="Mark Complete" onchange="completeReminder('${mt.id}')" class="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                    <span class="text-[11px] font-bold w-14 shrink-0 ${timeColors[idx % 4]}">${escapeHtml(mt.time)}</span>
                    <div class="min-w-0">
                      <div class="text-[12.5px] font-semibold text-slate-800 truncate">${escapeHtml(mt.company)}</div>
                      <div class="text-[11px] text-slate-500 truncate">${escapeHtml(mt.title)}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button onclick="openSoftphone('${escapeHtml(mt.company)}', '${escapeHtml(mt.phone || '+1 (415) 555-0192')}')" title="Call via Softphone" class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors"><i data-lucide="phone" class="w-3.5 h-3.5"></i></button>
                    <button onclick="openCrudModal('meetings', '${mt.id}')" title="Reschedule" class="w-7 h-7 rounded-lg bg-primary-soft text-primary hover:opacity-80 flex items-center justify-center transition-colors"><i data-lucide="calendar" class="w-3.5 h-3.5"></i></button>
                  </div>
                </div>
              `;
            }).join('') || `<div class="py-8 text-center text-[12.5px] text-slate-400">All follow-ups completed! 🎉</div>`}
          </div>
        </div>
      </div>

      <!-- ROW 4: 7 COLS CUSTOMER ACTIVITY TIMELINE + 5 COLS REVENUE FORECAST -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-[15.5px] font-bold text-slate-900">Customer Activity Timeline</h2>
            <button onclick="navigateTo('activities')" class="text-[12.5px] font-semibold text-primary hover:underline">View All</button>
          </div>
          <div class="overflow-x-auto pb-1">
            <div class="relative flex items-start justify-between gap-3 min-w-[560px] px-2">
              <div class="absolute top-5 left-10 right-10 h-0.5 bg-slate-200 pointer-events-none"></div>
              ${appState.activities.slice(0, 5).map(act => `
                <button onclick="openDetailDrawer('activities', '${act.id}')" class="relative z-10 flex flex-col items-center text-center w-28 group">
                  <div class="w-10 h-10 rounded-full ${actColors[act.type] || 'bg-primary'} text-white flex items-center justify-center shadow-md ring-4 ring-white group-hover:scale-110 transition-transform">
                    <i data-lucide="${actIcons[act.type] || 'activity'}" class="w-4 h-4"></i>
                  </div>
                  <div class="text-[12px] font-semibold text-slate-800 mt-2.5 group-hover:text-primary truncate w-full">${escapeHtml(act.title)}</div>
                  <div class="text-[11px] text-slate-500 truncate w-full">${escapeHtml(act.company)}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(act.time)}</div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col justify-between">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-[15.5px] font-bold text-slate-900">Revenue Forecast</h2>
            <button onclick="navigateTo('forecast')" class="text-[12.5px] font-semibold text-primary hover:underline">View Report</button>
          </div>
          <div class="flex items-end justify-between gap-3">
            <div class="space-y-2.5 shrink-0">
              <div>
                <div class="text-[11px] text-slate-400 font-medium">Predicted Revenue</div>
                <div class="text-[18px] font-extrabold text-slate-900">$1,234,000</div>
                <div class="text-[10.5px] font-semibold text-emerald-600">↑ 16.3% <span class="text-slate-400 font-normal">vs last mo</span></div>
              </div>
              <div><div class="text-[10.5px] text-slate-400">Best Case</div><div class="text-[14px] font-bold text-primary">$1,520,000</div></div>
              <div><div class="text-[10.5px] text-slate-400">Commit (Weighted)</div><div class="text-[14px] font-bold text-slate-800">$1,102,000</div></div>
            </div>
            <div class="flex-1 min-w-[150px] relative">
              <div class="absolute right-0 -top-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-brand-glow leading-tight text-center">
                $1.23M<div class="text-[8.5px] font-normal text-indigo-100">Predicted</div>
              </div>
              <svg class="w-full h-32 overflow-visible" viewBox="0 0 200 110">
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.28"/>
                    <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <path d="M 10 88 L 45 72 L 80 58 L 115 62 L 150 38 L 188 46 L 188 100 L 10 100 Z" fill="url(#forecastGrad)" />
                <path d="M 10 88 L 45 72 L 80 58 L 115 62 L 150 38 L 188 46" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-dasharray="4 3" />
                ${[[10,88,'May','$680K'],[45,72,'Jun','$810K'],[80,58,'Jul','$940K'],[115,62,'Aug','$910K'],[150,38,'Sep','$1.23M'],[188,46,'Oct','$1.15M']].map(([x,y,mo,val]) => `
                  <g class="cursor-pointer"><circle cx="${x}" cy="${y}" r="3.5" fill="#FFFFFF" stroke="var(--primary)" stroke-width="2"><title>${mo}: ${val}</title></circle><text x="${x}" y="108" text-anchor="middle" fill="#94A3B8" font-size="8.5">${mo}</text></g>
                `).join('')}
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- ROW 5: INTERACTIVE RECENT DEALS TABLE -->
      <div id="dashboard-deals-table-wrap"></div>
    </div>
  `;

  renderInteractiveTable('dashboard-deals-table-wrap', getDealsTableConfig('dashboard_deals', 'Recent Deals & Pipeline Records'));
  lucide.createIcons();
  animateCountUps();
}

function setDateRange(range) {
  appState.dateRange = range;
  saveState();
  closeAllDropdowns();
  renderDashboard();
  showToast(`Timeframe updated to "${range}"`, 'info');
}

function updateDashFilter(key, val) {
  appState.dashFilters = appState.dashFilters || { rep: 'ALL', stage: 'ALL', minVal: 0 };
  appState.dashFilters[key] = val;
  saveState();
  renderDashboard();
}

function resetDashFilters() {
  appState.dashFilters = { rep: 'ALL', stage: 'ALL', minVal: 0 };
  saveState();
  closeAllDropdowns();
  renderDashboard();
  showToast('Dashboard filters reset.', 'info');
}

function completeReminder(id) {
  captureUndoSnapshot();
  const mt = appState.meetings.find(m => m.id === id);
  if (!mt) return;
  mt.status = 'Completed';
  appState.activities.unshift({
    id: 'act' + Date.now(), title: 'Follow-up Completed', company: mt.company, type: 'Meeting', status: 'Completed', time: 'Just now', owner: appState.profile.name, notes: `Completed: ${mt.title}`
  });
  saveState();
  renderCurrentView();
  showToast(`Completed follow-up with ${mt.company}`, 'success', true);
}

function openRepModal(repId) {
  const rep = appState.team.find(t => t.id === repId);
  if (!rep) return;
  const repDeals = appState.deals.filter(d => d.owner === rep.name);
  const pct = Math.round((rep.revenue / rep.target) * 100);
  document.getElementById('rep-modal-content').innerHTML = `
    <div class="p-5 border-b border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        ${imgTag(rep.avatar, rep.name, 'w-12 h-12 rounded-full object-cover ring-2 ring-indigo-100')}
        <div><h3 class="font-bold text-[16px] text-slate-900">${escapeHtml(rep.name)}</h3><p class="text-[12px] text-slate-500">${escapeHtml(rep.role)}</p></div>
      </div>
      <button onclick="closeRepModal()" class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><i data-lucide="x" class="w-4 h-4"></i></button>
    </div>
    <div class="p-5 space-y-4 text-[13px]">
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="p-3 rounded-xl bg-slate-50"><div class="text-[11px] text-slate-400">Revenue</div><div class="font-extrabold text-slate-900 mt-0.5">${formatCurrency(rep.revenue)}</div></div>
        <div class="p-3 rounded-xl bg-slate-50"><div class="text-[11px] text-slate-400">Quota</div><div class="font-extrabold text-primary mt-0.5">${pct}%</div></div>
        <div class="p-3 rounded-xl bg-slate-50"><div class="text-[11px] text-slate-400">Win Rate</div><div class="font-extrabold text-emerald-600 mt-0.5">${rep.winRate}</div></div>
      </div>
      <div>
        <div class="text-[12px] font-bold text-slate-700 mb-2">Active Deals (${repDeals.length})</div>
        <div class="space-y-1.5 max-h-44 overflow-y-auto">
          ${repDeals.map(d => `<div class="flex items-center justify-between p-2 rounded-lg bg-slate-50"><span>${escapeHtml(d.company)}</span><span class="font-bold text-primary">${formatCurrency(d.value)}</span></div>`).join('')}
        </div>
      </div>
    </div>
  `;
  const m = document.getElementById('rep-modal');
  m.classList.remove('hidden'); m.classList.add('flex');
  lucide.createIcons();
}
function closeRepModal() { const m = document.getElementById('rep-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }

