// Import PapaParse library into the worker's scope
importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

let allCompanies = []; // Stores all parsed companies
let searchIndex = {}; // Stores the search index

// Function to build the search index
function buildSearchIndex(companies) {
    searchIndex = {}; // Reset index
    companies.forEach(company => {
        const companyName = company['Organisation Name'] || company.name || '';
        if (companyName) {
            const lowerCaseName = companyName.toLowerCase();
            searchIndex[lowerCaseName] = company;
        }
    });
    console.log("Worker: Search index built with", Object.keys(searchIndex).length, "companies.");
}

// Function to perform the search
function performSearch(query) {
    if (!query) {
        return [];
    }
    const lowerCaseQuery = query.toLowerCase();
    const results = [];

    // Simple substring search in company names
    for (const nameKey in searchIndex) {
        if (nameKey.includes(lowerCaseQuery)) {
            const companyData = searchIndex[nameKey];
            results.push({
                name: companyData['Organisation Name'] || companyData.name, // Ensure 'name' is always present for display
                // *** ADD THESE LINES TO INCLUDE MORE DATA ***
                townCity: companyData['Town/City'],
                county: companyData['County'],
                typeRating: companyData['Type & Rating'],
                route: companyData['Route']
                // Add any other fields from your CSV here
            });
        }
    }
    return results;
}

// Event listener for messages from the main thread
self.onmessage = async (event) => {
    const { type, payload, query } = event.data;

    if (type === 'load_csv') {
        const csvFilePath = payload;
        try {
            const response = await fetch(csvFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();

            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        console.error('Worker: CSV Parsing Errors:', results.errors);
                        self.postMessage({ type: 'error', payload: { message: `CSV parsing error: ${results.errors[0].message}` } });
                        return;
                    }
                    allCompanies = results.data;
                    buildSearchIndex(allCompanies);
                    self.postMessage({ type: 'data_loaded' });
                },
                error: (error) => {
                    console.error('Worker: CSV Read Error:', error);
                    self.postMessage({ type: 'error', payload: { message: `CSV read error: ${error.message}` } });
                }
            });
        } catch (error) {
            console.error('Worker: Failed to load or parse CSV:', error);
            self.postMessage({ type: 'error', payload: { message: `Failed to load CSV: ${error.message}` } });
        }
    } else if (type === 'search') {
        const results = performSearch(query);
        self.postMessage({ type: 'search_results', payload: { results, query } });
    }
};