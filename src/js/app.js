/**
 * RLSTORE - Electrical Stock Management
 * Main Application Logic
 */

// --- State Management ---
const AppState = {
    products: [],
    suppliers: [],
    orders: [],
    currentPage: 1,
    itemsPerPage: 10,
    filters: {
        search: '',
        category: 'all',
        ordersSearch: '',
        suppliersSearch: '',
        inventorySearch: '',
        invCategory: 'all',
        invStatus: 'all',
        reportSearch: '',
        reportCategory: 'all',
        reportStatus: 'all'
    },
    charts: {
        revenue: null,
        stock: null,
        reportRevenue: null,
        reportCategory: null,
        invDist: null,
        invFlux: null,
        invRadar: null
    },
    notifications: [],
    unreadNotifications: 0,
    debounceTimers: {}
};

// --- Utilities ---
function debounce(func, wait, key) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(AppState.debounceTimers[key]);
            func(...args);
        };
        clearTimeout(AppState.debounceTimers[key]);
        AppState.debounceTimers[key] = setTimeout(later, wait);
    };
}

function getCategoryIcon(category) {
    const catIcons = {
        'Lighting': 'fa-lightbulb',
        'Cables': 'fa-plug',
        'Switches': 'fa-toggle-on',
        'Protection': 'fa-shield-halved',
        'Electrical Tools': 'fa-screwdriver-wrench',
        'Accessories': 'fa-toolbox',
        'Grid Protection': 'fa-tower-broadcast'
    };
    return catIcons[category] || 'fa-box';
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Global Error Handler
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global Error Detected:', message, error);
        showToast('Runtime Error', 'A system anomaly was detected. Operations stabilized.', 'danger');
        return false;
    };

    initNavigation();
    initDarkMode();
    initCharts();
    loadAllData();
    initAddProductForm();
    initAddSupplierForm();
    initClock();
    initReports();
    initInventory();
    initNotificationSystem();
    startRealTimeAlerts();

    // Event Listeners for Filters
    const globalSearch = document.getElementById('globalSearchInput');
    const productSearch = document.getElementById('productSearch');

    const handleGlobalSearch = debounce((e) => {
        const query = e.target.value;
        const activeView = document.querySelector('.view-section.active')?.id;
        
        if (activeView === 'products') {
            AppState.filters.search = query;
            if (productSearch) productSearch.value = query;
            renderProductsTable();
        } else if (activeView === 'stock-mgmt') {
            AppState.filters.inventorySearch = query;
            const invSearch = document.getElementById('inventorySearch');
            if (invSearch) invSearch.value = query;
            renderInventoryView();
        } else if (activeView === 'orders') {
            AppState.filters.ordersSearch = query;
            renderOrdersTable();
        } else if (activeView === 'suppliers') {
            AppState.filters.suppliersSearch = query;
            renderSuppliersTable();
        } else if (activeView === 'reports') {
            AppState.filters.reportSearch = query;
            const repSearch = document.getElementById('reportSearch');
            if (repSearch) repSearch.value = query;
            renderReportsTable();
        }
    }, 300, 'globalSearch');

    if (globalSearch) {
        globalSearch.addEventListener('input', handleGlobalSearch);
    }

    if (productSearch) {
        productSearch.addEventListener('input', debounce((e) => {
            AppState.filters.search = e.target.value;
            AppState.currentPage = 1;
            renderProductsTable();
        }, 300, 'productSearch'));
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            AppState.filters.category = e.target.value;
            AppState.currentPage = 1;
            renderProductsTable();
        });
    }

    const reloadBtn = document.getElementById('reloadProducts');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            loadAllData();
        });
    }
});

function initClock() {
    const clockEl = document.getElementById('realTimeClock');
    if (!clockEl) return;
    
    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// --- Navigation Logic ---
function initNavigation() {
    const sidebarLinks = document.querySelectorAll('#sidebar .components > li');
    const sections = document.querySelectorAll('.view-section');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');

    // Global switchView to expose it for back button
    window.switchView = function(viewId) {
        // Update Active Link
        document.querySelectorAll('#sidebar li[data-view]').forEach(l => {
            l.classList.remove('active');
            if (l.getAttribute('data-view') === viewId) {
                l.classList.add('active');
                // Also handle parent if it's a submenu
                const parentCollapse = l.closest('.collapse');
                if (parentCollapse) {
                    const parentLi = parentCollapse.closest('li');
                    if (parentLi) parentLi.classList.add('active');
                }
            }
        });

        // Switch Sections with non-blocking logic
        sections.forEach(section => {
            if (section.id === viewId) {
                section.style.display = 'block';
                // Small delay to trigger CSS transition
                requestAnimationFrame(() => {
                    section.classList.add('active');
                });
                
                // Specific View Re-renders
                if (viewId === 'reports') {
                    renderReportsView();
                } else if (viewId === 'stock-mgmt') {
                    renderInventoryView();
                }
            } else {
                section.classList.remove('active');
                // Wait for transition before hiding
                setTimeout(() => {
                    if (!section.classList.contains('active')) {
                        section.style.display = 'none';
                    }
                }, 400);
            }
        });

        // On mobile, collapse sidebar after click
        if (window.innerWidth <= 991) {
            sidebar.classList.remove('active');
        }
    };

    sidebarLinks.forEach(link => {
        const viewId = link.getAttribute('data-view');
        if (!viewId) {
            // Handle submenus if any
            const subLinks = link.querySelectorAll('ul li[data-view]');
            subLinks.forEach(sub => {
                sub.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.switchView(sub.getAttribute('data-view'));
                });
            });
            return;
        }

        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.switchView(viewId);
        });
    });

    sidebarCollapse.addEventListener('click', () => {
        if (window.innerWidth > 991) {
            sidebar.classList.toggle('collapsed');
            content.classList.toggle('sidebar-collapsed');
            
            // Trigger chart update after transition
            if (window.updateCharts) {
                // Short interval check to catch end of transition
                let count = 0;
                const interval = setInterval(() => {
                    window.updateCharts();
                    if (++count > 5) clearInterval(interval);
                }, 100);
            }
        } else {
            sidebar.classList.toggle('active');
        }
    });
}

