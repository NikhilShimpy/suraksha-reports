// ---------------- FIREBASE CONFIG ----------------
const firebaseConfig = {
    apiKey: "AIzaSyAkIp1wIdz7LTa5rZ2YJfoKcxTtUEflyhI",
    authDomain: "samudra-suraksha-477cf.firebaseapp.com",
    projectId: "samudra-suraksha-477cf",
    storageBucket: "samudra-suraksha-477cf.firebasestorage.app",
    messagingSenderId: "538135967467",
    appId: "1:538135967467:web:938ca314bf21e10acd70ae"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---------------- DOM ELEMENTS ----------------
const reportForm = document.getElementById('reportForm');
const messageDiv = document.getElementById('message');
const reportDetailsDiv = document.getElementById('reportDetails');
const mediaInput = document.getElementById('media');

// ---------------- LEAFLET MAP ----------------
let map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let marker;
map.on('click', function(e) {
    const {lat, lng} = e.latlng;
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);

    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);

    reverseGeocode(lat, lng);
});

// ---------------- REVERSE GEOCODE ----------------
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await response.json();
        const address = data.address;

        document.getElementById('state').value = address.state || '';
        document.getElementById('district').value = address.county || '';
        document.getElementById('city').value = address.city || address.town || '';
        document.getElementById('town').value = address.suburb || '';
        document.getElementById('village').value = address.village || address.hamlet || address.neighbourhood || '';
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
    }
}

// ---------------- CLOUDINARY CONFIG ----------------
const cloudName = "dtarhtz5w"; // your Cloudinary cloud name
const unsignedUploadPreset = "reports"; // your unsigned preset

async function uploadMedia(file) {
    try {
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", unsignedUploadPreset);

        const response = await fetch(url, { method: "POST", body: formData });
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);
        return data.secure_url;
    } catch (err) {
        console.error("Upload failed:", err);
        throw err;
    }
}

// ---------------- MEDIA PREVIEW ----------------
const mediaPreviewDiv = document.createElement('div');
mediaPreviewDiv.id = "mediaPreview";
mediaPreviewDiv.style.marginTop = "10px";
mediaInput.parentNode.insertBefore(mediaPreviewDiv, mediaInput.nextSibling);

mediaInput.addEventListener('change', function() {
    mediaPreviewDiv.innerHTML = "";
    const files = mediaInput.files;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let element;
        if (file.type.startsWith('image/')) {
            element = document.createElement('img');
            element.src = URL.createObjectURL(file);
            element.style.height = "100px";
            element.style.marginRight = "10px";
        } else if (file.type.startsWith('video/')) {
            element = document.createElement('video');
            element.src = URL.createObjectURL(file);
            element.controls = true;
            element.style.height = "100px";
            element.style.marginRight = "10px";
        }
        mediaPreviewDiv.appendChild(element);
    }
});

// ---------------- SUBMIT REPORT ----------------
reportForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    messageDiv.textContent = "Uploading...";

    try {
        const disasterType = document.getElementById('disasterType').value;
        const state = document.getElementById('state').value.trim();
        const district = document.getElementById('district').value.trim();
        const city = document.getElementById('city').value.trim();
        const town = document.getElementById('town').value.trim();
        const village = document.getElementById('village').value.trim();
        const latitude = parseFloat(document.getElementById('latitude').value);
        const longitude = parseFloat(document.getElementById('longitude').value);
        const severityScore = parseInt(document.getElementById('severityScore').value);
        const description = document.getElementById('description').value.trim();
        const files = mediaInput.files;

        if (!disasterType || !state || !district || !latitude || !longitude || !description) {
            messageDiv.textContent = "Please fill all required fields.";
            return;
        }

        let mediaUrls = [];
        for (let i = 0; i < files.length; i++) {
            const url = await uploadMedia(files[i]);
            mediaUrls.push(url);
        }

        const locationId = "LOC" + Math.floor(Math.random() * 100000).toString().padStart(5,'0');
        const userId = "user123";

        const report = {
            location_id: locationId,
            disaster_type: disasterType,
            state, district, city, town, village,
            latitude, longitude,
            severity_score: severityScore,
            description,
            media_urls: mediaUrls,
            user_id: userId,
            report_count: 1,
            timestamp: new Date().toISOString()
        };

        await db.collection('reports').add(report);

        messageDiv.textContent = "Report submitted successfully!";
        displayReport(report);
        reportForm.reset();
        mediaPreviewDiv.innerHTML = "";
        if (marker) { map.removeLayer(marker); marker = null; }

    } catch (error) {
        console.error(error);
        messageDiv.textContent = "Error submitting report.";
    }
});

// ---------------- DISPLAY REPORT ----------------
function displayReport(report) {
    reportDetailsDiv.innerHTML = `
        <h3>Report Details</h3>
        <p><strong>User ID:</strong> ${report.user_id}</p>
        <p><strong>Timestamp:</strong> ${report.timestamp}</p>
        <p><strong>Location:</strong> ${report.state}, ${report.district}, ${report.city || ''}, ${report.town || ''}, ${report.village || ''}</p>
        <p><strong>Latitude:</strong> ${report.latitude}</p>
        <p><strong>Longitude:</strong> ${report.longitude}</p>
        <p><strong>Disaster Type:</strong> ${report.disaster_type}</p>
        <p><strong>Severity Score:</strong> ${report.severity_score}</p>
        <p><strong>Description:</strong> ${report.description}</p>
        <p><strong>Media Files:</strong></p>
        ${report.media_urls.length > 0 ? report.media_urls.map(url => `<a href="${url}" target="_blank">${url}</a><br/>`).join('') : 'No media files uploaded.'}
    `;
}
