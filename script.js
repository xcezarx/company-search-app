document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingMessage = document.getElementById('loadingMessage');
    let companyData = []; // This will store our parsed company data

    // --- Function to load and parse the CSV ---
    async function loadCSV() {
        loadingMessage.style.display = 'block'; // Show loading message
        resultsContainer.innerHTML = ''; // Clear any previous results/messages

        try {
            const response = await fetch('./your_companies.csv'); // Path to your CSV file
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();

            // Use Papa Parse to efficiently parse the CSV
            Papa.parse(csvText, {
                header: true, // Assuming your CSV has a header row
                dynamicTyping: true, // Convert numbers, booleans where appropriate
                skipEmptyLines: true, // Don't include empty rows
                worker: true, // Use a web worker for parsing to avoid freezing the UI for large files
                complete: function(results) {
                    companyData = results.data;
                    console.log('CSV loaded and parsed:', companyData.length, 'rows');
                    loadingMessage.style.display = 'none'; // Hide loading message
                    searchInput.removeAttribute('disabled'); // Enable search input
                    searchInput.focus(); // Focus on the search input
                    displayResults([]); // Optionally display nothing or a message initially
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
            // IMPORTANT: Replace 'CompanyNameColumn' with the actual header name of your company name column in the CSV.
            // For example, if your CSV has a header 'Company Name', use company['Company Name']
            // If it's just 'Company', use company.Company
            li.textContent = company['Organisation Name'] || JSON.stringify(company); // Fallback if column name is wrong
            ul.appendChild(li);
        });
        resultsContainer.appendChild(ul);
    }

    // --- Search Functionality ---
    searchInput.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();

        if (searchTerm.length === 0) {
            displayResults([]); // Clear results if search bar is empty
            return;
        }

        const filteredCompanies = companyData.filter(company => {
            // IMPORTANT: Adjust 'CompanyNameColumn' here too
            // Ensure the column exists and convert to lowercase for comparison
            return company['Organisation Name'] && String(company['Organisation Name']).toLowerCase().includes(searchTerm);
        });

        displayResults(filteredCompanies);
    });

    // --- Initial Load ---
    searchInput.setAttribute('disabled', 'true'); // Disable input until CSV is loaded
    loadCSV();
});