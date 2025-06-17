function logout() {
    alert("Çıkış yapılıyor...");
    // Çıkış işlemleri burada yapılabilir
}

function showUserInfo(username) {
    const userInfoDiv = document.getElementById('user-info');
    userInfoDiv.innerHTML = `<h3>${username} Bilgileri</h3>
                             <p>Bu alanda ${username} ile ilgili detaylı bilgiler gösterilecek.</p>`;
}