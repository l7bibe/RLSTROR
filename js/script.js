/**
 * RLSTORE - Universal Enterprise OS
 * Synchronized Global Matrix
 * XML-Only Data Restructuring
 * Refactored: Zero try/catch, pure defensive architecture.
 */

// ===============================
// GLOBAL APPLICATION STATE
// ===============================
const AppState = {
    products: [],       
    suppliers: [],      
    orders: [],         
    inventory: [],      
    reports: [],        
    notifications: [],  
    unreadNotifications: 0, 

    currentUser: {
        name: 'Loading...',
        role: 'System',
        avatar: ''
    },

    itemsPerPage: 8,
    currentPage: 1,

    filters: {
        productsSearch: '',
        suppliersSearch: '',
        activeSupplierCategory: 'All',
        ordersSearch: '',
        ordersStatus: 'all',
        inventorySearch: '',
        inventoryStatus: 'all',
        invCategory: 'all',
        invStatus: 'all',
        reportsSearch: '',
        reportStatus: 'all',
        explorerSearch: '',
        explorerView: 'all',
        yieldMetric: 'category'
    },

    charts: {} 
};

window.AppState = AppState;

// ===============================
// XML CORE ENGINE (PURE DEFENSIVE)
// ===============================

/**
 * Step 1: Read XML File (Async)
 */
async function lireFichier(chemin) {
    console.log(`[XML] Reading Resource: ${chemin}`);
    const response = await fetch(`${chemin}?v=${Date.now()}`);
    
    if (!response.ok) {
        console.error(`[XML] HTTP Error ${response.status} for ${chemin}`);
        return null;
    }
    
    const xmlString = await response.text();
    if (!xmlString) {
        console.warn(`[XML] Empty payload received from ${chemin}`);
        return null;
    }
    
    return xmlString;
}

/**
 * Step 2: XSD Validation (No try/catch)
 */
function valider(xmlString, xsdString) {
    if (!xmlString || !xsdString) {
        console.warn('[XML] Validation skipped: missing source or schema.');
        return false;
    }

    console.log('[XML] Performing Schema Integrity Check...');
    
    if (typeof xmllint !== 'undefined' && xmllint.validateXML) {
        const result = xmllint.validateXML({
            xml: xmlString,
            schema: xsdString
        });
        return result.errors === null;
    }
    
    console.warn('[XML] xmllint engine not found, proceeding with soft validation.');
    return true; // Fallback to avoid blocking
}

/**
 * Step 3: DOM Conversion
 */
function convertirEnDOM(xmlString, resourceName = 'Unknown') {
    if (!xmlString) return null;
    console.log(`[XML] Converting String to DOM Node Tree for: ${resourceName}`);
    const parser = new DOMParser();
    const dom = parser.parseFromString(xmlString, "application/xml");
    
    const parseError = dom.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
        console.error(`[XML] DOM Parsing Error detected in resource: ${resourceName}`);
        console.error("Error Content Snapshot:", xmlString.substring(0, 100));
        return null;
    }
    
    return dom;
}

// ===============================
// PARSERS (XML -> JS OBJECTS)
// ===============================

function parseSystemConfig(dom) {
    if (!dom) return;
    const userNode = dom.getElementsByTagName('currentUser')[0];
    const settingsNode = dom.getElementsByTagName('appSettings')[0];

    if (userNode) {
        AppState.currentUser = {
            name: userNode.getElementsByTagName('name')[0]?.textContent || 'Anonymous',
            role: userNode.getElementsByTagName('role')[0]?.textContent || 'Guest',
            avatar: userNode.getElementsByTagName('avatar')[0]?.textContent || ''
        };
        updateUserProfileUI();
    }

    if (settingsNode) {
        AppState.itemsPerPage = parseInt(settingsNode.getElementsByTagName('itemsPerPage')[0]?.textContent) || 8;
        const theme = settingsNode.getElementsByTagName('theme')[0]?.textContent;
        if (theme === 'dark') document.body.classList.add('dark-theme');
    }
}

function parseProducts(dom) {
    if (!dom) return [];
    const products = [];
    const productNodes = dom.getElementsByTagName('product');

    for (let node of productNodes) {
        products.push({
            id: node.getAttribute('id') || 'Unknown',
            name: node.getElementsByTagName('name')[0]?.textContent || 'unnamed',
            category: node.getElementsByTagName('category')[0]?.textContent || 'General',
            price: parseFloat(node.getElementsByTagName('price')[0]?.textContent) || 0,
            stock: parseInt(node.getElementsByTagName('stock')[0]?.textContent) || 0,
            minStock: parseInt(node.getElementsByTagName('minStock')[0]?.textContent) || 5,
            status: node.getElementsByTagName('status')[0]?.textContent || 'Unknown',
            image: node.getElementsByTagName('image')[0]?.textContent || '',
            sku: node.getElementsByTagName('sku')[0]?.textContent || 'N/A'
        });
    }
    return products;
}