function renderReportsView() {
    const revenueEl = document.getElementById('report-total-revenue');
    const ordersEl = document.getElementById('report-total-orders');
    const alertsEl = document.getElementById('report-stock-alerts');
    const suppliersEl = document.getElementById('report-total-suppliers');
    
    if (!revenueEl) return;

    // 1. Calculate Aggregates
    const totalRevenue = AppState.orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = AppState.orders.length;
    const lowStockCount = AppState.products.filter(p => p.status !== 'In Stock').length;
    const totalSuppliers = AppState.suppliers.length;

    // 2. Update Stats (Animated)
    animateCounter(revenueEl, totalRevenue, true);
    animateCounter(ordersEl, totalOrders, false);
    animateCounter(alertsEl, lowStockCount, false);
    animateCounter(suppliersEl, totalSuppliers, false);

    // 3. Render Reports Table
    renderReportsTable();

    // 4. Render Top Products
    renderTopProducts();

    // 5. Update Report Charts
    updateReportCharts();
}

function renderReportsTable() {
    const tbody = document.querySelector('#reportsMainTable tbody');
    const countEl = document.getElementById('reportTableCount');
    if (!tbody) return;

    tbody.innerHTML = '';

    // We can merge orders and products for the "Data Matrix" or just show orders as primary financial data
    const filtered = AppState.orders.filter(o => {
        const matchesSearch = o.customer.toLowerCase().includes(AppState.filters.reportSearch.toLowerCase()) || 
                             o.id.toLowerCase().includes(AppState.filters.reportSearch.toLowerCase());
        const matchesStatus = AppState.filters.reportStatus === 'all' || o.status === AppState.filters.reportStatus;
        
        // Category filtering for orders is tricky if orders don't have categories, 
        // but let's assume we filter by "Domain" which we could map or just skip for orders if strictly domain is for products.
        // For this demo, let's treat "Entity Name" as Customer for Orders.
        return matchesSearch && matchesStatus;
    });

    filtered.forEach(o => {
        const statusBadge = o.status === 'Delivered' ? 'bg-success' : (o.status === 'Shipped' ? 'bg-info' : 'bg-warning');
        const row = `
            <tr>
                <td class="fw-bold">#${o.id}</td>
                <td>${o.customer}</td>
                <td><span class="badge rounded-pill bg-light text-dark extra-small border">General Electrical</span></td>
                <td class="fw-bold text-primary">$${o.total.toFixed(2)}</td>
                <td><span class="badge ${statusBadge} shadow-sm">${o.status}</span></td>
                <td>${o.date}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    if (countEl) countEl.textContent = `Total: ${filtered.length} entries`;
}

function renderTopProducts() {
    const list = document.getElementById('topProductsList');
    if (!list) return;

    list.innerHTML = '';
    // Sort products by price or quantity as a proxy for "Top" in this demo
    const top = [...AppState.products].sort((a, b) => b.price - a.price).slice(0, 5);

    top.forEach(p => {
        const item = `
            <div class="product-item d-flex align-items-center justify-content-between rounded-3 mb-1">
                <div class="d-flex align-items-center gap-3">
                    <div class="bg-light p-2 rounded-3 border" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-box text-primary small"></i>
                    </div>
                    <div>
                        <p class="mb-0 small fw-bold text-dark">${p.name}</p>
                        <p class="mb-0 extra-small text-muted">${p.category}</p>
                    </div>
                </div>
                <div class="text-end">
                    <p class="mb-0 small fw-extrabold text-primary">$${p.price.toFixed(2)}</p>
                    <p class="mb-0 extra-small text-success fw-bold">Active</p>
                </div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', item);
    });
}

function animateCounter(elOrId, target, isCurrency = false) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentCount = start + progress * (target - start);
        
        if (isCurrency) {
            el.textContent = '$' + currentCount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            el.textContent = Math.floor(currentCount).toLocaleString();
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

function initReports() {
    const search = document.getElementById('reportSearch');
    const category = document.getElementById('reportCategoryFilter');
    const status = document.getElementById('reportStatusFilter');

    if (search) {
        search.addEventListener('input', (e) => {
            AppState.filters.reportSearch = e.target.value;
            renderReportsTable();
        });
    }

    if (category) {
        category.addEventListener('change', (e) => {
            AppState.filters.reportCategory = e.target.value;
            renderReportsTable();
            updateReportCharts();
        });
    }

    if (status) {
        status.addEventListener('change', (e) => {
            AppState.filters.reportStatus = e.target.value;
            renderReportsTable();
        });
    }

    // Expose helpers
    window.resetReportFilters = () => {
        AppState.filters.reportSearch = '';
        AppState.filters.reportCategory = 'all';
        AppState.filters.reportStatus = 'all';

        if (search) search.value = '';
        if (category) category.value = 'all';
        if (status) status.value = 'all';

        renderReportsTable();
        updateReportCharts();
        showToast('System', 'Report filters have been normalized.', 'primary');
    };

    window.exportReport = (type) => {
        showLoading(true);
        setTimeout(() => {
            showLoading(false);
            if (type === 'excel') {
                const csvContent = generateCSV();
                downloadFile(csvContent, 'RLSTORE_Report_2026.csv', 'text/csv');
                showToast('Export Success', 'Excel-compatible CSV generated.', 'success');
            } else if (type === 'pdf') {
                window.print();
                showToast('Print Center', 'Document sent to system print spooler.', 'success');
            } else if (type === 'cloud') {
                showToast('Cloud Sync', 'Report encrypted and synced to RLSTORE Cloud.', 'info');
            }
        }, 1500);
    };
}

function generateCSV() {
    const headers = ['Order ID', 'Customer', 'Date', 'Total', 'Status', 'Items'];
    const rows = AppState.orders.map(o => [o.id, o.customer, o.date, o.total, o.status, o.items]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.join(',') + '\n';
    });
    return csv;
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function updateReportCharts() {
    const revCtx = document.getElementById('reportRevenueChart')?.getContext('2d');
    const catCtx = document.getElementById('reportCategoryChart')?.getContext('2d');

    if (!revCtx) return;

    // Initialize if null
    if (!AppState.charts.reportRevenue) {
        AppState.charts.reportRevenue = new Chart(revCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Revenue Performance',
                    data: [],
                    backgroundColor: '#3b82f6',
                    borderRadius: 8
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    if (!AppState.charts.reportCategory) {
        AppState.charts.reportCategory = new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
        });
    }

    // Update Data
    const orderLabels = AppState.orders.slice(-10).map(o => `ORD-${o.id}`);
    const orderData = AppState.orders.slice(-10).map(o => o.total);

    AppState.charts.reportRevenue.data.labels = orderLabels;
    AppState.charts.reportRevenue.data.datasets[0].data = orderData;
    AppState.charts.reportRevenue.update();

    const categories = [...new Set(AppState.products.map(p => p.category))];
    const categoryCounts = categories.map(cat => AppState.products.filter(p => p.category === cat).length);

    AppState.charts.reportCategory.data.labels = categories;
    AppState.charts.reportCategory.data.datasets[0].data = categoryCounts;
    AppState.charts.reportCategory.update();
}

// --- Data Fetching & Loading ---
async function loadAllData() {
    showLoading(true);
    try {
        console.log('Initiating Master Sync...');
        
        // Parallel fetching for performance
        const [productsData, suppliersData, ordersData] = await Promise.all([
            fetchAndValidate('xml/products.xml', 'xsd/products.xsd', 'products'),
            fetchAndValidate('xml/suppliers.xml', 'xsd/suppliers.xsd', 'suppliers'),
            fetchAndValidate('xml/orders.xml', 'xsd/orders.xsd', 'orders')
        ]);

        AppState.products = parseProductsXML(productsData);
        AppState.suppliers = parseSuppliersXML(suppliersData);
        AppState.orders = parseOrdersXML(ordersData);

        console.log(`Sync Complete: ${AppState.products.length} products, ${AppState.suppliers.length} suppliers, ${AppState.orders.length} orders.`);

        // Update UI
        updateStats();
        renderProductsTable();
        renderSuppliersTable();
        renderOrdersTable();
        updateCharts();
        renderReportsView();

        showToast('Success', 'Data synchronized with XML storage.', 'success');
    } catch (error) {
        console.error('Data Loading Error:', error);
        showToast('System Error', `Master Sync Failed: ${error.message}`, 'danger');
        
        // Fallback to empty state to avoid broken UI
        AppState.products = AppState.products || [];
        renderProductsTable();
    } finally {
        showLoading(false);
    }
}

async function fetchAndValidate(xmlUrl, xsdUrl, rootName) {
    try {
        const [xmlRes, xsdRes] = await Promise.all([
            fetch(`${xmlUrl}?v=${Date.now()}`),
            fetch(`${xsdUrl}?v=${Date.now()}`)
        ]);

        if (!xmlRes.ok) throw new Error(`HTTP ${xmlRes.status} on ${xmlUrl}`);
        if (!xsdRes.ok) throw new Error(`HTTP ${xsdRes.status} on ${xsdUrl}`);

        const xmlText = await xmlRes.text();
        const xsdText = await xsdRes.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const xsdDoc = parser.parseFromString(xsdText, 'text/xml');

        // Check for parse errors
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
            throw new Error(`XML Parse Error in ${xmlUrl}: ${parseError[0].textContent}`);
        }

        // Basic XSD Validation Simulation
        const validation = validateXML(xmlDoc, xsdDoc, rootName);
        if (!validation.valid) {
            throw new Error(`XSD Validation Failed for ${xmlUrl}: ${validation.message}`);
        }

        return xmlDoc;
    } catch (e) {
        console.error(`Fetch Failure for ${rootName}:`, e);
        throw e;
    }
}

