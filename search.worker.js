let allCompanies = []; // Stores all parsed companies
let searchIndex = {}; // Stores the search index (e.g., using object for fast lookup)

// Function to build the search index
function buildSearchIndex(companies) {
    searchIndex = {}; // Reset index
    companies.forEach(company => {
        // Ensure you're pulling the correct name from the Firestore document structure
        const companyName = company['Organisation Name'] || ''; 
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
            // *** CRITICAL CHANGE HERE: Create a new object for the result ***
            // Include a 'name' property that script.js expects
            // And any other properties you might want to display later
            results.push({
                name: searchIndex[name]['Organisation Name'], // Use the correct field from your Firestore doc
                // If you want to display other fields later, include them here:
                // county: searchIndex[name]['County'],
                // townCity: searchIndex[name]['Town/City'],
                // ...etc.
            });
        }
    }
    return results;
}

// Event listener for messages from the main thread
self.onmessage = (event) => {
    const { type, payload, query } = event.data;

    if (type === 'load_data') {
        // Payload is now the array of company objects directly from Firestore
        allCompanies = payload;
        buildSearchIndex(allCompanies);
        self.postMessage({ type: 'data_loaded', payload: allCompanies }); // Confirm data loaded and indexed
    } else if (type === 'search') {
        const results = performSearch(query);
        self.postMessage({ type: 'search_results', payload: { results, query } });
    }
};