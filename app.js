const search = document.getElementById('search');
const searchBtn = document.getElementById('searchBtn');
const scanBtn = document.getElementById('scanBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const dashboard = document.getElementById('dashboard');
const historyPage = document.getElementById('historyPage');
const favoritesPage = document.getElementById('favoritesPage');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const scanStatus = document.getElementById('scanStatus');

let chart = null;
let scanner = null;
let history = JSON.parse(localStorage.getItem('history') || '[]');

searchBtn.addEventListener('click', searchProduct);
scanBtn.addEventListener('click', openScanner);
closeModal.addEventListener('click', closeScanner);
search.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchProduct();
});

// Check for barcode in URL (from history/favorites)
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const barcode = params.get('barcode');
    if (barcode) {
        search.value = barcode;
        searchProduct();
    }
});

// Close modal on overlay click
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeScanner();
});

// Search Product
async function searchProduct() {
    const query = search.value.trim();
    if (!query) return showError('Please enter a product name or barcode');

    show(loading);
    hide(error, dashboard);

    try {
        const isBarcode = /^\d+$/.test(query);
        let product;
        
        if (isBarcode) {
            product = await fetchProductByBarcode(query);
        } else {
            const products = await searchProductsByName(query, 1);
            product = products[0];
        }

        if (product) {
            displayProduct(product);
        } else {
            showError('Product not found');
        }
    } catch (err) {
        showError('Error fetching product: ' + err.message);
        console.error(err);
    } finally {
        hide(loading);
    }
}

// Display Product
function displayProduct(p) {
    // Add to history
    addToHistory(p);
    
    // Product Info
    document.getElementById('productImg').src = p.image_url || 'https://via.placeholder.com/120';
    document.getElementById('productName').textContent = p.product_name || 'Unknown';
    document.getElementById('productBrand').textContent = p.brands || 'Unknown Brand';

    // Scores
    const nutri = p.nutrition_grades || p.nutriscore_grade || 'N/A';
    const eco = p.ecoscore_grade || 'N/A';
    const health = calculateHealth(p);
    const points = calculatePoints(nutri, eco);

    document.getElementById('nutritionGrade').textContent = nutri.toUpperCase();
    document.getElementById('nutritionGrade').style.color = getColor(nutri);
    document.getElementById('ecoScore').textContent = eco.toUpperCase();
    document.getElementById('ecoScore').style.color = getColor(eco);
    document.getElementById('healthScore').textContent = health;
    document.getElementById('healthScore').style.color = health >= 70 ? '#10b981' : health >= 40 ? '#f59e0b' : '#ef4444';
    document.getElementById('ecoPoints').textContent = points;

    // Details
    const co2 = p.ecoscore_data?.adjustments?.production_system?.value || 'N/A';
    document.getElementById('co2').textContent = typeof co2 === 'number' ? `${co2}g CO₂` : co2;

    // Ingredients
    const ingredientsDiv = document.getElementById('ingredients');
    if (p.ingredients_list && p.ingredients_list.length > 0) {
        const textIng = p.ingredients_list.find(i => i.type === 'text');
        if (textIng) {
            ingredientsDiv.innerHTML = `<p style="font-size: 0.9rem; line-height: 1.6;">${textIng.content}</p>`;
        } else {
            ingredientsDiv.innerHTML = '<p>Ingredients information available</p>';
        }
    } else {
        ingredientsDiv.innerHTML = '<p>No ingredients information</p>';
    }

    // Additives
    const additives = p.additives_list || [];
    document.getElementById('additives').innerHTML = additives.length 
        ? additives.slice(0, 10).map(a => `<li>${a.name}${a.code ? ` (${a.code})` : ''}</li>`).join('')
        : '<li>None detected ✓</li>';

    // Allergens
    const allergens = p.allergens_list || [];
    document.getElementById('allergens').innerHTML = allergens.length
        ? allergens.map(a => `<li>${a.name}</li>`).join('')
        : '<li>None detected ✓</li>';

    // Chart
    drawChart(p.nutriments);
    
    // Get suggestions
    getSuggestions(p);
    
    show(dashboard);
}

// Draw Chart
function drawChart(n) {
    if (chart) chart.destroy();
    
    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Fat', 'Sugar', 'Protein', 'Carbs'],
            datasets: [{
                data: [n?.fat_100g || 0, n?.sugars_100g || 0, n?.proteins_100g || 0, n?.carbohydrates_100g || 0],
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: (c) => c.label + ': ' + c.parsed + 'g' } }
            }
        }
    });
}

// Scanner
function openScanner() {
    show(modal);
    scanStatus.textContent = 'Initializing camera...';
    scanStatus.style.color = '#666';

    scanner = new Html5Qrcode("reader");
    
    scanner.start(
        { facingMode: "environment" },
        { 
            fps: 10, 
            qrbox: { width: 300, height: 150 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E
            ]
        },
        onScanSuccess,
        () => {
            scanStatus.textContent = 'Scanning... Point at barcode';
            scanStatus.style.color = '#f59e0b';
        }
    ).then(() => {
        scanStatus.textContent = 'Camera ready! Scan barcode';
        scanStatus.style.color = '#10b981';
    }).catch(err => {
        scanStatus.textContent = 'Camera error';
        scanStatus.style.color = '#ef4444';
        console.error(err);
    });
}

