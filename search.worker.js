// search.worker.js

let companyData = []; // This will hold the data inside the worker

// Listen for messages from the main script
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'initData':
            // When the main script sends the company data, store it
            companyData = payload;
            console.log('Worker received data:', companyData.length, 'rows');
            break;
        case 'search':
            // When the main script sends a search term, perform the search
            const searchTerm = payload.toLowerCase().trim();

            if (searchTerm.length === 0) {
                // Send empty results back if search term is empty
                self.postMessage({ type: 'searchResults', payload: [] });
                return;
            }

            const filteredCompanies = companyData.filter(company => {
                // IMPORTANT: Use the correct header name here too!
                // It should be 'Organisation Name'
                return company['Organisation Name'] && String(company['Organisation Name']).toLowerCase().includes(searchTerm);
            });

            // Send the filtered results back to the main script
            self.postMessage({ type: 'searchResults', payload: filteredCompanies });
            break;
    }
};