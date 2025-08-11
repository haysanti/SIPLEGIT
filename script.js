const SPREADSHEET_API_URL = "https://script.google.com/macros/s/AKfycbwl0-a5GBlvqUBXW772_s8hUk3UtZnoZA_JlU5BboqWZmNd5_XSi-eS2-7vtIFdLzfu2Q/exec";


// Ambil referensi ke elemen-elemen DOM
const homePage = document.getElementById('home-page');
const progressPage = document.getElementById('progress-page');
const archivePage = document.getElementById('archive-page');
const loadingSpinner = document.getElementById('loading-spinner');
const customModal = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// BARU: Tambahkan referensi untuk tombol tutup modal (ikon silang)
const modalCloseIcon = document.createElement('button');
modalCloseIcon.innerHTML = `<svg class="h-6 w-6 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
modalCloseIcon.classList.add('absolute', 'top-4', 'right-4', 'p-1', 'rounded-full', 'hover:bg-gray-100', 'focus:outline-none');
modalCloseIcon.addEventListener('click', () => {
    customModal.classList.add('hidden'); // Sembunyikan modal saat ikon silang diklik
});
// Masukkan ikon silang ke dalam modal (di bagian atas)
document.querySelector('#custom-modal > div').prepend(modalCloseIcon);


const searchForm = document.getElementById('search-form');
const skNumberInput = document.getElementById('sk-number-input');
const showArchiveBtn = document.getElementById('show-archive-btn');

const progressResults = document.getElementById('progress-results');
const backToHomeBtn = document.getElementById('back-to-home-btn');

const archiveSearchForm = document.getElementById('archive-search-form');
const archiveKeywordInput = document.getElementById('archive-keyword-input');
const archiveResults = document.getElementById('archive-results');
const backFromArchiveBtn = document.getElementById('back-from-archive-btn');

// Fungsi untuk menampilkan dan menyembunyikan halaman
function showPage(pageId) {
    const pages = [homePage, progressPage, archivePage, loadingSpinner];
    pages.forEach(page => page.classList.add('hidden'));

    if (pageId === 'loading') {
        loadingSpinner.classList.remove('hidden');
    } else if (pageId === 'home') {
        homePage.classList.remove('hidden');
    } else if (pageId === 'progress') {
        progressPage.classList.remove('hidden');
    } else if (pageId === 'archive') {
        archivePage.classList.remove('hidden');
    }
}

// Fungsi untuk menampilkan modal kustom (pengganti alert)
function showCustomModal(title, message, isPasswordPrompt = false) {
    modalTitle.textContent = title;
    modalMessage.innerHTML = message; // Gunakan innerHTML untuk input field
    
    // Jika ini adalah prompt password, tambahkan input field
    if (isPasswordPrompt) {
        modalMessage.innerHTML += `<input type="password" id="password-input" placeholder="Masukkan password" class="mt-4 p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-maroon">`;
        modalCloseBtn.textContent = "Masuk"; // Ubah teks tombol OK menjadi Masuk
        modalCloseBtn.removeEventListener('click', modalCloseHandler); // Hapus event listener lama
        modalCloseBtn.addEventListener('click', passwordSubmitHandler); // Tambahkan event listener baru
        modalCloseIcon.classList.remove('hidden'); // Tampilkan ikon silang
    } else {
        modalCloseBtn.textContent = "OK";
        modalCloseBtn.removeEventListener('click', passwordSubmitHandler); // Hapus event listener password
        modalCloseBtn.addEventListener('click', modalCloseHandler); // Tambahkan event listener OK
        modalCloseIcon.classList.remove('hidden'); // Tampilkan ikon silang
    }
    customModal.classList.remove('hidden');
}

// Handler default untuk menutup modal
const modalCloseHandler = () => {
    customModal.classList.add('hidden');
};
modalCloseBtn.addEventListener('click', modalCloseHandler); // Tambahkan handler default saat inisialisasi

// Handler untuk submit password
const passwordSubmitHandler = () => {
    const passwordInput = document.getElementById('password-input');
    const enteredPassword = passwordInput ? passwordInput.value : '';

    if (enteredPassword === ARCHIVE_PASSWORD) {
        customModal.classList.add('hidden');
        showPage('archive'); // Tampilkan halaman arsip jika password benar
    } else {
        showCustomModal("Akses Ditolak", "Password salah. Silakan coba lagi.");
    }
};


// Fungsi untuk mendapatkan data dari Google Apps Script dengan retry eksponensial
async function fetchData(params, retries = 3, delay = 1000) {
    const url = new URL(SPREADSHEET_API_URL);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 429 && i < retries - 1) { // Too Many Requests
                    console.error(`Request failed with status ${response.status}. Retrying in ${delay}ms...`);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2; // Peningkatan delay eksponensial
                    continue;
                }
                throw new Error(`Error: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            if (i === retries - 1) throw error;
        }
    }
    throw new Error('Gagal mengambil data setelah beberapa kali percobaan.');
}