async function onScanSuccess(code) {
    console.log('Barcode scanned:', code);
    
    if (!/^\d{8,13}$/.test(code)) {
        console.log('Invalid barcode format');
        return;
    }
    
    scanStatus.textContent = `✓ Scanned: ${code}`;
    scanStatus.style.color = '#10b981';
    
    // Stop scanner
    try {
        await scanner.stop();
        scanner.clear();
        scanner = null;
        console.log('Scanner stopped successfully');
    } catch (err) {
        console.error('Error stopping scanner:', err);
    }
    
    // Put barcode in search box
    search.value = code;
    
    // Close modal
    hide(modal);
    
    // Fetch and display product
    setTimeout(() => {
        searchProduct();
    }, 300);
}

function closeScanner() {
    console.log('Closing scanner...');
    
    if (scanner) {
        scanner.stop().then(() => {
            console.log('Scanner stopped');
            scanner.clear();
            scanner = null;
            document.getElementById('reader').innerHTML = '';
            hide(modal);
        }).catch((err) => {
            console.error('Error stopping scanner:', err);
            scanner = null;
            document.getElementById('reader').innerHTML = '';
            hide(modal);
        });
    } else {
        console.log('No active scanner');
        hide(modal);
    }
}

// Helpers
function calculateHealth(p) {
    let score = 50;
    const grades = { a: 20, b: 10, c: 0, d: -10, e: -20 };
    score += grades[(p.nutrition_grades || p.nutriscore_grade || '').toLowerCase()] || 0;
    score += grades[(p.ecoscore_grade || '').toLowerCase()] || 0;
    score -= (p.additives_tags || []).length * 2;
    if (p.nutriments) {
        if (p.nutriments.fiber_100g > 5) score += 5;
        if (p.nutriments.proteins_100g > 10) score += 5;
        if (p.nutriments.sugars_100g > 20) score -= 10;
        if (p.nutriments.salt_100g > 2) score -= 10;
    }
    return Math.max(0, Math.min(100, score));
}

function calculatePoints(nutri, eco) {
    const points = { a: 5, b: 4, c: 3, d: 2, e: 1 };
    return (points[nutri?.toLowerCase()] || 0) + (points[eco?.toLowerCase()] || 0);
}

function getColor(grade) {
    const colors = { a: '#10b981', b: '#84cc16', c: '#f59e0b', d: '#f97316', e: '#ef4444' };
    return colors[grade?.toLowerCase()] || '#6b7280';
}

// History
function addToHistory(p) {
    const item = {
        name: p.product_name || 'Unknown',
        brand: p.brands || 'Unknown',
        barcode: p.code,
        image: p.image_url,
        nutritionGrade: p.nutrition_grades || p.nutriscore_grade,
        ecoScore: p.ecoscore_grade,
        healthScore: p.health_score,
        date: new Date().toISOString()
    };
    
    // Remove duplicates
    history = history.filter(h => h.barcode !== item.barcode);
    history.unshift(item);
    history = history.slice(0, 20); // Keep last 20
    localStorage.setItem('history', JSON.stringify(history));
}

// Get Suggestions
async function getSuggestions(currentProduct) {
    const suggestions = document.getElementById('suggestions');
    const list = document.getElementById('suggestionsList');
    
    // Only suggest if current product has poor scores
    const nutri = currentProduct.nutrition_grades || currentProduct.nutriscore_grade || 'e';
    const eco = currentProduct.ecoscore_grade || 'e';
    
    if (nutri <= 'b' && eco <= 'b') {
        hide(suggestions);
        return; // Product is already good
    }
    
    try {
        // Search for similar products in same category
        const category = currentProduct.categories_tags?.[0]?.replace('en:', '') || 
                        currentProduct.product_name?.split(' ')[0] || 'food';
        
        const products = await searchSimilarProducts(category, 10);
        
        // Filter better alternatives
        const alternatives = products
            .filter(p => {
                const pNutri = p.nutrition_grades || p.nutriscore_grade || 'e';
                const pEco = p.ecoscore_grade || 'e';
                return (pNutri < nutri || pEco < eco) && p.code !== currentProduct.code;
            })
            .slice(0, 3);
        
        if (alternatives.length === 0) {
            hide(suggestions);
            return;
        }
        
        list.innerHTML = alternatives.map(p => {
            const pNutri = p.nutrition_grades || p.nutriscore_grade || 'N/A';
            const pEco = p.ecoscore_grade || 'N/A';
            return `
                <div class="suggestion-item">
                    <img src="${p.image_url || 'https://via.placeholder.com/60'}" alt="${p.product_name}">
                    <div class="suggestion-info">
                        <h4>${p.product_name || 'Unknown Product'}</h4>
                        <p>${p.brands || 'Unknown Brand'}</p>
                        <div class="suggestion-scores">
                            <span class="badge" style="background: ${getColor(pNutri)}">Nutri: ${pNutri.toUpperCase()}</span>
                            <span class="badge" style="background: ${getColor(pEco)}">Eco: ${pEco.toUpperCase()}</span>
                        </div>
                    </div>
                    <button class="view-btn" onclick="searchByBarcode('${p.code}')">View</button>
                </div>
            `;
        }).join('');
        
        show(suggestions);
    } catch (err) {
        console.error('Error fetching suggestions:', err);
        hide(suggestions);
    }
}

// Search by barcode (for suggestions)
function searchByBarcode(barcode) {
    search.value = barcode;
    searchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function show(...els) { els.forEach(el => el.classList.remove('hidden')); }
function hide(...els) { els.forEach(el => el.classList.add('hidden')); }
function showError(msg) { error.textContent = msg; show(error); setTimeout(() => hide(error), 5000); }