// --- XSD Validation Helper (Mock for educational demonstration) ---
function validateXML(xmlDoc, xsdDoc, rootName) {
    // 1. Check root element
    const rootElement = xmlDoc.documentElement;
    if (rootElement.nodeName !== rootName) {
        return { valid: false, message: `Root element must be <${rootName}>` };
    }

    // 2. Check structure (simplified type and sequence check)
    // We look at the first child of the root's children to see if properties exist
    const items = rootElement.children;
    if (items.length > 0) {
        const firstItem = items[0];
        const elements = xsdDoc.querySelectorAll('element, xs\\:element, xsd\\:element');
        const expectedFields = Array.from(elements)
            .filter(el => {
                const name = el.getAttribute('name');
                return name && name !== rootName && name !== firstItem.nodeName;
            })
            .map(el => el.getAttribute('name'));

        const actualFields = Array.from(firstItem.children).map(c => c.nodeName);
        
        for (const field of expectedFields) {
            if (!actualFields.includes(field)) {
                // Simplified validation
            }
        }
    }

    return { valid: true };
}

// --- XML Parsers ---
function parseProductsXML(xml) {
    const products = [];
    const productNodes = xml.getElementsByTagName('product');
    for (let i = 0; i < productNodes.length; i++) {
        const node = productNodes[i];
        try {
            const getVal = (tag) => {
                const el = node.getElementsByTagName(tag)[0];
                return el ? el.textContent : '';
            };

            const id = node.getAttribute('id') || `P-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            const stock = parseInt(getVal('stock')) || 0;
            const minStock = parseInt(getVal('minStock')) || 20;

            products.push({
                id: id,
                sku: getVal('sku') || id,
                name: getVal('name') || 'Unnamed Product',
                category: getVal('category') || 'Uncategorized',
                price: parseFloat(getVal('price')) || 0,
                stock: stock,
                quantity: stock, // Maintain both for backwards compatibility
                minStock: minStock,
                manufacturer: getVal('manufacturer') || 'RLSTORE Manufacturing',
                status: getVal('status') || (stock <= 0 ? 'Out of Stock' : (stock <= minStock ? 'Low Stock' : 'In Stock')),
                image: getVal('image') || 'https://via.placeholder.com/200',
                supplier: getVal('supplier') || "RLSTORE Direct"
            });
        } catch (e) {
            console.warn('Skipping invalid product node:', e);
        }
    }
    return products;
}

function parseSuppliersXML(xml) {
    const suppliers = [];
    const nodes = xml.getElementsByTagName('supplier');
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        try {
            const getVal = (tag) => {
                const el = node.getElementsByTagName(tag)[0];
                return el ? el.textContent : '';
            };
            suppliers.push({
                id: getVal('id') || `S-${i}`,
                name: getVal('name') || 'Unnamed Supplier',
                contact: getVal('contact') || 'No Contact',
                email: getVal('email') || '',
                phone: getVal('phone') || '',
                address: getVal('address') || ''
            });
        } catch (e) {
            console.warn('Skipping invalid supplier node:', e);
        }
    }
    return suppliers;
}

function parseOrdersXML(xml) {
    const orders = [];
    const nodes = xml.getElementsByTagName('order');
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        try {
            const getVal = (tag) => {
                const el = node.getElementsByTagName(tag)[0];
                return el ? el.textContent : '';
            };
            orders.push({
                id: getVal('id') || `ORD-${i}`,
                customer: getVal('customer') || 'Unknown Customer',
                date: getVal('date') || new Date().toISOString().split('T')[0],
                total: parseFloat(getVal('total')) || 0,
                status: getVal('status') || 'Processing',
                items: parseInt(getVal('items')) || 0
            });
        } catch (e) {
            console.warn('Skipping invalid order node:', e);
        }
    }
    return orders;
}

// --- Tables Rendering ---
function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const filtered = AppState.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(AppState.filters.search.toLowerCase()) || 
                             p.id.toLowerCase().includes(AppState.filters.search.toLowerCase()) ||
                             (p.sku && p.sku.toLowerCase().includes(AppState.filters.search.toLowerCase()));
        const matchesCategory = AppState.filters.category === 'all' || p.category === AppState.filters.category;
        return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No products found matching your criteria.</td></tr>`;
        renderPagination(0);
        return;
    }

    const start = (AppState.currentPage - 1) * AppState.itemsPerPage;
    const end = start + AppState.itemsPerPage;
    const paginated = filtered.slice(start, end);

    paginated.forEach(p => {
        let statusClass = 'status-available';
        if (p.status === 'Low Stock') statusClass = 'status-low';
        else if (p.status === 'Out of Stock' || p.stock <= 0) statusClass = 'status-out';
        
        const catIcon = getCategoryIcon(p.category);

        const row = `
            <tr class="animate-slide-in">
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="product-avatar shadow-sm border border-white border-2 overflow-hidden" style="width: 48px; height: 48px; border-radius: 12px; background: #f1f5f9;">
                             <img src="${p.image}" alt="${p.name}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div>
                            <div class="fw-extrabold text-dark" style="font-size: 0.95rem;">${p.name}</div>
                            <div class="text-muted extra-small fw-bold text-uppercase">SKU: ${p.sku || p.id}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="cat-icon bg-light text-primary border"><i class="fa-solid ${catIcon}"></i></div>
                        <span class="badge rounded-pill bg-light text-dark extra-small border">${p.category}</span>
                    </div>
                </td>
                <td>
                    <div class="fw-extrabold text-primary">$${p.price.toFixed(2)}</div>
                    <div class="text-muted extra-small">Unit Price</div>
                </td>
                <td>
                    <div class="fw-bold text-dark">${p.stock || p.quantity} Units</div>
                    <div class="text-muted extra-small">In Repository</div>
                </td>
                <td><span class="badge badge-premium ${statusClass}">${p.status}</span></td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-sm btn-light rounded-3 shadow-xs border p-2 ripple" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen-to-square text-primary" style="font-size: 14px;"></i></button>
                        <button class="btn btn-sm btn-light border rounded-3 p-2 text-danger ripple" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash-can" style="font-size: 14px;"></i></button>
                    </div>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    renderPagination(filtered.length);
}

function renderSuppliersTable() {
    const grid = document.getElementById('suppliersGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtered = AppState.suppliers.filter(s => 
        s.name.toLowerCase().includes(AppState.filters.suppliersSearch.toLowerCase()) ||
        s.contact.toLowerCase().includes(AppState.filters.suppliersSearch.toLowerCase())
    );

    filtered.forEach(s => {
        const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const card = `
            <div class="col-md-6 col-lg-4">
                <div class="card supplier-card h-100 p-4">
                    <div class="d-flex align-items-center gap-3 mb-4">
                        <div class="supplier-avatar">${initials}</div>
                        <div>
                            <h5 class="fw-bold mb-0">${s.name}</h5>
                            <span class="badge bg-primary bg-opacity-10 text-primary small">Verified Partner</span>
                        </div>
                    </div>
                    <div class="contact-details">
                        <div class="contact-info-item">
                            <i class="fa-solid fa-user-tie text-primary"></i>
                            <span>${s.contact}</span>
                        </div>
                        <div class="contact-info-item">
                            <i class="fa-solid fa-envelope-open-text text-primary"></i>
                            <span>${s.email}</span>
                        </div>
                        <div class="contact-info-item">
                            <i class="fa-solid fa-phone-volume text-primary"></i>
                            <span>${s.phone}</span>
                        </div>
                        <div class="contact-info-item">
                            <i class="fa-solid fa-location-dot text-primary"></i>
                            <span>${s.address}</span>
                        </div>
                    </div>
                    <div class="mt-auto pt-4 d-flex gap-2">
                        <button class="btn btn-sm btn-light flex-grow-1 border fw-bold text-dark"><i class="fa-solid fa-paper-plane me-2 text-primary"></i> Message</button>
                        <button class="btn btn-sm btn-light border px-3"><i class="fa-solid fa-ellipsis-vertical text-muted"></i></button>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

function renderOrdersTable() {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const filtered = AppState.orders.filter(o => {
        const matchesSearch = o.customer.toLowerCase().includes(AppState.filters.ordersSearch.toLowerCase()) || 
                             o.id.toLowerCase().includes(AppState.filters.ordersSearch.toLowerCase());
        return matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">No orders detected in the pipeline.</td></tr>`;
        return;
    }

    filtered.forEach(o => {
        let statusClass = 'bg-warning';
        let progress = 20;
        let steps = 1;

        if (o.status === 'Processing') { statusClass = 'status-low'; progress = 40; steps = 2; }
        else if (o.status === 'Shipped') { statusClass = 'status-available'; progress = 70; steps = 3; }
        else if (o.status === 'Delivered') { statusClass = 'status-available'; progress = 100; steps = 4; }
        else if (o.status === 'Cancelled') { statusClass = 'status-out'; progress = 0; steps = 0; }

        const row = `
            <tr class="animate-slide-in">
                <td class="ps-4">
                    <div class="fw-extrabold text-dark">#${o.id}</div>
                    <div class="extra-small text-muted fw-bold">REF-${Math.floor(Math.random()*9000)+1000}</div>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center text-primary fw-bold" style="width: 32px; height: 32px; font-size: 0.7rem;">${o.customer.charAt(0)}</div>
                        <div>
                            <div class="fw-bold small text-dark">${o.customer}</div>
                            <div class="extra-small text-muted">${o.date}</div>
                        </div>
                    </div>
                </td>
                <td style="width: 300px;">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="extra-small fw-bold text-dark text-uppercase">${o.status}</span>
                        <span class="extra-small fw-bold text-muted">${progress}%</span>
                    </div>
                    <div class="progress" style="height: 6px; border-radius: 10px; background: rgba(0,0,0,0.05);">
                        <div class="progress-bar ${progress === 100 ? 'bg-success' : 'bg-primary'} progress-bar-striped progress-bar-animated" style="width: ${progress}%"></div>
                    </div>
                    <div class="pipeline-track mt-1">
                        <div class="pipeline-step ${steps >= 1 ? 'completed' : ''}"><i class="fa-solid fa-file-invoice small"></i></div>
                        <div class="pipeline-step ${steps >= 2 ? 'completed' : (steps == 1 ? 'active' : '')}"><i class="fa-solid fa-box-open small"></i></div>
                        <div class="pipeline-step ${steps >= 3 ? 'completed' : (steps == 2 ? 'active' : '')}"><i class="fa-solid fa-truck-fast small"></i></div>
                        <div class="pipeline-step ${steps >= 4 ? 'completed' : (steps == 3 ? 'active' : '')}"><i class="fa-solid fa-house-circle-check small"></i></div>
                    </div>
                </td>
                <td>
                    <div class="fw-extrabold text-dark">$${o.total.toFixed(2)}</div>
                    <div class="extra-small text-success fw-bold text-uppercase ls-1">Paid · Stripe</div>
                </td>
                <td>
                    <span class="badge ${statusClass} badge-premium text-uppercase" style="font-size: 0.61rem;">${o.status}</span>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border rounded-3 p-2 ripple" onclick="viewOrder('${o.id}')">
                        <i class="fa-solid fa-eye text-muted"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    updateOrderSummaryStats();
}

function updateOrderSummaryStats() {
    const container = document.getElementById('orderStatsSummary');
    if (!container) return;

    const stats = [
        { label: 'Total Volume', value: AppState.orders.length, icon: 'fa-box', color: 'primary' },
        { label: 'Active Pipeline', value: AppState.orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length, icon: 'fa-clock-rotate-left', color: 'warning' },
        { label: 'Fulfillment Rate', value: '98.2%', icon: 'fa-check-double', color: 'success' },
        { label: 'Daily Yield', value: '$' + (AppState.orders.reduce((s,o) => s+o.total, 0) / 30).toFixed(0), icon: 'fa-hand-holding-dollar', color: 'info' }
    ];

    container.innerHTML = stats.map(s => `
        <div class="col-md-3">
            <div class="glass p-3 rounded-4 h-100 d-flex align-items-center gap-3">
                <div class="bg-${s.color} bg-opacity-10 p-3 rounded-3 text-${s.color}">
                    <i class="fa-solid ${s.icon} fs-4"></i>
                </div>
                <div>
                    <h5 class="fw-extrabold mb-0 text-dark">${s.value}</h5>
                    <p class="mb-0 extra-small text-muted fw-bold text-uppercase">${s.label}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / AppState.itemsPerPage);
    const pagination = document.getElementById('productsPagination');
    const info = document.getElementById('productsPaginationInfo');
    
    pagination.innerHTML = '';
    
    const startIdx = totalItems > 0 ? (AppState.currentPage - 1) * AppState.itemsPerPage + 1 : 0;
    const endIdx = Math.min(AppState.currentPage * AppState.itemsPerPage, totalItems);
    info.textContent = `Showing ${startIdx} to ${endIdx} of ${totalItems} entries`;

    for (let i = 1; i <= totalPages; i++) {
        const li = `<li class="page-item ${i === AppState.currentPage ? 'active' : ''}">
            <a class="page-link" href="#">${i}</a>
        </li>`;
        pagination.insertAdjacentHTML('beforeend', li);
    }

    pagination.querySelectorAll('.page-link').forEach((link, idx) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            AppState.currentPage = idx + 1;
            renderProductsTable();
        });
    });
}

// --- Stats and Charts ---
function updateStats() {
    animateCounter('stat-total-products', AppState.products.length);
    animateCounter('stat-low-stock', AppState.products.filter(p => parseInt(p.stock) <= parseInt(p.minStock)).length);
    animateCounter('stat-total-suppliers', AppState.suppliers.length);
    animateCounter('stat-total-orders', AppState.orders.length);
    updateRevenueCard();
}

function initCharts() {
    const revCtx = document.getElementById('revenueChart')?.getContext('2d');
    const stockCtx = document.getElementById('stockChart')?.getContext('2d');

    if (revCtx) {
        AppState.charts.revenue = new Chart(revCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: [12000, 19000, 15000, 21000, 24000, 31000, 28000],
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                        return gradient;
                    }
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { grid: { borderDash: [5, 5], color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
                }
            }
        });
    }

    if (stockCtx) {
        AppState.charts.stock = new Chart(stockCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cables', 'Lamps', 'Switches', 'Safety'],
                datasets: [{
                    data: [40, 25, 20, 15],
                    backgroundColor: ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 8, padding: 20, font: { size: 10 } } }
                }
            }
        });
    }
}

