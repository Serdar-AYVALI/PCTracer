// Kullanıcıları yükleme fonksiyonu
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Sunucu hatası');
        
        const users = await response.json();
        renderUserList(users);
    } catch (err) {
        console.error('Hata:', err);
        document.querySelector('.user-list').innerHTML = `
            <div class="error-message">Kullanıcılar yüklenirken hata oluştu: ${err.message}</div>
        `;
    }
}

// Kullanıcı listesini render etme fonksiyonu
function renderUserList(users) {
    const userList = document.querySelector('.user-list');
    
    if (users.length === 0) {
        userList.innerHTML = '<div class="info-message">Kullanıcı bulunamadı</div>';
        return;
    }
    
    userList.innerHTML = users.map(user => `
        <li data-username="${user.name}">
            <span class="username">${user.name}</span>
        </li>
    `).join('');
    
    // Kullanıcı tıklama olaylarını ekle
    document.querySelectorAll('.user-list li').forEach(li => {
        li.addEventListener('click', () => {
            // Tüm aktif sınıfları kaldır
            document.querySelectorAll('.user-list li').forEach(item => {
                item.classList.remove('active');
            });
            
            // Tıklanan öğeye aktif sınıfı ekle
            li.classList.add('active');
            
            // Seçili kullanıcıyı göster
            const selectedUser = li.dataset.username;
            document.getElementById('selectedUserName').textContent = selectedUser;
            
            // Filtreleri uygula
            applyFilters();
        });
    });
}

// Çıkış yapma fonksiyonu
function logout() {
    window.location.href = '/logout';
}

// Süre birimlerini dönüştürme fonksiyonu
function convertDuration(duration, unit) {
    switch (unit) {
        case "saniye":
            return duration;
        case "dakika":
            return duration / 60;
        case "saat":
            return duration / 3600;
        case "gün":
            return duration / 86400;
        default:
            return duration;
    }
}

// Uygulama seçeneklerini dinamik olarak doldur
async function populateAppSelection() {
    try {
        const response = await fetch('/times');
        const data = await response.json();
        
        const uniqueApps = [...new Set(data.map(activity => {
            const parts = activity.window.split(' - ');
            return parts.length > 1 ? parts[1] : activity.window;
        }))];
        
        const appSelection = document.getElementById('appSelection');
        if (appSelection) {
            appSelection.innerHTML = '';
            uniqueApps.forEach(app => {
                const option = document.createElement('option');
                option.value = app;
                option.textContent = app;
                appSelection.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Uygulama listesi yüklenirken hata:", error);
    }
}

// Filtreleme fonksiyonu
async function applyFilters() {
    try {
        // Seçili kullanıcıyı al
        const selectedUserLi = document.querySelector('.user-list li.active');
        if (!selectedUserLi) {
            console.log('Lütfen bir kullanıcı seçin');
            return;
        }
        const selectedUser = selectedUserLi.dataset.username;
        
        // Diğer filtreleri al
        const selectedApps = Array.from(document.getElementById('appSelection').selectedOptions).map(opt => opt.value);
        const minDuration = parseFloat(document.getElementById('minDuration').value) || 0;
        const maxDuration = parseFloat(document.getElementById('maxDuration').value) || Infinity;
        const durationUnit = document.getElementById('durationUnit').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        // Verileri getir
        const response = await fetch('/times');
        const data = await response.json();
        
        // Filtrele
        const filteredActivities = data.filter(activity => {
            // Kullanıcı filtresi
            if (activity.user !== selectedUser) return false;
            
            // Uygulama adını çıkar
            const appName = activity.window.split(' - ')[1] || activity.window;
            
            // Süreyi birime çevir
            const durationInUnit = convertDuration(activity.duration_seconds, durationUnit);
            
            // Tüm filtreleri kontrol et
            const isAppSelected = selectedApps.length === 0 || selectedApps.includes(appName);
            const isInDurationRange = durationInUnit >= minDuration && durationInUnit <= maxDuration;
            const isInDateRange = (!startDate || activity.start_time >= startDate) && 
                                 (!endDate || activity.end_time <= endDate);

            return isAppSelected && isInDurationRange && isInDateRange;
        });

        // Sonuçları göster
        updateTable(filteredActivities, durationUnit);
        updateTop5Apps(filteredActivities, durationUnit);
    } catch (err) {
        console.error('Filtreleme hatası:', err);
    }
}

// Filtrelemeyi sıfırlama fonksiyonu
function resetFilters() {
    document.getElementById('appSelection').selectedIndex = -1;
    document.getElementById('minDuration').value = '';
    document.getElementById('maxDuration').value = '';
    document.getElementById('durationUnit').selectedIndex = 0;
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    applyFilters();
}

// Tabloyu güncelleme fonksiyonu
function updateTable(data, unit) {
    const tableBody = document.getElementById('activityTable');
    if (tableBody) {
        tableBody.innerHTML = '';
        data.forEach(activity => {
            const duration = convertDuration(activity.duration_seconds, unit).toFixed(2);
            const appName = activity.window.split(' - ')[1] || activity.window;
            const row = `<tr>
                <td>${appName}</td>
                <td>${activity.start_time}</td>
                <td>${activity.end_time}</td>
                <td>${duration} ${unit}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    }
}

// En Çok Kullanılan 5 Uygulamayı Güncelleme Fonksiyonu
function updateTop5Apps(data, unit) {
    const windowUsage = {};
    let totalDuration = 0;

    data.forEach(activity => {
        const windowName = activity.window.split(' - ')[1] || activity.window;
        if (windowUsage[windowName]) {
            windowUsage[windowName] += activity.duration_seconds;
        } else {
            windowUsage[windowName] = activity.duration_seconds;
        }
        totalDuration += activity.duration_seconds;
    });

    const sortedWindows = Object.entries(windowUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const chartContainer = document.getElementById('top5AppsChart');
    if (chartContainer) {
        chartContainer.innerHTML = '';

        sortedWindows.forEach(([appName, duration]) => {
            const durationInUnit = convertDuration(duration, unit).toFixed(2);
            const percentage = totalDuration > 0 ? ((duration / totalDuration) * 100).toFixed(2) : 0;
            const barHtml = `
                <div class="chart-bar">
                    <div class="label">${appName}</div>
                    <div class="bar" style="width: ${percentage}%;" data-percentage="${percentage}%"></div>
                    <div class="value">${durationInUnit} ${unit} (${percentage}%)</div>
                </div>
            `;
            chartContainer.innerHTML += barHtml;
        });
    }
}

// Sayfa yüklendiğinde ilk verileri göster
document.addEventListener('DOMContentLoaded', async () => {
    loadUsers();
    
    // Aktif menü öğesini vurgula
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });

    // Aktivite sayfasındaysa ek fonksiyonları çalıştır
    if (currentPage === 'activities.html') {
        await populateAppSelection();
        
        // Varsayılan tarih aralığını ayarla (son 7 gün)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        document.getElementById('startDate').valueAsDate = startDate;
        document.getElementById('endDate').valueAsDate = endDate;
        
        // İlk kullanıcıyı seç ve verileri yükle
        const firstUser = document.querySelector('.user-list li');
        if (firstUser) {
            firstUser.classList.add('active');
            const selectedUser = firstUser.dataset.username;
            document.getElementById('selectedUserName').textContent = selectedUser;
            applyFilters();
        }
    }
});

// Fonksiyonları global olarak erişilebilir hale getir
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.updateTop5Apps = updateTop5Apps;
window.updateTable = updateTable;