// Kullanıcıların tanımlanması
const allowedUsers = [
    { email: "umut@agentedarik.com", password: "agen2025" },
    { email: "mustafa@agentedarik.com", password: "agen2025" },
    { email: "ugurcan@agentedarik.com", password: "agen2025" }
];

// Giriş ekranını gösterme
function showLogin() {
    const loginContainer = document.getElementById('login-container');
    loginContainer.innerHTML = `
        <h2>Giriş Yap</h2>
        <input type="email" id="email" placeholder="E-posta"><br>
        <input type="password" id="password" placeholder="Şifre"><br>
        <button onclick="login()">Giriş Yap</button>
    `;
}

// Giriş işlemi
function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    const user = allowedUsers.find(user => user.email === email && user.password === password);

    if (user) {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        showApp();
    } else {
        alert('E-posta veya şifre yanlış.');
    }
}

// Uygulama ekranını gösterme
let products = [];

function showApp() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <h2>Ürün Arama</h2>
        <input type="text" id="search" placeholder="Ürün Adı"><br>
        <button onclick="searchProduct()">Ara</button>
        <div id="results"></div>
    `;

    fetchData();
}

// Verileri Google Sheets'ten çekme
function fetchData() {
    const sheetId = '1os1Wo0k6pcozHOoN-uaiAjDzoEsKQPfmmkaTvzd2vMQ'; // Sizin Google Sheets ID'niz
    const sheetName = 'Sayfa1'; // Sayfa adınızı girin

    Tabletop.init({
        key: sheetId,
        simpleSheet: true,
        wanted: [sheetName],
        callback: function(data, tabletop) {
            products = data.map(item => ({
                name: item['Ürün Adı'] || '',
                stock: item['Stok'] || 0,
                D: item['Çap'] || '',
                L1: item['L1'] || '',
                L2: item['L2'] || '',
                D1: item['D1'] || '',
                D2: item['D2'] || ''
            }));
        },
        error: function(error) {
            console.error('Veri çekme hatası:', error);
        }
    });
}

// Ürün arama işlevi
function searchProduct() {
    const query = document.getElementById('search').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('results');
    const product = products.find(p => p.name.toLowerCase() === query);

    if (product) {
        resultsDiv.innerHTML = `
            <table>
                <tr>
                    <th>Ürün Adı</th>
                    <th>Stok</th>
                    <th>Çap</th>
                    <th>L1</th>
                    <th>L2</th>
                    <th>D1</th>
                    <th>D2</th>
                </tr>
                <tr>
                    <td>${product.name}</td>
                    <td>${product.stock}</td>
                    <td>${product.D}</td>
                    <td>${product.L1}</td>
                    <td>${product.L2}</td>
                    <td>${product.D1}</td>
                    <td>${product.D2}</td>
                </tr>
            </table>
        `;
    } else {
        resultsDiv.innerHTML = 'Ürün bulunamadı.';
    }
}

// Başlatma
showLogin();
