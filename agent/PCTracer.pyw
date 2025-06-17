import pygetwindow as gw
import time
from datetime import datetime
import socket
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Kullanıcı bilgilerini al
pc_hostname = socket.gethostname()
pc_user_name = os.getlogin()
user = f"{pc_hostname}\\{pc_user_name}"
# .env dosyasını yükle
load_dotenv()

# Ortam değişkenlerinden MongoDB bağlantı bilgilerini al
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
COLLECTION_NAME = "ClientData"
client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsAllowInvalidCertificates=True,
    retryWrites=True,
    socketTimeoutMS=20000,
    connectTimeoutMS=20000
)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Değişkenler
last_window = None
start_time = None

# Sürekli çalışan bir döngü ile aktif pencereyi takip et
while True:
    # Aktif pencereyi al
    active_window = gw.getActiveWindow()

    # Eğer pencere ismi boş değilse veya None değilse işlem yap
    if active_window and active_window.title:
        # Eğer pencere değiştiyse (yeni pencere aktif olduysa)
        if active_window != last_window:
            if last_window is not None:
                # Önceki pencerenin kullanım süresini kaydet
                end_time = datetime.now()
                usage_duration = (end_time - start_time).total_seconds()

                # MongoDB'ye kaydedilecek veri
                data = {
                    "pc_hostname": pc_hostname,
                    "pc_user_name": pc_user_name,
                    "user": user,
                    "window": last_window.title,
                    "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "duration_seconds": usage_duration
                }

                # Veriyi MongoDB'ye kaydet
                try:
                    collection.insert_one(data)
                    print(f"Veri başarıyla kaydedildi: {data}")
                except Exception as e:
                    print(f"MongoDB'ye kayıt sırasında hata: {e}")

            # Yeni pencere için başlangıç zamanını al
            start_time = datetime.now()
            last_window = active_window

    # 1 saniye bekle
    time.sleep(1)