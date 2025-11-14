document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const barcodeInput = document.getElementById('barcode');
    const resultsContainer = document.getElementById('results-container');

    searchBtn.addEventListener('click', () => {
        const query = barcodeInput.value.trim();
        if (query) {
            // Simple check if it's a barcode (numeric) or a search term
            if (!isNaN(query) && query.length > 8) {
                 fetchFoodDataByBarcode(query);
            } else {
                fetchFoodDataByName(query);
            }
        } else {
            resultsContainer.innerHTML = '<p>Please enter a barcode or food name.</p>';
        }
    });

    async function fetchFoodDataByBarcode(barcode) {
        resultsContainer.innerHTML = '<p>Loading...</p>';
        const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status === 1) {
                displayProductInfo(data.product);
            } else {
                resultsContainer.innerHTML = '<p>Product not found. Please check the barcode.</p>';
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            resultsContainer.innerHTML = '<p>An error occurred. Please try again later.</p>';
        }
    }

    async function fetchFoodDataByName(name) {
        resultsContainer.innerHTML = '<p>Searching...</p>';
        const apiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${name}&search_simple=1&action=process&json=1&page_size=1`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.products && data.products.length > 0) {
                // Display the first product found
                displayProductInfo(data.products[0]);
            } else {
                resultsContainer.innerHTML = `<p>No products found for "${name}".</p>`;
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            resultsContainer.innerHTML = '<p>An error occurred. Please try again later.</p>';
        }
    }

    function displayProductInfo(product) {
        resultsContainer.innerHTML = ''; // Clear previous results

        const productName = product.product_name || 'N/A';
        const brands = product.brands || 'N/A';
        const imageUrl = product.image_url || '';

        const nutriscoreGrade = product.nutriscore_grade ? product.nutriscore_grade.toUpperCase() : 'N/A';
        const ecoscoreGrade = product.ecoscore_grade ? product.ecoscore_grade.toLowerCase() : 'unknown';
        const novaGroup = product.nova_group || 'N/A';

        const card = document.createElement('div');
        card.className = 'product-card';

        let content = `
            <h2>${productName}</h2>
            <p class="brand">Brand: ${brands}</p>
        `;

        if (imageUrl) {
            content += `<img src="${imageUrl}" alt="${productName}" class="product-image">`;
        }

        content += `
            <div class="scores">
                <div class="score">
                    <h4>Nutri-Score</h4>
                    <p class="score-value nutriscore-${nutriscoreGrade}">${nutriscoreGrade}</p>
                </div>
                <div class="score">
                    <h4>Eco-Score</h4>
                    <p class="score-value ecoscore-${ecoscoreGrade}">${ecoscoreGrade.toUpperCase()}</p>
                </div>
                <div class="score">
                    <h4>NOVA Group</h4>
                    <p class="score-value nova-${novaGroup}">${novaGroup}</p>
                </div>
            </div>
            <div class="details">
                <h3>Ingredients</h3>
                <p>${product.ingredients_text || 'Not available'}</p>
                <h3>Additives</h3>
                <p>${product.additives_tags ? product.additives_tags.join(', ').replace(/en:/g, '') : 'None listed'}</p>
            </div>
        `;

        card.innerHTML = content;
        resultsContainer.appendChild(card);
    }
});