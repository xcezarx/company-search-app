let allCompanies = []; // Stores all parsed companies
let searchIndex = {}; // Stores the search index (e.g., using object for fast lookup)

// Function to build the search index
function buildSearchIndex(companies) {
    searchIndex = {}; // Reset index
    companies.forEach(company => {
        // Assuming your CSV has a 'Company Name' column or similar
        // Adjust 'Company Name' to match the actual header in your CSV
        const companyName = company['Organisation Name'] || company.name || ''; 
        if (companyName) {
            const lowerCaseName = companyName.toLowerCase();
            // Store original company data, indexed by a simplified name or unique ID
            searchIndex[lowerCaseName] = company; 
        }
    });
    console.log("Search index built with", Object.keys(searchIndex).length, "companies.");
}

// Function to perform the search
function performSearch(query) {
    if (!query) {
        return [];
    }
    const lowerCaseQuery = query.toLowerCase();
    const results = [];

    // Simple substring search in company names
    for (const name in searchIndex) {
        if (name.includes(lowerCaseQuery)) {
            results.push(searchIndex[name]);
        }
    }
    return results;
}

// Event listener for messages from the main thread
self.onmessage = (event) => {
    const { type, payload, query } = event.data;

    if (type === 'load_data') {
        // Payload is now the array of company objects directly
        allCompanies = payload;
        buildSearchIndex(allCompanies);
        self.postMessage({ type: 'data_loaded', payload: allCompanies }); // Confirm data loaded and indexed
    } else if (type === 'search') {
        const results = performSearch(query);
        self.postMessage({ type: 'search_results', payload: { results, query } });
    }
};