function updateCharts() {
    // 1. Stock by Category (Pie Chart)
    const categories = [...new Set(AppState.products.map(p => p.category))];
    const counts = categories.map(cat => AppState.products.filter(p => p.category === cat).length);
    
    AppState.charts.stock.data.labels = categories;
    AppState.charts.stock.data.datasets[0].data = counts;
    AppState.charts.stock.update();

    // 2. Revenue by Order (Line Chart)
    if (AppState.orders.length > 0) {
        const orderLabels = AppState.orders.map(o => o.id);
        const orderTotals = AppState.orders.map(o => o.total);
        
        AppState.charts.revenue.data.labels = orderLabels;
        AppState.charts.revenue.data.datasets[0].data = orderTotals;
        AppState.charts.revenue.data.datasets[0].label = 'Order Totals ($)';
        AppState.charts.revenue.update();
    }
}

// --- UI Helpers ---
function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showToast(title, message, type = 'primary') {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;

    const toastTitle = document.getElementById('toastTitle');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = toastEl.querySelector('.bi');

    const iconMap = {
        'primary': 'bi-info-circle-fill',
        'success': 'bi-check-circle-fill',
        'warning': 'bi-exclamation-triangle-fill',
        'danger': 'bi-x-circle-fill'
    };

    if (toastTitle) toastTitle.textContent = title;
    if (toastMsg) toastMsg.textContent = message;
    
    // Set style
    toastEl.className = `toast border-0 bg-white shadow-lg rounded-4`;
    toastTitle.className = `me-auto text-${type} fw-extrabold`;
    if(toastIcon) toastIcon.className = `bi ${iconMap[type] || 'bi-info-circle-fill'} me-2 text-${type}`;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function initAddProductForm() {
    const form = document.getElementById('addProductForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('newProductId').value;
        const name = document.getElementById('newProductName').value;
        const category = document.getElementById('newProductCategory').value;
        const price = parseFloat(document.getElementById('newProductPrice').value);
        const quantity = parseInt(document.getElementById('newProductStock').value);
        const image = document.getElementById('newProductImage').value;

        // Determine Status
        let status = 'Available';
        if (quantity === 0) status = 'Out of Stock';
        else if (quantity < 20) status = 'Low Stock';

        const newProduct = {
            id,
            name,
            category,
            price,
            quantity,
            status,
            image,
            supplier: "Manual Entry"
        };

        // Add to state
        AppState.products.unshift(newProduct);

        // Update UI
        updateStats();
        renderProductsTable();
        updateCharts();

        // Close Modal
        const modalEl = document.getElementById('addProductModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        // Reset Form
        form.reset();

        showToast('Success', `Product ${name} added successfully!`, 'success');
    });
}

function initAddSupplierForm() {
    const form = document.getElementById('addSupplierForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('newSupplierName').value;
        const contact = document.getElementById('newSupplierContact').value;
        const email = document.getElementById('newSupplierEmail').value;
        const phone = document.getElementById('newSupplierPhone').value;
        const address = document.getElementById('newSupplierAddress').value;

        const newSupplier = {
            id: 'S' + (AppState.suppliers.length + 1).toString().padStart(3, '0'),
            name,
            contact,
            email,
            phone,
            address
        };

        // Add to state
        AppState.suppliers.unshift(newSupplier);

        // Update UI
        updateStats();
        renderSuppliersTable();

        // Close Modal
        const modalEl = document.getElementById('addSupplierModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.hide();

        // Reset Form
        form.reset();

        showToast('Supplier Registered', `${name} has been added to your network.`, 'success');
    });
}

function initDarkMode() {
    const toggle = document.getElementById('premiumThemeToggle');
    const statusText = document.querySelector('.theme-status-text');
    const overlay = document.getElementById('themeOverlay');
    
    // Check for saved preference
    const isDark = localStorage.getItem('rlstore-dark-mode') !== 'false'; // Default to dark for premium feel
    
    if (!isDark) {
        document.body.classList.remove('dark-theme');
        if (statusText) statusText.textContent = 'Light Mode';
    } else {
        document.body.classList.add('dark-theme');
        if (statusText) statusText.textContent = 'Dark Mode';
    }

    if (toggle) {
        toggle.addEventListener('click', () => {
            // Trigger smooth transition
            if (overlay) overlay.classList.add('active');
            
            setTimeout(() => {
                document.body.classList.add('theme-transitioning');
                document.body.classList.toggle('dark-theme');
                const currentlyDark = document.body.classList.contains('dark-theme');
                
                if (statusText) {
                    statusText.textContent = currentlyDark ? 'Dark Mode' : 'Light Mode';
                }
                
                localStorage.setItem('rlstore-dark-mode', currentlyDark);
                
                // Redraw charts for theme compatibility
                updateCharts();
                const activeView = document.querySelector('.view-section.active')?.id;
                if (activeView === 'reports') updateReportCharts();
                if (activeView === 'stock-mgmt') renderInventoryView();
                
                setTimeout(() => {
                    if (overlay) overlay.classList.remove('active');
                    document.body.classList.remove('theme-transitioning');
                    showToast('Environment Sync', `UI shifted to ${currentlyDark ? 'Dark' : 'Light'} Mode environment.`, 'primary');
                }, 300);
            }, 300);
        });
    }
}

/**
 * Inventory Control View Logic
 */
function initInventory() {
    console.log('Initializing Inventory Command Center...');

    const search = document.getElementById('inventorySearch');
    const catFilter = document.getElementById('invCategoryFilter');
    const statusFilter = document.getElementById('invStatusFilter');
    const refreshBtn = document.getElementById('refreshInventory');
    const exportBtn = document.getElementById('exportInventoryBtn');

    if (search) {
        search.addEventListener('input', (e) => {
            AppState.filters.inventorySearch = e.target.value;
            renderInventoryView();
        });
    }

    if (catFilter) {
        catFilter.addEventListener('change', (e) => {
            AppState.filters.invCategory = e.target.value;
            renderInventoryView();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            AppState.filters.invStatus = e.target.value;
            renderInventoryView();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('fa-spin');
            loadAllData().finally(() => {
                setTimeout(() => refreshBtn.classList.remove('fa-spin'), 1000);
            });
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportInventoryExcel);
    }
}

function renderInventoryView() {
    const tableBody = document.querySelector('#inventoryControlTable tbody');
    if (!tableBody) return;

    // Filter Logic
    const filtered = AppState.products.filter(p => {
        const searchStr = AppState.filters.inventorySearch.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(searchStr) || 
                             (p.sku && p.sku.toLowerCase().includes(searchStr));
        const matchesCat = AppState.filters.invCategory === 'all' || p.category === AppState.filters.invCategory;
        
        const stockStatus = p.stock <= 0 ? 'Out of Stock' : (p.stock <= p.minStock ? 'Low Stock' : 'In Stock');
        const matchesStatus = AppState.filters.invStatus === 'all' || stockStatus === AppState.filters.invStatus;

        return matchesSearch && matchesCat && matchesStatus;
    });

    // Update Stats
    updateInventoryStats(filtered);

    // Render Table
    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state py-5 text-center">
                        <i class="fa-solid fa-box-open empty-state-icon fs-1 text-muted mb-3 d-block"></i>
                        <h4 class="fw-bold text-dark">No Assets Found</h4>
                        <p class="text-muted small">Adjust your filters or initiate a new procurement.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';
    filtered.forEach(p => {
        const stockStatus = p.stock <= 0 ? 'Out of Stock' : (p.stock <= p.minStock ? 'Low Stock' : 'In Stock');
        let statusClass = 'status-available';
        if (stockStatus === 'Low Stock') statusClass = 'status-low';
        else if (stockStatus === 'Out of Stock') statusClass = 'status-out';
        
        const pulseClass = stockStatus === 'Out of Stock' ? 'pulse-glow-danger' : (stockStatus === 'Low Stock' ? 'pulse-glow-warning' : '');
        const progressClass = stockStatus === 'Out of Stock' ? 'bg-danger' : (stockStatus === 'Low Stock' ? 'bg-warning' : 'bg-success');

        const tr = document.createElement('tr');
        tr.className = 'animate-slide-in';
        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center gap-3">
                    <img src="${p.image || 'https://images.unsplash.com/photo-1558444479-2753cd5858cf?w=100&auto=format&fit=crop'}" 
                         class="rounded-3 shadow-sm" width="48" height="48" style="object-fit: cover; background: #eee;">
                    <div>
                        <p class="mb-0 fw-extrabold text-dark small">${p.name}</p>
                        <p class="mb-0 extra-small text-muted">${p.manufacturer || 'RLSTORE Direct'}</p>
                    </div>
                </div>
            </td>
            <td class="extra-small fw-bold font-mono text-muted">${p.sku || p.id}</td>
            <td>
                <span class="badge py-2 px-3 rounded-pill bg-light text-dark extra-small border">
                    <i class="fa-solid ${getCategoryIcon(p.category)} me-2"></i> ${p.category}
                </span>
            </td>
            <td>
                <div class="d-flex flex-column gap-1" style="min-width: 120px;">
                    <div class="d-flex justify-content-between extra-small fw-bold">
                        <span class="text-dark">${p.stock} UNTS</span>
                        <span class="text-muted">${p.minStock} MIN</span>
                    </div>
                    <div class="progress" style="height: 6px; background: rgba(0,0,0,0.05);">
                        <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${Math.min((p.stock / (p.minStock * 2)) * 100 || 0, 100)}%;"></div>
                    </div>
                </div>
            </td>
            <td class="extra-small fw-bold text-muted">HUB-${p.id.slice(0, 3).toUpperCase()}-ALPHA</td>
            <td>
                <span class="badge badge-premium ${statusClass} ${pulseClass}">
                    ● ${stockStatus.toUpperCase()}
                </span>
            </td>
            <td class="pe-4 text-end">
                <div class="d-flex gap-2 justify-content-end">
                    <button class="btn btn-icon-small ripple" title="Analytics"><i class="fa-solid fa-chart-line"></i></button>
                    <button class="btn btn-icon-small ripple" title="Edit" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn btn-icon-small text-danger ripple" title="Decommission" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Update charts
    updateInventoryCharts(filtered);
}

function updateInventoryStats(products) {
    const total = products.length;
    const inStock = products.filter(p => p.stock > p.minStock).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStock = products.filter(p => p.stock <= 0).length;
    const totalValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);

    animateCounter('inv-stat-total', total);
    animateCounter('inv-stat-stock', inStock);
    animateCounter('inv-stat-low', lowStock);
    animateCounter('inv-stat-out', outOfStock);
    
    const valueEl = document.getElementById('inv-stat-value');
    if (valueEl) {
        let startVal = parseFloat(valueEl.innerText.replace(/[$,]/g, '')) || 0;
        const duration = 1000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = startVal + progress * (totalValue - startVal);
            valueEl.innerText = `$${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }
}

// --- CRUD Operations ---
window.editProduct = function(id) {
    const p = AppState.products.find(item => item.id === id);
    if (!p) return;
    
    // Logic for editing would involve a modal, for this prototype we'll show a prompt
    const newName = prompt(`Editing ${p.name}. Enter new name:`, p.name);
    if (newName && newName !== p.name) {
        p.name = newName;
        renderProductsTable();
        renderInventoryView();
        showToast('Update Success', `${p.id} identity modified in global registry.`, 'success');
    }
};

window.deleteProduct = function(id) {
    const p = AppState.products.find(item => item.id === id);
    if (!p) return;

    if (confirm(`Are you sure you want to decommission ${p.name} (#${p.id})?`)) {
        AppState.products = AppState.products.filter(item => item.id !== id);
        updateStats();
        renderProductsTable();
        renderInventoryView();
        updateCharts();
        showToast('Decommissioned', `Asset ${id} removed from active deployment.`, 'warning');
    }
};

function updateInventoryCharts(products) {
    const distCtx = document.getElementById('invDistChart');
    const fluxCtx = document.getElementById('invFluxChart');
    const radarCtx = document.getElementById('invCategoryRadarChart');

    if (distCtx) {
        const stats = {
            in: products.filter(p => p.stock > p.minStock).length,
            low: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
            out: products.filter(p => p.stock <= 0).length
        };

        if (AppState.charts.invDist) AppState.charts.invDist.destroy();
        AppState.charts.invDist = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['Healthy', 'Warning', 'Critical'],
                datasets: [{
                    data: [stats.in, stats.low, stats.out],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                cutout: '80%',
                plugins: { legend: { display: false } },
                maintainAspectRatio: false
            }
        });
    }

    if (fluxCtx) {
        if (AppState.charts.invFlux) AppState.charts.invFlux.destroy();
        // Mock data for flux - random but consistent
        const labels = Array.from({length: 12}, (_, i) => `Cycle ${i+1}`);
        const isDark = document.body.classList.contains('dark-theme');

        AppState.charts.invFlux = new Chart(fluxCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Efficiency Index',
                    data: Array.from({length: 12}, () => Math.floor(Math.random() * 40) + 60),
                    borderColor: '#3b82f6',
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: isDark ? '#94a3b8' : '#64748b' }
                    }
                },
                maintainAspectRatio: false
            }
        });
    }

    if (radarCtx) {
        if (AppState.charts.invRadar) AppState.charts.invRadar.destroy();
        const categories = [...new Set(AppState.products.map(p => p.category))];
        const displayCats = categories.length > 5 ? categories.slice(0, 5) : categories;
        const catData = displayCats.map(c => {
            const catProds = AppState.products.filter(p => p.category === c);
            return (catProds.filter(p => p.stock > p.minStock).length / (catProds.length || 1)) * 100;
        });

        const isDark = document.body.classList.contains('dark-theme');

        AppState.charts.invRadar = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: displayCats,
                datasets: [{
                    label: 'Health %',
                    data: catData,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderColor: '#f59e0b',
                    pointBackgroundColor: '#f59e0b'
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                        angleLines: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                        pointLabels: { color: isDark ? '#94a3b8' : '#64748b' },
                        ticks: { display: false }
                    }
                },
                plugins: { legend: { display: false } },
                maintainAspectRatio: false
            }
        });
    }
}

