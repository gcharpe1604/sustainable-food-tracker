// Load data from localStorage
let history = JSON.parse(localStorage.getItem('history') || '[]');

// Calculate statistics
function calculateStats() {
    if (history.length === 0) {
        return {
            totalPoints: 0,
            totalScanned: 0,
            avgEcoScore: '-',
            avgHealth: 0,
            topProducts: []
        };
    }

    let totalPoints = 0;
    let totalHealth = 0;
    let ecoScores = [];
    
    history.forEach(item => {
        // Calculate eco points
        const points = calculateEcoPoints(item.nutritionGrade, item.ecoScore);
        totalPoints += points;
        
        // Track health scores
        if (item.healthScore) {
            totalHealth += item.healthScore;
        }
        
        // Track eco scores
        if (item.ecoScore) {
            ecoScores.push(item.ecoScore);
        }
    });

    // Calculate average eco score
    let avgEcoScore = '-';
    if (ecoScores.length > 0) {
        const scoreValues = { 'a': 5, 'b': 4, 'c': 3, 'd': 2, 'e': 1 };
        const avgValue = ecoScores.reduce((sum, score) => sum + (scoreValues[score?.toLowerCase()] || 0), 0) / ecoScores.length;
        const grades = ['e', 'd', 'c', 'b', 'a'];
        avgEcoScore = grades[Math.round(avgValue) - 1] || 'c';
    }

    // Get top eco-friendly products
    const topProducts = [...history]
        .filter(item => item.ecoScore || item.nutritionGrade)
        .sort((a, b) => {
            const pointsA = calculateEcoPoints(a.nutritionGrade, a.ecoScore);
            const pointsB = calculateEcoPoints(b.nutritionGrade, b.ecoScore);
            return pointsB - pointsA;
        })
        .slice(0, 5);

    return {
        totalPoints,
        totalScanned: history.length,
        avgEcoScore: avgEcoScore.toUpperCase(),
        avgHealth: Math.round(totalHealth / history.length) || 0,
        topProducts
    };
}

// Calculate eco points
function calculateEcoPoints(nutritionGrade, ecoScore) {
    const points = { 'a': 5, 'b': 4, 'c': 3, 'd': 2, 'e': 1 };
    return (points[nutritionGrade?.toLowerCase()] || 0) + (points[ecoScore?.toLowerCase()] || 0);
}

// Get grade color
function getGradeColor(grade) {
    const colors = { 'a': '#10b981', 'b': '#84cc16', 'c': '#f59e0b', 'd': '#f97316', 'e': '#ef4444' };
    return colors[grade?.toLowerCase()] || '#6b7280';
}

// Display statistics
function displayStats() {
    const stats = calculateStats();

    // Update stat cards
    document.getElementById('totalPoints').textContent = stats.totalPoints;
    document.getElementById('totalScanned').textContent = stats.totalScanned;
    document.getElementById('avgEcoScore').textContent = stats.avgEcoScore;
    document.getElementById('avgEcoScore').style.color = getGradeColor(stats.avgEcoScore);
    document.getElementById('avgHealth').textContent = stats.avgHealth;

    // Display top products
    const topProductsDiv = document.getElementById('topProducts');
    if (stats.topProducts.length === 0) {
        topProductsDiv.innerHTML = '<p class="empty-message">No products scanned yet. Start searching to see your top eco-friendly choices!</p>';
    } else {
        topProductsDiv.innerHTML = stats.topProducts.map((item, index) => {
            const points = calculateEcoPoints(item.nutritionGrade, item.ecoScore);
            return `
                <div class="top-product">
                    <div class="rank">#${index + 1}</div>
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}">
                    <div class="product-details">
                        <h4>${item.name}</h4>
                        <p>${item.brand}</p>
                        <div class="product-scores">
                            ${item.nutritionGrade ? `<span class="mini-badge" style="background: ${getGradeColor(item.nutritionGrade)}">N: ${item.nutritionGrade.toUpperCase()}</span>` : ''}
                            ${item.ecoScore ? `<span class="mini-badge" style="background: ${getGradeColor(item.ecoScore)}">E: ${item.ecoScore.toUpperCase()}</span>` : ''}
                            <span class="points-badge">${points} pts</span>
                        </div>
                    </div>
                    <a href="index.html?barcode=${item.barcode}" class="btn-small">View</a>
                </div>
            `;
        }).join('');
    }

    // Draw activity chart
    drawActivityChart();
}

// Draw activity chart
function drawActivityChart() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    // Get last 7 days of activity
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: 0
        });
    }

    // Count products per day
    history.forEach(item => {
        const itemDate = new Date(item.date);
        const dayIndex = last7Days.findIndex(day => {
            const d = new Date(day.date + ', ' + today.getFullYear());
            return d.toDateString() === itemDate.toDateString();
        });
        if (dayIndex !== -1) {
            last7Days[dayIndex].count++;
        }
    });

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.date),
            datasets: [{
                label: 'Products Scanned',
                data: last7Days.map(d => d.count),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// Reset statistics
document.getElementById('resetStats').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all statistics? This will clear your history.')) {
        localStorage.removeItem('history');
        history = [];
        displayStats();
        alert('Statistics reset successfully!');
    }
});

// Initial display
displayStats();
