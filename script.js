document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingMessage = document.getElementById('loadingMessage');
    const searchIndicator = document.getElementById('searchIndicator'); // Ensure this element is in index.html or created here

    let companyData = []; // Main script will hold data initially to pass to worker
    let searchWorker; // Variable for our Web Worker

    // --- Debounce function ---
    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    };

    // --- Function to load and parse the CSV ---
    async function loadCSV() {
        loadingMessage.style.display = 'block'; // Show loading message
        resultsContainer.innerHTML = ''; // Clear any previous results/messages
        searchInput.setAttribute('disabled', 'true'); // Disable input until CSV is loaded

        try {
            const response = await fetch('./your_companies.csv'); // Path to your CSV file
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();

            // Use Papa Parse to efficiently parse the CSV
            // Papa Parse's worker is for parsing, our new worker is for searching
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                worker: true, // Keep Papa Parse's worker for initial CSV parsing
                complete: function(results) {
                    companyData = results.data; // Store data in main thread first
                    console.log('CSV loaded and parsed in main thread:', companyData.length, 'rows');
                    loadingMessage.style.display = 'none'; // Hide loading message

                    // --- Initialize and send data to Web Worker ---
                    try {
                        searchWorker = new Worker('search.worker.js'); // Create the worker
                        // Send the entire dataset to the worker *once*
                        searchWorker.postMessage({ type: 'initData', payload: companyData });

                        // Listen for messages FROM the worker (i.e., search results)
                        searchWorker.onmessage = function(event) {
                            if (event.data.type === 'searchResults') {
                                displayResults(event.data.payload); // Display results from worker
                            }
                        };

                        searchInput.removeAttribute('disabled'); // Enable search input
                        searchInput.focus(); // Focus on the search input
                        displayResults([]); // Optionally display nothing or a message initially
                    } catch (workerError) {
                        console.error("Error creating or initializing Web Worker:", workerError);
                        resultsContainer.innerHTML = '<p style="color: red;">Browser does not support Web Workers or worker file not found.</p>';
                        // Fallback to main thread search if worker fails (optional, but good for robustness)
                        searchInput.removeAttribute('disabled');
                        // In a fallback scenario, you might call performSearch directly here
                    }

                },
                error: function(err) {
                    console.error('Error parsing CSV:', err.message);
                    loadingMessage.style.display = 'none';
                    resultsContainer.innerHTML = '<p style="color: red;">Error loading data. Please try again later.</p>';
                }
            });

        } catch (error) {
            console.error('Error fetching CSV:', error);
            loadingMessage.style.display = 'none';
            resultsContainer.innerHTML = '<p style="color: red;">Could not fetch data. Check your internet connection or file path.</p>';
        }
    }

    // --- Function to display search results ---
    function displayResults(results) {
        resultsContainer.innerHTML = ''; // Clear previous results
        if (searchIndicator) searchIndicator.style.display = 'none'; // Hide search indicator

        if (results.length === 0 && searchInput.value.trim() !== '') {
            resultsContainer.innerHTML = '<p>No companies found matching your search.</p>';
            return;
        }
        if (results.length === 0 && searchInput.value.trim() === '') {
             resultsContainer.innerHTML = '<p>Start typing to search for company names.</p>';
             return;
        }

        const ul = document.createElement('ul');
        results.forEach(company => {
            const li = document.createElement('li');
            // IMPORTANT: Use the correct header name here too!
            // It should be 'Organisation Name'
            li.textContent = company['Organisation Name'] || JSON.stringify(company);
            ul.appendChild(li);
        });
        resultsContainer.appendChild(ul);
    }

    // --- Actual search triggering logic (sends message to worker) ---
    function triggerSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm.length === 0) {
            displayResults([]); // Clear results if search bar is empty
            return;
        }

        if (searchIndicator) searchIndicator.style.display = 'block'; // Show search indicator
        
        // Send the search term to the worker
        if (searchWorker) {
            searchWorker.postMessage({ type: 'search', payload: searchTerm });
        } else {
            console.error("Search Worker not initialized.");
            resultsContainer.innerHTML = '<p style="color: red;">Search functionality not available.</p>';
        }
    }

    // --- Debounced Search Input Event Listener ---
    // Calls triggerSearch only after 300ms of no typing
    searchInput.addEventListener('input', debounce(triggerSearch, 300));

    // --- Initial Load ---
    loadCSV();
});