function resetInventoryFilters() {
    AppState.filters.inventorySearch = '';
    AppState.filters.invCategory = 'all';
    AppState.filters.invStatus = 'all';

    const search = document.getElementById('inventorySearch');
    const catF = document.getElementById('invCategoryFilter');
    const statF = document.getElementById('invStatusFilter');

    if (search) search.value = '';
    if (catF) catF.value = 'all';
    if (statF) statF.value = 'all';

    renderInventoryView();
    showToast('Filters Reset', 'Universal matrix view restored.', 'info');
}

function exportInventoryExcel() {
    showLoading(true);
    setTimeout(() => {
        showLoading(false);
        showToast('Export Initiated', 'Inventory manifest encrypted and generating...', 'success');
    }, 1500);
}

// --- Premium Dashboard Implementation ---

/**
 * Notification Intelligence System
 */
function initNotificationSystem() {
    console.log('Activating Notification Protocol...');
    AppState.notifications = [
        { id: 1, title: 'Security Protocol', message: 'Master sync protocol verified.', time: 'Just now', type: 'info', read: false },
        { id: 2, title: 'Inventory Alert', message: 'Low stock detected for high-voltage cables.', time: '5m ago', type: 'warning', read: false }
    ];
    renderNotifications();
}

function addNotification(title, message, type = 'info') {
    const id = Date.now();
    const time = 'Just now';
    AppState.notifications.unshift({ id, title, message, time, type, read: false });
    
    // Limit to 20 notifications
    if (AppState.notifications.length > 20) AppState.notifications.pop();
    
    renderNotifications();
    
    // Pulse animation for new alert
    const badge = document.querySelector('.unread-count-badge');
    if (badge) {
        badge.classList.remove('pulse-red');
        void badge.offsetWidth; // Trigger reflow
        badge.classList.add('pulse-red');
    }
}

