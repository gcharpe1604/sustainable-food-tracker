// Load history from localStorage
let history = JSON.parse(localStorage.getItem('history') || '[]');

// Elements
const historyList = document.getElementById('historyList');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearHistory');

// Display history
function displayHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    historyList.innerHTML = history.map((item, index) => `
        <div class="history-card">
            <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}">
            <div class="history-info">
                <h3>${item.name}</h3>
                <p class="brand">${item.brand}</p>
                <p class="date">${formatDate(item.date)}</p>
            </div>
            <div class="history-actions">
                <a href="index.html?barcode=${item.barcode}" class="btn-view">View</a>
                <button onclick="removeFromHistory(${index})" class="btn-remove">✕</button>
            </div>
        </div>
    `).join('');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
}

// Remove item from history
function removeFromHistory(index) {
    if (confirm('Remove this item from history?')) {
        history.splice(index, 1);
        localStorage.setItem('history', JSON.stringify(history));
        displayHistory();
    }
}

// Clear all history
clearBtn.addEventListener('click', () => {
    if (confirm('Clear all search history?')) {
        history = [];
        localStorage.setItem('history', JSON.stringify(history));
        displayHistory();
    }
});

// Initial display
displayHistory();
