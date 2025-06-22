# PCTracer

PCTracer, bilgisayar kullanıcılarının uygulama ve pencere bazlı aktivitelerini MongoDB veritabanına kaydeden ve bu verileri web tabanlı bir yönetim panelinde görselleştiren bir izleme ve raporlama sistemidir.

## Özellikler

- **Kullanıcı Aktivite Takibi:** Windows istemcisi, aktif pencere ve uygulama değişikliklerini MongoDB'ye kaydeder.
- **Web Paneli:** Kullanıcı, uygulama ve aktivite verilerini görselleştiren modern bir yönetim paneli.
- **Filtreleme ve Raporlama:** Tarih, uygulama, süre gibi filtrelerle detaylı analiz ve Excel/PDF dışa aktarma.
- **Kullanıcı ve Admin Yönetimi:** Kullanıcı ve admin ekleme/silme, admin parola güncelleme.
- **Grafikler:** Uygulama bazlı pasta, çubuk, zaman serisi, ısı haritası, stacked bar, radar, polar area ve daha fazla grafik.
- **Çoklu Kullanıcı Desteği:** Birden fazla bilgisayardan gelen veriler merkezi olarak toplanır ve analiz edilir.

## Kurulum

### Gereksinimler

- Node.js (v16+)
- MongoDB Atlas (veya erişilebilir bir MongoDB sunucusu)
- Windows istemciler için Python 3.x ve gerekli kütüphaneler

### Sunucu (Web Paneli) Kurulumu

1. **Node.js Kurulumu:**  
   Node.js (v16+) yüklü değilse [nodejs.org](https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi) adresinden indirip kurun.

2. **Depoyu klonlayın veya dosyaları indirin.**
3. Ana dizinde `.env` dosyasını oluşturun ve aşağıdaki gibi doldurun:
    ```
    MONGO_URI=mongodb+srv://<kullanici>:<parola>@<cluster-url>/<veritabani>?retryWrites=true&w=majority
    DB_NAME=PCTracerDB
    ```
4. Gerekli paketleri yükleyin:
    ```
    npm install
    ```
5. Sunucuyu başlatın:
    ```
    npm start
    ```
6. Tarayıcıdan `http://localhost:3000` adresine gidin.

### Agent (Windows İstemci) Kurulumu

1. **Agent Kodunu Kopyalayın:**  
   `agent/PCTracer.pyw` dosyasını `%AppData%\PCTracer` klasörüne kopyalayın.  
   (Örnek: `C:\Users\<KullanıcıAdı>\AppData\PCTracer\PCTracer.pyw`)

2. **Python Kurulumu:**  
   Python 3.x yüklü değilse [python.org](https://www.python.org/ftp/python/3.13.2/python-3.13.2-amd64.exe) adresinden indirip kurun.

3. **Gerekli Python Modüllerini Kurun:**  
   Komut satırında aşağıdaki komutları çalıştırın:
   ```
   pip install --upgrade pip
   pip install pygetwindow pymongo python-dotenv
   ```

4. **.env Dosyasını Oluşturun:**  
   Aynı klasöre bir `.env` dosyası ekleyin ve aşağıdaki gibi doldurun:
   ```
   MONGO_URI=mongodb+srv://<kullanici>:<parola>@<cluster-url>/<veritabani>?retryWrites=true&w=majority
   DB_NAME=PCTracerDB
   ```

5. **Başlangıçta Otomatik Çalıştırmak için Kısayol Oluşturun:**  
   - `Win + R` tuşlarına basıp `shell:startup` yazın ve Enter'a basın.
   - Açılan klasöre sağ tıklayın > Yeni > Kısayol oluşturun.
   - Konum olarak şunu girin (yolu kendinize göre düzenleyin):
     ```
     C:\Users\<KullanıcıAdı>\AppData\PCTracer\PCTracer.pyw
     ```
   - Kısayola anlamlı bir isim verin (ör. "PCTracer Agent").

6. **Agent'ı Manuel Başlatmak için:**  
   Dosyaya çift tıklayarak veya yukarıdaki kısayolu çalıştırarak agent'ı başlatabilirsiniz.  
   Program arka planda çalışır ve pencere değişikliklerini MongoDB'ye gönderir.

## Kullanım

- Web paneline ilk giriş için varsayılan admin:  
  **E-posta:** `admin@admin`  
  **Parola:** `admin`
- Kullanıcılar ve aktiviteler otomatik olarak listelenir.
- Aktivite Takip sayfasında filtreleme ve raporlama yapılabilir.
- Ayarlar sayfasından kullanıcı ve admin yönetimi yapılabilir.

## Klasör Yapısı

```
PCTracer-main/
├── agent/                # Windows istemci kodları
├── public/               # Statik dosyalar (JS, CSS, görseller)
├── views/                # EJS şablonları
├── server.js             # Express sunucu uygulaması
├── package.json
├── .env
└── README.md
```

## Lisans

Apache-2.0 License

---

**Not:** Gerçek ortamda kullanmadan önce güvenlik ve veri gizliliği açısından gözden geçiriniz.