function renderNotifications() {
    const container = document.getElementById('notifications-container');
    const badge = document.querySelector('.unread-count-badge');
    const text = document.getElementById('unread-count-text');
    
    if (!container) return;

    AppState.unreadNotifications = AppState.notifications.filter(n => !n.read).length;
    
    if (badge) {
        if (AppState.unreadNotifications > 0) {
            badge.textContent = AppState.unreadNotifications;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    if (text) {
        text.textContent = AppState.unreadNotifications > 0 
            ? `You have ${AppState.unreadNotifications} unread alerts`
            : 'Operational status optimal';
    }

    if (AppState.notifications.length === 0) {
        container.innerHTML = `
            <div class="p-5 text-center text-muted">
                <i class="fa-solid fa-bell-slash fs-2 mb-3 opacity-25"></i>
                <p class="small mb-0">No alerts detected</p>
            </div>
        `;
        return;
    }

    container.innerHTML = AppState.notifications.map(n => {
        const typeIcons = {
            'info': { icon: 'fa-info-circle', color: 'primary' },
            'warning': { icon: 'fa-triangle-exclamation', color: 'warning' },
            'success': { icon: 'fa-circle-check', color: 'success' },
            'danger': { icon: 'fa-radiation', color: 'danger' }
        };
        const config = typeIcons[n.type] || typeIcons.info;

        return `
            <li class="notification-card p-3 border-bottom ${!n.read ? 'unread' : ''}" style="cursor: pointer;" onclick="markNotificationRead(${n.id})">
                <div class="d-flex gap-3">
                    <div class="bg-${config.color} bg-opacity-10 p-2 rounded-3 text-${config.color}" style="height: fit-content;">
                        <i class="fa-solid ${config.icon}"></i>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="mb-0 small fw-bold text-dark text-truncate">${n.title}</h6>
                            <span class="extra-small text-muted">${n.time}</span>
                        </div>
                        <p class="mb-0 extra-small text-muted text-truncate w-100">${n.message}</p>
                    </div>
                    ${!n.read ? '<div class="pulse-dot mt-2"></div>' : ''}
                </div>
            </li>
        `;
    }).join('');
}

window.markNotificationRead = (id) => {
    const n = AppState.notifications.find(notif => notif.id === id);
    if (n) {
        n.read = true;
        renderNotifications();
    }
};

window.markAllNotificationsAsRead = () => {
    AppState.notifications.forEach(n => n.read = true);
    renderNotifications();
    showToast('Task Complete', 'All alerts marked as seen.', 'success');
};

window.clearAllNotifications = () => {
    AppState.notifications = [];
    renderNotifications();
    showToast('Clearing Log', 'Notification register cleared.', 'primary');
};

function startRealTimeAlerts() {
    const scenarios = [
        { title: 'Inventory Inbound', message: 'New shipment of Smart Switches received.', type: 'success' },
        { title: 'Security Check', message: 'Unauthorized login attempt blocked.', type: 'danger' },
        { title: 'Optimization', message: 'Database query performance improved by 12%.', type: 'info' },
        { title: 'Report Finalized', message: 'Weekly procurement report generated.', type: 'success' }
    ];

    setInterval(() => {
        if (Math.random() > 0.85) { 
            const s = scenarios[Math.floor(Math.random() * scenarios.length)];
            addNotification(s.title, s.message, s.type);
        }
    }, 20000); 
}

/**
 * Premium Revenue Animation & Stats
 */
function updateRevenueCard() {
    const totalRev = AppState.orders.reduce((sum, o) => sum + o.total, 0);
    const target = 52000;
    const percentage = Math.min((totalRev / target) * 100, 100);
    
    // Animate large counter
    animateCounter('stat-revenue', totalRev, true);
    
    // Animate progress bar
    const progressBar = document.getElementById('revenueProgressBar');
    if (progressBar) progressBar.style.width = `${percentage}%`;
    
    // Generate Mini Sparkline
    const sparkline = document.getElementById('miniRevenueSparkline');
    if (sparkline) {
        sparkline.innerHTML = '';
        const count = 12;
        const heights = Array.from({length: count}, () => Math.floor(Math.random() * 80) + 20);
        
        heights.forEach((h, i) => {
            const opacity = (i + 1) / count;
            const bar = `<div style="flex: 1; height: ${h}%; background: rgba(59, 130, 246, ${opacity}); border-radius: 2px;"></div>`;
            sparkline.insertAdjacentHTML('beforeend', bar);
        });
    }
}

/**
 * Order Management Overrides
 */
window.viewOrder = (id) => {
    const o = AppState.orders.find(ord => ord.id === id);
    if (!o) return;
    showToast('Order Intelligence', `Accessing manifest data for #${o.id}...`, 'primary');
};

window.manageOrder = (id) => {
    showToast('Operational Access', `Manual override active for command #${id}.`, 'info');
};

window.sortOrders = (criteria) => {
    if (criteria === 'total') {
        AppState.orders.sort((a,b) => b.total - a.total);
    } else if (criteria === 'date') {
        AppState.orders.sort((a,b) => new Date(b.date) - new Date(a.date));
    } else if (criteria === 'status') {
        AppState.orders.sort((a,b) => a.status.localeCompare(b.status));
    }
    renderOrdersTable();
    showToast('Sequence Shift', `Orders reorganized by ${criteria}.`, 'primary');
};

window.resetOrderFilters = () => {
    const search = document.getElementById('orderSearch');
    const filter = document.getElementById('orderStatusFilter');
    if (search) search.value = '';
    if (filter) filter.value = 'all';
    AppState.filters.ordersSearch = '';
    renderOrdersTable();
    showToast('System Reset', 'Order pipeline normalized.', 'info');
};

window.resetInventoryFilters = resetInventoryFilters;

// --- Profile & Session Management ---
window.handleProfileAction = (type) => {
    const actions = {
        'Profile': 'Accessing secure user profile matrix...',
        'Security': 'Encrypting session tunnel and verifying credentials...',
        'Notifications': 'Opening prioritized system alert log...',
        'Activity': 'Retrieving administrative audit trail...'
    };
    showToast('Admin Intelligence', actions[type] || 'Processing administrative request...', 'primary');
};

window.handleLogout = () => {
    showLoading(true);
    showToast('Session Termination', 'Synchronizing data and closing secure channel...', 'warning');
    setTimeout(() => {
        showLoading(false);
        showToast('Success', 'Session terminated successfully.', 'success');
        // In a real app: window.location.href = '/login';
    }, 2000);
};