function parseSuppliers(dom) {
    if (!dom) return [];
    const suppliers = [];
    const nodes = dom.getElementsByTagName('supplier');

    for (let node of nodes) {
        const name = node.getElementsByTagName('name')[0]?.textContent || 'Vendor';
        suppliers.push({
            id: node.getElementsByTagName('id')[0]?.textContent || 'S-000',
            name: name,
            category: node.getElementsByTagName('category')[0]?.textContent || 'Uncategorized',
            contact: node.getElementsByTagName('contact')[0]?.textContent || 'N/A',
            email: node.getElementsByTagName('email')[0]?.textContent || 'N/A',
            phone: node.getElementsByTagName('phone')[0]?.textContent || 'N/A',
            address: node.getElementsByTagName('address')[0]?.textContent || 'N/A',
            status: node.getElementsByTagName('status')[0]?.textContent || 'Active',
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fff`
        });
    }
    return suppliers;
}

function parseOrders(dom) {
    if (!dom) return [];
    const orders = [];
    const nodes = dom.getElementsByTagName('order');
    for (let node of nodes) {
        orders.push({
            id: node.getElementsByTagName('id')[0]?.textContent || 'O-000',
            customer: node.getElementsByTagName('customer')[0]?.textContent || 'Unknown',
            date: node.getElementsByTagName('date')[0]?.textContent || '2026-01-01',
            total: parseFloat(node.getElementsByTagName('total')[0]?.textContent) || 0,
            status: node.getElementsByTagName('status')[0]?.textContent || 'Pending',
            items: parseInt(node.getElementsByTagName('items')[0]?.textContent) || 0
        });
    }
    return orders;
}

function parseNotifications(dom) {
    if (!dom) return [];
    const notifications = [];
    const nodes = dom.getElementsByTagName('notification');
    for (let node of nodes) {
        notifications.push({
            id: parseInt(node.getAttribute('id')) || 0,
            type: node.getElementsByTagName('type')[0]?.textContent || 'Info',
            message: node.getElementsByTagName('message')[0]?.textContent || '',
            time: node.getElementsByTagName('time')[0]?.textContent || 'Just now'
        });
    }
    return notifications;
}

function parseReports(dom) {
    if (!dom) return [];
    const reports = [];
    const nodes = dom.getElementsByTagName('report');
    for (let node of nodes) {
        reports.push({
            id: node.getAttribute('id') || 'R-000',
            title: node.getElementsByTagName('title')[0]?.textContent || 'Report',
            date: node.getElementsByTagName('date')[0]?.textContent || '2026-01-01',
            type: node.getElementsByTagName('type')[0]?.textContent || 'General'
        });
    }
    return reports;
}

// ===============================
// RENDERING & UI (DEFENSIVE)
// ===============================

function updateUserProfileUI() {
    const nameEl = document.querySelector('.user-info h6');
    const roleEl = document.querySelector('.user-info p');
    const avatarEl = document.querySelector('.profile-pill img');

    if (nameEl) nameEl.textContent = AppState.currentUser.name;
    if (roleEl) roleEl.textContent = AppState.currentUser.role;
    if (avatarEl && AppState.currentUser.avatar) avatarEl.src = AppState.currentUser.avatar;
}

function renderInventoryView() {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;

    const filtered = AppState.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(AppState.filters.inventorySearch) || 
                            p.id.toLowerCase().includes(AppState.filters.inventorySearch);
        
        let matchesStatus = true;
        if (AppState.filters.inventoryStatus !== 'all') {
            if (AppState.filters.inventoryStatus === 'In Stock') matchesStatus = p.stock > p.minStock;
            else if (AppState.filters.inventoryStatus === 'Low Stock') matchesStatus = p.stock <= p.minStock && p.stock > 0;
            else if (AppState.filters.inventoryStatus === 'Out of Stock') matchesStatus = p.stock === 0;
        }
        return matchesSearch && matchesStatus;
    });

    const totalAssets = AppState.products.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = AppState.products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const alertCount = AppState.products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
    const outCount = AppState.products.filter(p => p.stock === 0).length;

    animateCounter('inv-stat-total', totalAssets);
    animateCounter('inv-stat-value', totalValue, true);
    animateCounter('inv-stat-alerts', alertCount);
    animateCounter('inv-stat-out', outCount);

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center p-5 text-muted">No tactical assets found in current sector.</div>';
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(p => {
        const stockPct = Math.min((p.stock / (p.minStock * 5)) * 100, 100);
        let statusText = 'In Stock';
        let statusClass = 'fill-success';
        let pillClass = 'bg-success bg-opacity-10 text-success';

        if (p.stock === 0) {
            statusText = 'Out of Stock';
            statusClass = 'fill-danger';
            pillClass = 'bg-danger bg-opacity-10 text-danger';
        } else if (p.stock <= p.minStock) {
            statusText = 'Low Stock';
            statusClass = 'fill-warning';
            pillClass = 'bg-warning bg-opacity-10 text-warning';
        }

        const card = `
            <div class="col-md-6 col-xl-4 animate-slide-in">
                <div class="inventory-card glass p-4 rounded-4 h-100 position-relative">
                    <div class="d-flex gap-3 mb-4">
                        <div class="inventory-img-container shadow-sm border border-white border-opacity-10">
                            <img src="${p.image}" class="inventory-img" alt="${p.name}"
                                 onerror="this.src='https://images.unsplash.com/photo-1550985616-10810253b84d?q=80&w=200&auto=format&fit=crop'">
                        </div>
                        <div class="flex-grow-1 min-w-0">
                            <h6 class="fw-extrabold mb-1 text-truncate">${p.name}</h6>
                            <p class="extra-small text-muted mb-2">ID: ${p.id} | SKU: ${p.sku}</p>
                            <span class="inventory-status-pill ${pillClass}">${statusText}</span>
                        </div>
                    </div>

                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-end mb-2">
                            <span class="extra-small text-muted fw-bold">STOCK LEVEL</span>
                            <span class="fw-extrabold text-primary">${p.stock} <small class="text-muted fw-normal">/ Units</small></span>
                        </div>
                        <div class="stock-meter">
                            <div class="stock-meter-fill ${statusClass}" style="width: ${stockPct}%"></div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center pt-3 border-top border-white border-opacity-10">
                        <div class="d-flex gap-2">
                            <button class="btn-inventory-action ripple" title="Stock Transfer"><i class="fa-solid fa-right-left extra-small"></i></button>
                            <button class="btn-inventory-action ripple" title="Inventory Audit"><i class="fa-solid fa-clipboard-check extra-small"></i></button>
                        </div>
                        <button class="btn btn-premium btn-sm py-1 px-3 ripple" style="font-size: 0.7rem; height: 32px;">RESTOCK</button>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

function renderOrdersView() {
    const grid = document.getElementById('ordersGrid');
    if (!grid) return;

    const filtered = AppState.orders.filter(o => {
        const matchesSearch = o.id.toLowerCase().includes(AppState.filters.ordersSearch) || 
                            o.customer.toLowerCase().includes(AppState.filters.ordersSearch);
        const matchesStatus = AppState.filters.ordersStatus === 'all' || o.status === AppState.filters.ordersStatus;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center p-5 text-muted">No operational orders found in pipeline.</div>';
        return;
    }

    grid.innerHTML = '';
    filtered.forEach(o => {
        let statusClass = 'status-pending';
        let progressClass = 'bg-pending';
        
        if (o.status === 'Processing') { statusClass = 'status-processing'; progressClass = 'bg-processing'; }
        else if (o.status === 'Shipped') { statusClass = 'status-shipped'; progressClass = 'bg-shipped'; }
        else if (o.status === 'Delivered') { statusClass = 'status-delivered'; progressClass = 'bg-delivered'; }
        else if (o.status === 'Cancelled') { statusClass = 'status-cancelled'; progressClass = 'bg-cancelled'; }

        const card = `
            <div class="col-md-6 col-xl-4 animate-slide-in">
                <div class="order-card glass p-4 rounded-4 h-100 position-relative">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <span class="extra-small text-muted fw-bold">ORDER REF:</span>
                            <h5 class="fw-extrabold mb-0">#${o.id}</h5>
                        </div>
                        <span class="order-status-badge ${statusClass}">${o.status}</span>
                    </div>

                    <div class="mb-4">
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <div class="order-meta-icon"><i class="fa-solid fa-user"></i></div>
                            <span class="fw-bold small">${o.customer}</span>
                        </div>
                    </div>

                    <div class="order-progress-bg">
                        <div class="order-progress-fill ${progressClass}"></div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center pt-3 border-top border-white border-opacity-10">
                        <span class="fw-extrabold text-success">$${o.total.toFixed(2)}</span>
                        <div class="d-flex gap-2">
                            <button class="order-action-btn ripple"><i class="fa-solid fa-file-lines small"></i></button>
                            <button class="order-action-btn ripple"><i class="fa-solid fa-truck-fast small"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

function renderSuppliersTable() {
    const grid = document.getElementById('suppliersGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtered = AppState.suppliers.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(AppState.filters.suppliersSearch) || 
                            s.contact.toLowerCase().includes(AppState.filters.suppliersSearch);
        const matchesCategory = AppState.filters.activeSupplierCategory === 'All' || 
                               s.category === AppState.filters.activeSupplierCategory;
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center p-5 text-muted">No suppliers found.</div>';
        return;
    }
    
    filtered.forEach(s => {
        const statusClass = s.status === 'Active' ? 'status-active' : 'status-inactive';
        const card = `
            <div class="col-md-6 col-xl-4 animate-slide-in">
                <div class="supplier-card glass p-4 rounded-4 h-100">
                    <div class="d-flex justify-content-between align-items-start mb-4">
                        <div class="supplier-avatar-container">
                            <img src="${s.image}" class="supplier-img" alt="${s.name}">
                        </div>
                        <span class="supplier-status-badge ${statusClass}">${s.status}</span>
                    </div>
                    <h5 class="fw-extrabold mb-1">${s.name}</h5>
                    <p class="text-primary extra-small fw-bold mb-3">${s.category}</p>
                    <div class="d-flex justify-content-between align-items-center pt-3 border-top border-white border-opacity-10 mt-auto">
                        <div class="d-flex gap-2">
                            <button class="supplier-action-btn"><i class="fa-solid fa-eye small"></i></button>
                        </div>
                        <button class="supplier-action-btn btn-delete" onclick="deleteSupplier('${s.id}')"><i class="fa-solid fa-trash-can small"></i></button>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    
    const filtered = AppState.products.filter(p => 
        p.name.toLowerCase().includes(AppState.filters.productsSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(AppState.filters.productsSearch.toLowerCase())
    );

    const start = (AppState.currentPage - 1) * AppState.itemsPerPage;
    const paginated = filtered.slice(start, start + AppState.itemsPerPage);

    tbody.innerHTML = paginated.map(p => `
        <tr class="animate-slide-in">
            <td><img src="${p.image}" class="product-img-table" onerror="this.src='https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=100&auto=format&fit=crop'"></td>
            <td><div class="fw-bold">${p.name}</div><div class="text-muted extra-small">${p.id}</div></td>
            <td>${p.category}</td>
            <td class="fw-bold text-primary">$${p.price.toFixed(2)}</td>
            <td>${p.stock} Units</td>
            <td><span class="badge-premium ${getStatusClass(p.status)}">${p.status}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-light border p-2" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen text-primary"></i></button>
                <button class="btn btn-sm btn-light border p-2 text-danger" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    renderPagination(filtered.length);
}

function renderReportsView() {
    const section = document.getElementById('reports');
    if (!section || !section.classList.contains('active')) return;

    animateCounter('report-kpi-revenue', AppState.orders.reduce((sum, o) => sum + o.total, 0), true);
    animateCounter('report-kpi-orders', AppState.orders.length);
    animateCounter('report-kpi-lowstock', AppState.products.filter(p => p.stock <= p.minStock).length);
    animateCounter('report-kpi-suppliers', AppState.suppliers.filter(s => s.status === 'Active').length);

    updateYieldChart();
    updateSupplierChart();
    renderExplorerTable();
}

function renderExplorerTable() {
    const tbody = document.querySelector('#reportExplorerTable tbody');
    if (!tbody) return;

    const type = AppState.filters.explorerView;
    const term = AppState.filters.explorerSearch;
    let data = [];

    if (type === 'all' || type === 'products') {
        AppState.products.forEach(p => data.push({ 
            id: p.id, desc: p.name, cat: p.category, val: `$${p.price.toFixed(2)}`, stat: p.stock + ' Units', date: '2026-05-10'
        }));
    }
    if (type === 'all' || type === 'orders') {
        AppState.orders.forEach(o => data.push({ 
            id: o.id, desc: o.customer, cat: 'Order', val: `$${o.total.toFixed(2)}`, stat: o.status, date: o.date
        }));
    }
    if (type === 'all' || type === 'suppliers') {
        AppState.suppliers.forEach(s => data.push({ 
            id: s.id, desc: s.name, cat: s.category, val: s.contact, stat: s.status, date: '2026-05-10'
        }));
    }

    const filtered = data.filter(item => 
        item.id.toLowerCase().includes(term) || 
        item.desc.toLowerCase().includes(term) || 
        item.cat.toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-5 text-muted">No entities found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr class="animate-slide-in">
            <td class="ps-4 fw-bold text-primary">${item.id}</td>
            <td>${item.desc}</td>
            <td><span class="badge bg-white bg-opacity-5 text-muted fw-normal">${item.cat}</span></td>
            <td class="fw-bold">${item.val}</td>
            <td><span class="report-status-pill bg-primary text-white">${item.stat}</span></td>
            <td class="text-end pe-4 text-muted">${item.date}</td>
        </tr>
    `).join('');
}

// ===============================
// CHARTS & ANALYTICS (DEFENSIVE)
// ===============================

function initCharts() {
    const revCtx = document.getElementById('revenueChart')?.getContext('2d');
    if (revCtx) {
        const labels = AppState.orders.map(o => o.date).slice(-7);
        const data = AppState.orders.map(o => o.total).slice(-7);

        if (AppState.charts.revenue) AppState.charts.revenue.destroy();
        AppState.charts.revenue = new Chart(revCtx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['No Data'],
                datasets: [{
                    label: 'Revenue',
                    data: data.length ? data : [0],
                    borderColor: '#3b82f6',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
                }
            }
        });
    }

    const stockCtx = document.getElementById('stockChart')?.getContext('2d');
    if (stockCtx) {
        const categories = [...new Set(AppState.products.map(p => p.category))];
        const data = categories.length ? categories.map(cat => 
            AppState.products.filter(p => p.category === cat).reduce((sum, p) => sum + p.stock, 0)
        ) : [0];

        if (AppState.charts.stock) AppState.charts.stock.destroy();
        AppState.charts.stock = new Chart(stockCtx, {
            type: 'doughnut',
            data: {
                labels: categories.length ? categories : ['No Data'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, color: '#94a3b8' } }
                }
            }
        });
    }
}

function updateYieldChart() {
    const ctx = document.getElementById('reportYieldChart')?.getContext('2d');
    if (!ctx) return;

    const metric = document.getElementById('yieldMetricSelect')?.value || 'category';
    let labels = [];
    let values = [];

    if (metric === 'category') {
        const cats = [...new Set(AppState.products.map(p => p.category))];
        labels = cats;
        values = cats.map(cat => AppState.products.filter(p => p.category === cat).reduce((sum, p) => sum + p.stock, 0));
    } else {
        labels = ['In Stock', 'Low Stock', 'Out of Stock'];
        values = [
            AppState.products.filter(p => p.stock > p.minStock).length,
            AppState.products.filter(p => p.stock <= p.minStock && p.stock > 0).length,
            AppState.products.filter(p => p.stock === 0).length
        ];
    }

    if (AppState.charts.reportYield) AppState.charts.reportYield.destroy();

    AppState.charts.reportYield = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
        }
    });
}

function updateSupplierChart() {
    const ctx = document.getElementById('reportSupplierChart')?.getContext('2d');
    if (!ctx) return;

    const topSuppliers = AppState.suppliers.slice(0, 5);
    const labels = topSuppliers.map(s => s.name);
    const data = topSuppliers.map(s => AppState.products.filter(p => p.category === s.category).length);

    if (AppState.charts.reportSupplier) AppState.charts.reportSupplier.destroy();

    AppState.charts.reportSupplier = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'SKUs', data: data, backgroundColor: 'rgba(59, 130, 246, 0.4)', borderColor: '#3b82f6', borderWidth: 1 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#94a3b8' } },
                y: { ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ===============================
// HELPERS & ACTIONS (DEFENSIVE)
// ===============================

function animateCounter(id, target, isCurrency = false) {
    const el = document.getElementById(id);
    if (!el) return;

    let current = 0;
    const duration = 1000;
    const steps = 40;
    const increment = target / steps;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = isCurrency ? `$${current.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : Math.floor(current);
    }, duration / steps);
}

function showToast(title, message, type = 'info') {
    let container = document.getElementById('toastWrapper');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastWrapper';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toastId = 'toast-' + Date.now();
    const bg = type === 'success' ? 'bg-success' : (type === 'danger' ? 'bg-danger' : 'bg-primary');

    const html = `
        <div id="${toastId}" class="toast glass-dark border-0 rounded-4" role="alert">
            <div class="toast-header bg-transparent border-0 text-white pb-0">
                <div class="p-1 rounded-circle me-2 ${bg}" style="width:10px; height:10px;"></div>
                <strong class="me-auto small">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body text-white opacity-75 extra-small">${message}</div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    if (typeof bootstrap !== 'undefined' && toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
        toast.show();
    }
}

function getStatusClass(status) {
    if (status === 'Available' || status === 'Delivered' || status === 'Shipped') return 'status-available';
    if (status === 'Low Stock' || status === 'Processing') return 'status-low';
    return 'status-out';
}

function internalSwitchView(viewId) {
    document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('active'));
    const activeLink = document.querySelector(`#sidebar ul li a[onclick*="${viewId}"]`);
    if (activeLink) activeLink.parentElement.classList.add('active');

    document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.classList.add('active');
        if (viewId === 'stock-mgmt') renderInventoryView();
        if (viewId === 'reports') renderReportsView();
        if (viewId === 'products') renderProductsTable();
        if (viewId === 'orders') renderOrdersView();
        if (viewId === 'suppliers') renderSuppliersTable();
    }
}

function renderPagination(totalItems) {
    const pagination = document.getElementById('productsPagination');
    const info = document.getElementById('productsPaginationInfo');
    if (!pagination || !info) return;

    const totalPages = Math.ceil(totalItems / AppState.itemsPerPage);
    info.textContent = `Showing products 1 to ${Math.min(totalItems, AppState.itemsPerPage)}`;
    pagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === AppState.currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>`;
        pagination.appendChild(li);
    }
}

// ===============================
// MASTER INITIALIZATION
// ===============================

async function main() {
    console.log('[SYSTEM] Initiating Master Synchronization (Zero-Exception Mode)...');
    
    internalSwitchView('dashboard');

    const resources = [
        { name: 'config', xml: '/data/system_config.xml', xsd: '/schema/system_config.xsd', parser: parseSystemConfig },
        { name: 'notifications', xml: '/data/notifications.xml', xsd: '/schema/notifications.xsd', parser: parseNotifications },
        { name: 'products', xml: '/data/products.xml', xsd: '/schema/products.xsd', parser: parseProducts },
        { name: 'suppliers', xml: '/data/suppliers.xml', xsd: '/schema/suppliers.xsd', parser: parseSuppliers },
        { name: 'orders', xml: '/data/orders.xml', xsd: '/schema/orders.xsd', parser: parseOrders },
        { name: 'reports', xml: '/data/reports.xml', xsd: '/schema/reports.xsd', parser: parseReports }
    ];

    for (let res of resources) {
        const xmlString = await lireFichier(res.xml);
        const xsdString = await lireFichier(res.xsd);
        
        if (xmlString && xsdString) {
            valider(xmlString, xsdString);
            const dom = convertirEnDOM(xmlString, res.name);
            if (dom) {
                const parsedData = res.parser(dom);
                if (parsedData) AppState[res.name] = parsedData;
            }
        }
    }

    animateCounter('stat-total-products', AppState.products.length);
    animateCounter('stat-low-stock', AppState.products.filter(p => p.stock <= p.minStock).length);
    animateCounter('stat-total-suppliers', AppState.suppliers.length);
    animateCounter('stat-total-orders', AppState.orders.length);
    animateCounter('stat-revenue', AppState.orders.reduce((sum, o) => sum + o.total, 0), true);

    initCharts();
    renderProductsTable();
    renderSuppliersTable();
    renderOrdersView();
}

// Global Exports
window.switchView = (viewId) => { internalSwitchView(viewId); return false; };
window.changePage = (p) => { AppState.currentPage = p; renderProductsTable(); return false; };
window.filterInventory = () => { AppState.filters.inventorySearch = document.getElementById('inventorySearch')?.value.toLowerCase() || ''; renderInventoryView(); };
window.filterOrders = () => { AppState.filters.ordersSearch = document.getElementById('orderSearch')?.value.toLowerCase() || ''; renderOrdersView(); };
window.filterSuppliers = () => { AppState.filters.suppliersSearch = document.getElementById('supplierSearch')?.value.toLowerCase() || ''; renderSuppliersTable(); };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
else main();
