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
import { getFirestore, collection, writeBatch, query, getDocs, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
// NEW: Import Papa from the PapaParse CDN as a module
import Papa from 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Get references to HTML elements
const csvFileInput = document.getElementById('csvFile');
const uploadButton = document.getElementById('uploadButton');
const uploadMessage = document.getElementById('uploadMessage');
const uploadProgress = document.getElementById('uploadProgress');

let parsedData = []; // To store the parsed CSV data

document.addEventListener('DOMContentLoaded', () => {
    // Authenticate user anonymously on page load
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Firebase authenticated anonymously:", user.uid);
            uploadMessage.textContent = 'Authenticated. Ready to upload CSV. Select a file.';
            // Button is enabled after file selection, not just auth.
            // uploadButton.disabled = false; 
        } else {
            signInAnonymously(auth)
                .then(() => {
                    uploadMessage.textContent = 'Authenticating...';
                })
                .catch((error) => {
                    console.error("Anonymous authentication failed:", error);
                    uploadMessage.textContent = `Authentication failed: ${error.message}. Cannot upload.`;
                    uploadButton.disabled = true; // Still disable if auth fails
                });
        }
    });

    // Disable button initially until a file is selected and parsed
    uploadButton.disabled = true; 
    uploadMessage.textContent = 'Authenticating... Please select a CSV file.';


    // Event listener for file selection
    csvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadMessage.textContent = 'Parsing CSV file...';
            uploadButton.disabled = true; // Disable until parsing is done

            // Use the imported Papa object
            Papa.parse(file, { // Changed from PapaParse.parse to Papa.parse
                header: true, // Assuming the first row is headers
                dynamicTyping: true, // Convert numbers/booleans to their types
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        uploadMessage.textContent = `Error parsing CSV: ${results.errors[0].message}`;
                        console.error('CSV Parsing Errors:', results.errors);
                        uploadButton.disabled = true;
                    } else if (results.data.length === 0) {
                        uploadMessage.textContent = 'CSV file is empty or contains no valid data.';
                        uploadButton.disabled = true;
                    } else {
                        parsedData = results.data;
                        uploadMessage.textContent = `CSV parsed successfully. Found ${parsedData.length} rows. Click Upload.`;
                        // Enable button only if authenticated AND file parsed
                        if (auth.currentUser) { // Check if user is already authenticated
                            uploadButton.disabled = false; 
                        } else {
                            // If auth not yet complete (though it should be by now), leave disabled
                            uploadMessage.textContent += " Waiting for authentication to complete...";
                        }
                    }
                },
                error: (error) => {
                    uploadMessage.textContent = `File read error: ${error.message}`;
                    console.error('CSV Read Error:', error);
                    uploadButton.disabled = true;
                }
            });
        } else {
            uploadMessage.textContent = 'No file selected.';
            parsedData = [];
            uploadButton.disabled = true;
        }
    });

    // Event listener for upload button click
    uploadButton.addEventListener('click', async () => {
        if (parsedData.length === 0) {
            uploadMessage.textContent = 'Please select a CSV file first.';
            return;
        }

        uploadButton.disabled = true;
        csvFileInput.disabled = true;
        uploadMessage.textContent = 'Uploading data to Firestore...';
        uploadProgress.style.display = 'block';
        uploadProgress.value = 0;

        try {
            // Step 1: Clear existing companies from Firestore
            uploadMessage.textContent = 'Clearing old data from Firestore...';
            await clearCompaniesCollection(db);
            uploadProgress.value = 10; // Indicate progress

            // Step 2: Upload new data to Firestore in batches
            uploadMessage.textContent = `Uploading ${parsedData.length} new companies...`;
            await uploadCompaniesToFirestore(db, parsedData, (progress) => {
                uploadProgress.value = 10 + (progress * 0.9); // 10% for clearing, 90% for upload
            });

            uploadProgress.value = 100;
            uploadMessage.textContent = 'Data upload complete! Your app will now use the new data.';
            console.log('Data upload complete!');

        } catch (error) {
            uploadMessage.textContent = `Upload failed: ${error.message}. Check console for details.`;
            console.error('Firestore upload error:', error);
        } finally {
            uploadButton.disabled = false;
            csvFileInput.disabled = false;
            // You might want to hide the progress bar after a short delay
            setTimeout(() => { uploadProgress.style.display = 'none'; }, 2000);
        }
    });
}); // End DOMContentLoaded

// --- Firestore Utility Functions ---

// Function to clear all documents from the 'companies' collection
async function clearCompaniesCollection(dbInstance) {
    const companiesCollectionRef = collection(dbInstance, 'companies');
    const q = query(companiesCollectionRef); // Get all documents
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log("No existing documents to clear.");
        return;
    }

    const batch = writeBatch(dbInstance);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleared ${snapshot.size} old documents.`);
}

// Function to upload parsed CSV data to Firestore in batches
async function uploadCompaniesToFirestore(dbInstance, data, onProgress) {
    const companiesCollectionRef = collection(dbInstance, 'companies');
    const batchSize = 500; // Firestore allows up to 500 operations per batch
    let uploadedCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = writeBatch(dbInstance);
        const chunk = data.slice(i, i + batchSize);

        chunk.forEach(row => {
            // Firestore documents cannot contain undefined values.
            const companyData = {};
            for (const key in row) {
                if (row[key] !== undefined && row[key] !== null) {
                    companyData[key] = row[key];
                }
            }
            if (Object.keys(companyData).length > 0) { // Only add if not empty
                batch.set(doc(companiesCollectionRef), companyData); // Firestore auto-generates document ID
            }
        });
        await batch.commit();
        uploadedCount += chunk.length;
        if (onProgress) {
            onProgress(uploadedCount / data.length); // Report progress (0 to 1)
        }
        console.log(`Uploaded batch, total: ${uploadedCount}`);
    }
}