// Fungsi untuk memproses pencarian progres
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const skNumber = skNumberInput.value.trim();
    if (!skNumber) {
        showCustomModal("Input Kosong", "Silakan masukkan Nomor SK PBG.");
        return;
    }

    showPage('loading');
    try {
        const data = await fetchData({ sk_number: skNumber, type: 'progress' });
        
        if (data.status === 'success' && data.result) {
            displayProgress(data.result);
            showPage('progress');
        } else {
            showCustomModal("Tidak Ditemukan", "Nomor SK PBG tidak ditemukan atau tidak ada data yang tersedia.");
            showPage('home');
        }
    } catch (error) {
        showCustomModal("Kesalahan Server", "Terjadi kesalahan saat mencoba mengambil data. Silakan coba lagi nanti.");
        showPage('home');
    }
});

// Fungsi untuk menampilkan hasil progres
function displayProgress(result) {
    const { sk_number, status, date_received, date_processed, date_verified, date_completed, applicant_name } = result;

    const statuses = ['Diterima', 'Diproses', 'Verifikasi', 'Selesai'];
    const statusDates = {
        'Diterima': date_received,
        'Diproses': date_processed,
        'Verifikasi': date_verified,
        'Selesai': date_completed
    };

    // Tentukan warna status
    let statusTextColorClass = 'text-gray-600'; // Default
    let statusBgColorClass = 'bg-gray-200'; // Default background for progress bar

    if (status === 'Selesai') {
        statusTextColorClass = 'text-green-600';
        statusBgColorClass = 'bg-green-500'; // For progress bar
    } else if (status === 'Ditolak') { // Tambahkan status "Ditolak"
        statusTextColorClass = 'text-red-600';
        statusBgColorClass = 'bg-red-500'; // For progress bar
    } else {
        statusTextColorClass = 'text-maroon'; // Keep maroon for in-progress statuses
        statusBgColorClass = 'bg-maroon'; // Keep maroon for progress bar
    }


    let html = `
        <h3 class="text-xl font-bold mb-2">Nomor SK: ${sk_number}</h3>
        <p class="text-gray-600 mb-2">Nama Pemohon: <span class="font-bold text-gray-800">${applicant_name || 'Tidak Tersedia'}</span></p>
        <p class="text-gray-600 mb-4">Status Terkini: <span class="font-bold ${statusTextColorClass}">${status}</span></p>
        <div class="relative pt-1">
            <div class="flex h-2 mb-4 overflow-hidden text-xs rounded bg-gray-200">
                <div style="width: ${statuses.indexOf(status) * 25 + 25}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${statusBgColorClass} transition-all duration-500 ease-in-out"></div>
            </div>
        </div>
        <div class="space-y-6 mt-8">
    `;

    statuses.forEach(s => {
        const isActive = statuses.indexOf(status) >= statuses.indexOf(s);
        const isCompleted = statuses.indexOf(status) > statuses.indexOf(s);
        
        // Modifikasi ini untuk menghilangkan keterangan waktu jam
        let date = statusDates[s] ? new Date(statusDates[s]).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Belum selesai';
        
        let markerBgClass = 'bg-gray-400';
        let markerIcon = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;

        if (status === 'Selesai' && s === 'Selesai') {
            markerBgClass = 'bg-green-600';
        } else if (status === 'Ditolak' && s === 'Selesai') { // Jika ditolak, status "Selesai" akan menjadi merah
            markerBgClass = 'bg-red-600';
            markerIcon = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`; // Ikon silang
        } else if (isActive) {
            markerBgClass = 'bg-maroon';
        }

        html += `
            <div class="timeline-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                <span class="timeline-marker ${markerBgClass}">
                    ${markerIcon}
                </span>
                <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <h4 class="font-bold text-lg text-gray-800">${s}</h4>
                    <p class="text-sm text-gray-500">${date}</p>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    progressResults.innerHTML = html;
}

const ARCHIVE_PASSWORD = "Semarang@01"; // Contoh password

// Fungsi untuk memproses pencarian arsip
archiveSearchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const keyword = archiveKeywordInput.value.trim();
    if (!keyword) {
        showCustomModal("Input Kosong", "Silakan masukkan kata kunci pencarian.");
        return;
    }

    showPage('loading');
    try {
        const data = await fetchData({ keyword: keyword, type: 'archive' });
        
        if (data.status === 'success' && data.result && data.result.length > 0) {
            displayArchiveResults(data.result);
        } else {
            archiveResults.innerHTML = `<p class="text-gray-400 text-center">Tidak ada arsip yang cocok dengan kata kunci "${keyword}".</p>`;
        }
        showPage('archive');
    } catch (error) {
        showCustomModal("Kesalahan Server", "Terjadi kesalahan saat mencoba mengambil data arsip. Silakan coba lagi nanti.");
        showPage('archive');
    }
});

// Fungsi untuk menampilkan hasil arsip
function displayArchiveResults(results) {
    let html = `
        <p class="text-sm text-gray-500 mb-4">Ditemukan ${results.length} arsip.</p>
        <ul class="space-y-4">
    `;

    results.forEach(item => {
        // Cek apakah link dokumen tersedia dari Apps Script
        const documentLinkHtml = item.document_link ?
            `<p class="text-sm text-gray-700">Link Dokumen: <a href="${item.document_link}" target="_blank" class="text-blue-500 hover:underline">Lihat Dokumen</a></p>` :
            `<p class="text-sm text-gray-700 text-gray-400">Hubungi Pelaksana untuk Fisik Arsip</p>`;

        // Menampilkan lokasi bangunan
        const locateHtml = item.locate ?
            `<p class="text-sm text-gray-700">Lokasi Bangunan: ${item.locate}</p>` :
            `<p class="text-sm text-gray-700 text-gray-400">Lokasi bangunan tidak tersedia.</p>`;

        // Menampilkan nomor agenda
        const agendaNumberHtml = item.agenda_number ?
            `<p class="text-sm text-gray-700">Nomor Agenda: ${item.agenda_number}</p>` :
            `<p class="text-sm text-gray-700 text-gray-400">Nomor agenda tidak tersedia.</p>`;

        html += `
            <li class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h4 class="font-bold text-lg text-maroon">Nomor SK: ${item.sk_number}</h4>
                ${agendaNumberHtml}
                <p class="text-sm text-gray-700">Nama Pemohon: ${item.applicant_name}</p>
                ${locateHtml}
                ${documentLinkHtml}
            </li>
        `;
    });

    html += `</ul>`;
    archiveResults.innerHTML = html;
}

// Navigasi halaman
showArchiveBtn.addEventListener('click', () => {
    // Tampilkan modal password saat tombol "Pelacakan Arsip" diklik
    showCustomModal("Akses Arsip", "Untuk melihat arsip, silakan masukkan password:", true);
});

backToHomeBtn.addEventListener('click', () => {
    showPage('home');
});

backFromArchiveBtn.addEventListener('click', () => {
    showPage('home');
});

// Inisialisasi: Tampilkan halaman beranda saat pertama kali dimuat
document.addEventListener('DOMContentLoaded', () => {
    showPage('home');
});
