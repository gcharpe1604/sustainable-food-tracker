// ============================================
// OpenFoodFacts API Service
// ============================================

const API_BASE = 'https://world.openfoodfacts.org';

async function fetchProductByBarcode(barcode) {
    const response = await fetch(`${API_BASE}/api/v2/product/${barcode}`);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
        return enrichProduct(data.product);
    }
    return null;
}

// Search for products by name
async function searchProductsByName(name, limit = 1) {
    const url = `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(name)}&json=1&page_size=${limit}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
        return data.products.map(product => enrichProduct(product));
    }
    return [];
}

// Search for similar products (for suggestions)
async function searchSimilarProducts(category, limit = 10) {
    const url = `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(category)}&json=1&page_size=${limit}&sort_by=unique_scans_n`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
        return data.products.map(product => enrichProduct(product));
    }
    return [];
}

// --------------------------------------------
// Data Processing Functions
// --------------------------------------------

// Add extra processed data to a product
function enrichProduct(product) {
    product.ingredients_list = extractIngredients(product);
    product.allergens_list = extractAllergens(product);
    product.additives_list = extractAdditives(product);
    product.health_score = calculateHealthScore(product);
    return product;
}

// Extract and format ingredients
function extractIngredients(product) {
    const ingredients = [];
    
    // Get ingredients as text
    if (product.ingredients_text) {
        ingredients.push({
            type: 'text',
            content: product.ingredients_text
        });
    }
    
    // Get structured ingredients with percentages
    if (product.ingredients && Array.isArray(product.ingredients)) {
        product.ingredients.forEach(ingredient => {
            ingredients.push({
                type: 'structured',
                text: ingredient.text,
                percent: ingredient.percent_estimate || ingredient.percent
            });
        });
    }
    
    return ingredients;
}

// Extract allergen information
function extractAllergens(product) {
    const allergens = [];
    
    if (product.allergens_tags && Array.isArray(product.allergens_tags)) {
        product.allergens_tags.forEach(tag => {
            const cleanName = tag
                .replace('en:', '')
                .replace(/-/g, ' ')
                .toUpperCase();
            
            allergens.push({
                name: cleanName,
                tag: tag
            });
        });
    }
    
    return allergens;
}

// Extract additives with E-numbers
function extractAdditives(product) {
    const additives = [];
    
    if (product.additives_tags && Array.isArray(product.additives_tags)) {
        product.additives_tags.forEach(tag => {
            const name = tag.replace('en:', '').replace(/-/g, ' ');
            const eNumber = tag.match(/e\d+/i)?.[0]?.toUpperCase();
            
            additives.push({
                name: name,
                code: eNumber,
                tag: tag
            });
        });
    }
    
    return additives;
}

// Calculate overall health score (0-100)
function calculateHealthScore(product) {
    let score = 50; // Start at 50
    
    // Grade scoring system
    const gradeScores = {
        'a': 20,  // Excellent
        'b': 10,  // Good
        'c': 0,   // Average
        'd': -10, // Poor
        'e': -20  // Bad
    };
    
    // Add points for nutrition grade
    const nutritionGrade = product.nutrition_grades || product.nutriscore_grade;
    score += gradeScores[nutritionGrade?.toLowerCase()] || 0;
    
    // Add points for eco score
    const ecoScore = product.ecoscore_grade;
    score += gradeScores[ecoScore?.toLowerCase()] || 0;
    
    // Subtract points for additives (2 points per additive)
    const additives = product.additives_tags || [];
    score -= additives.length * 2;
    
    // Bonus/penalty based on nutrients
    const nutrients = product.nutriments || {};
    if (nutrients.fiber_100g > 5) score += 5;        // High fiber bonus
    if (nutrients.proteins_100g > 10) score += 5;    // High protein bonus
    if (nutrients.sugars_100g > 20) score -= 10;     // High sugar penalty
    if (nutrients.salt_100g > 2) score -= 10;        // High salt penalty
    
    // Keep score between 0 and 100
    return Math.max(0, Math.min(100, score));
}
