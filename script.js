// No Firebase configuration or imports needed anymore in script.js
// as data will be loaded from CSV via the worker.

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('results');
    const loadingMessage = document.getElementById('loadingMessage');

    let searchWorker; // Reference to the Web Worker

    // Function to initialize or re-initialize the Web Worker
    function initializeWorker() {
        if (searchWorker) {
            searchWorker.terminate(); // Terminate existing worker if any
        }
        searchWorker = new Worker('search.worker.js'); // Ensure this matches your worker file name

        searchWorker.onmessage = (event) => {
            const { type, payload } = event.data;

            if (type === 'search_results') {
                loadingMessage.style.display = 'none';
                displayResults(payload.results, payload.query);
            } else if (type === 'data_loaded') {
                // Worker now confirms data is indexed and ready
                loadingMessage.style.display = 'none';
                resultsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; margin-top: 20px;">Enter a company name to start searching.</p>';
                console.log(`Worker has finished loading and indexing companies.`);
            } else if (type === 'error') { // Handle errors from the worker
                console.error('Worker error:', payload);
                loadingMessage.textContent = `Error: ${payload.message || 'An unknown error occurred in the worker.'}`;
                loadingMessage.style.display = 'block';
            }
        };

        searchWorker.onerror = (error) => {
            console.error('Worker error:', error);
            loadingMessage.textContent = 'Critical worker error. Check console.';
            loadingMessage.style.display = 'block';
        };
    }

    // Initialize worker when the DOM is loaded
    initializeWorker();

    // --- NEW: Initiate data loading in the worker ---
    function initiateWorkerDataLoad() {
        loadingMessage.textContent = 'Loading and indexing companies... This might take a moment.';
        loadingMessage.style.display = 'block';

        // Tell the worker to load the CSV
        // Make sure this CSV_FILE_PATH is correct relative to your index.html
        searchWorker.postMessage({ type: 'load_csv', payload: 'companies.csv' });
    }

    // Call the function to initiate data load
    initiateWorkerDataLoad();


    // Function to perform search (called by button click or Enter key)
    function performSearch() {
        const query = searchInput.value.toLowerCase().trim();

        resultsContainer.innerHTML = '';

        if (query.length < 2) {
            loadingMessage.style.display = 'none';
            resultsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; margin-top: 20px;">Type at least 2 characters and click Search.</p>';
            return;
        }

        loadingMessage.textContent = 'Searching...';
        loadingMessage.style.display = 'block';
        searchWorker.postMessage({ type: 'search', query: query });
    }

    // --- EVENT LISTENERS ---
    searchButton.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    // Function to display search results
    function displayResults(results, query) {
        resultsContainer.innerHTML = ''; // Clear previous results

        const resultsCountPara = document.createElement('p');
        resultsCountPara.classList.add('results-count');
        resultsCountPara.style.textAlign = 'center';
        resultsCountPara.style.color = '#6c757d';
        resultsCountPara.style.fontSize = '0.9em';
        resultsCountPara.style.marginBottom = '15px';
        resultsCountPara.style.marginTop = '10px';

        if (results.length > 0) {
            resultsCountPara.textContent = `Found ${results.length} companies.`;
            resultsContainer.appendChild(resultsCountPara);

            const ul = document.createElement('ul');
            results.forEach(company => {
                const li = document.createElement('li');
                li.classList.add('company-result-item'); // Add a class for potential styling

                const companyName = company.name || 'Unknown Company';
                const highlightedName = companyName.replace(new RegExp(`(${query})`, 'gi'), '<span class="highlight">$1</span>');

                let detailsHtml = `
                    <h3>${highlightedName}</h3>
                `;

                // Add details only if they exist in the company object
                // These properties are now expected to come from search.worker.js
                if (company.townCity) {
                    detailsHtml += `<p><strong>Town/City:</strong> ${company.townCity}</p>`;
                }