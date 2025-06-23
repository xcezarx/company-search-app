// --- IMPORTANT: PASTE YOUR FIREBASE CONFIG HERE ---
// Get this from your Firebase Console -> Project settings -> Your apps -> Web app (</>)
const firebaseConfig = {
  apiKey: "AIzaSyAS72Cjt7_FU__sBvfwIjXCG_Narja3zDE",
  authDomain: "sponsor-company-list.firebaseapp.com",
  projectId: "sponsor-company-list",
  storageBucket: "sponsor-company-list.firebasestorage.app",
  messagingSenderId: "522607520904",
  appId: "1:522607520904:web:16c87602c0f8b8d1e0033d"
};
// --- END OF FIREBASE CONFIG ---

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('results');
    const loadingMessage = document.getElementById('loadingMessage');

    let allCompanies = []; // Stores all parsed companies, will now come from Firestore
    let searchWorker; // Reference to the Web Worker

    // Function to initialize or re-initialize the Web Worker
    function initializeWorker() {
        if (searchWorker) {
            searchWorker.terminate(); // Terminate existing worker if any
        }
        searchWorker = new Worker('search.worker.js');

        searchWorker.onmessage = (event) => {
            const { type, payload } = event.data;

            if (type === 'search_results') {
                loadingMessage.style.display = 'none';
                displayResults(payload.results, payload.query);
            } else if (type === 'data_loaded') {
                allCompanies = payload; // Worker now confirms data is indexed
                loadingMessage.style.display = 'none';
            }
        };

        searchWorker.onerror = (error) => {
            console.error('Worker error:', error);
            loadingMessage.textContent = 'Error during worker operation.';
            loadingMessage.style.display = 'block';
        };
    }

    // Initialize worker when the DOM is loaded
    initializeWorker();

    // --- NEW: Load data from Firestore ---
    async function loadCompaniesFromFirestore() {
        loadingMessage.textContent = 'Loading companies from database...';
        loadingMessage.style.display = 'block';
        
        try {
            const companiesCol = collection(db, 'companies');
            const companySnapshot = await getDocs(companiesCol);
            const companiesList = companySnapshot.docs.map(doc => doc.data());
            
            if (companiesList.length === 0) {
                loadingMessage.textContent = 'No companies found in the database. Please upload a CSV on the "Manage Data" page.';
                resultsContainer.innerHTML = ''; // Clear any old results
                return;
            }

            // Post the fetched data directly to the worker
            searchWorker.postMessage({ type: 'load_data', payload: companiesList });
            console.log(`Loaded ${companiesList.length} companies from Firestore.`);

        } catch (error) {
            console.error("Error loading companies from Firestore:", error);
            loadingMessage.textContent = `Error loading companies: ${error.message}.`;
            // You might want to display a fallback message or try to reload
        }
    }

    // Call the function to load data from Firestore
    loadCompaniesFromFirestore();

    // Function to perform search (now called by button click)
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

    // Helper for debouncing (no longer strictly needed for button, but good practice if you re-add live search)
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Function to display search results
    function displayResults(results, query) {
        resultsContainer.innerHTML = ''; // Clear previous results

        const resultsCountPara = document.createElement('p');
        resultsCountPara.classList.add('results-count'); 
        resultsCountPara.style.textAlign = 'center'; 
        resultsCountPara.style.color = '#343a40';
        resultsCountPara.style.fontSize = '0.9em';
        resultsCountPara.style.marginBottom = '15px';
        resultsCountPara.style.marginTop = '10px';
        
        if (results.length > 0) {
            resultsCountPara.textContent = `Found ${results.length} companies.`;
            resultsContainer.appendChild(resultsCountPara);

            const ul = document.createElement('ul');
            results.forEach(company => {
                const li = document.createElement('li');
                // Ensure 'name' property exists for display
                const companyName = company.name || 'Unknown Company'; 
                const highlightedName = companyName.replace(new RegExp(`(${query})`, 'gi'), '<span class="highlight">$1</span>');
                li.innerHTML = highlightedName;
                ul.appendChild(li);
            });
            resultsContainer.appendChild(ul);
        } else {
            resultsCountPara.textContent = `No companies found matching "${query}".`;
            resultsContainer.appendChild(resultsCountPara);
            resultsContainer.innerHTML += '<p style="text-align: center; color: #6c757d; margin-top: 20px;">Try a different search term.</p>';
        }
    }
});