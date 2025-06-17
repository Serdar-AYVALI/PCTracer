require('dotenv').config(); // .env desteği için ekle
const express = require('express');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = 3000;

// MongoDB bağlantısı (mongoose için)
const MONGO_URI = process.env.MONGO_URI; // .env'den oku

//MongoDB bağlantısı (native driver için)
// let db;
// async function connectDB() {
//   try {
//     const client = await MongoClient.connect(MONGO_URI);
//     db = client.db("PCTracerDB");
//     console.log("MongoDB'ye başarıyla bağlandı (native driver)");
//     return client;
//   } catch (error) {
//     console.error("MongoDB bağlantı hatası (native driver):", error);
//     process.exit(1);
//   }
// }

// connectDB().catch(console.error);


// Her iki bağlantıyı da kur
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB bağlantısı başarılı (mongoose)'))
  .catch(err => console.error('MongoDB bağlantı hatası (mongoose):', err));


// Modeller
// Modelleri models klasörüne al
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { versionKey: false });

const User = mongoose.model('User', userSchema, 'Users');
const Admin = mongoose.model('Admin', userSchema, 'Admins');
const ClientData = mongoose.model('ClientData', new mongoose.Schema({}), 'ClientData');

// Middleware'ler
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // <-- EKLENDİ
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Session middleware
app.use(session({
  secret: 'pc_tracer_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true only with HTTPS
}));

// Giriş kontrol middleware'i
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Giriş sayfası (login.ejs)
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Giriş işlemi
app.post('/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.render('login', { error: 'Kullanıcı bulunamadı' });
    }
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.render('login', { error: 'Şifre hatalı' });
    }
    req.session.userId = admin._id;
    req.session.userName = admin.name; // Kullanıcı adını session'a ekle
    res.redirect('/');
  } catch (err) {
    res.render('login', { error: 'Sunucu hatası' });
  }
});

// Çıkış işlemi
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/', requireLogin, (req, res) => {
  res.render('index', { userName: req.session.userName }); // userName'i gönder
});

app.get('/activities', requireLogin, (req, res) => {
  res.render('activities');
});

app.get('/ayarlar', requireLogin, (req, res) => {
  res.render('ayarlar');
});

app.get('/iletisim', requireLogin, (req, res) => {
  res.render('iletisim');
});

// Users koleksiyonundan kullanıcıları getiren endpoint
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name -_id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mevcut kullanıcıları getir
app.get('/api/existing-users', async (req, res) => {
  try {
    const users = await User.find({}, '_id name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Aktif kullanıcıları getir ve güncelle
app.get('/api/active-users', async (req, res) => {
  try {
    const days = parseInt(req.query.days);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const activeUsers = await ClientData.aggregate([
      { $match: { end_time: { $gte: thresholdDate.toISOString() } } },
      { $group: { _id: "$user" } }
    ]);

    const updateOps = activeUsers.map(user => ({
      updateOne: {
        filter: { name: user._id },
        update: { $setOnInsert: { name: user._id } },
        upsert: true
      }
    }));

    if (updateOps.length > 0) {
      await User.bulkWrite(updateOps);
    }

    const users = await User.find({}, '_id name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcı silme
app.delete('/api/users/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı ID' });
    }

    const result = await User.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Hata:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Aktivite verilerini getir (kullanıcıya göre filtreleme desteği ile)
app.get("/times", async (req, res) => {
  try {
    const { user } = req.query;
    let query = {};
    
    if (user) {
      query.user = user;
    }
    
    // const times1 = await db.collection("ClientData").find(query).toArray();
    const times = await ClientData.find(query).exec();

    console.log(times[0])



    res.json(times);
  } catch (err) {
    console.error("Listeleme hatası:", err);
    res.status(500).json({ error: "Bir hata oluştu" });
  }
});

// 1. Pasta Grafiği – Uygulama Bazlı Zaman Dağılımı
app.get('/api/chart/pie-app-time', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const data = await ClientData.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: [{ $split: ["$window", " - "] }, 1] }, "$window"] },
          total: { $sum: "$duration_seconds" }
        }
      }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 2. Çubuk Grafiği – Uygulamalara Göre Kullanım Süresi
app.get('/api/chart/bar-app-usage', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const data = await ClientData.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: [{ $split: ["$window", " - "] }, 1] }, "$window"] },
          total: { $sum: "$duration_seconds" }
        }
      },
      { $sort: { total: -1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 3. Zaman Serisi Grafiği – Günlük Aktivite Zaman Çizelgesi
app.get('/api/chart/timeline-activity', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const data = await ClientData.find(match, { window: 1, start_time: 1, end_time: 1, _id: 0 }).sort({ start_time: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 4. Alan Grafiği – Uygulama Kullanımı Zaman Akışı
app.get('/api/chart/area-app-flow', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const data = await ClientData.find(match, { window: 1, start_time: 1, end_time: 1, duration_seconds: 1, _id: 0 }).sort({ start_time: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 5. Isı Haritası – Günün Saatlerine Göre Aktivite Yoğunluğu
app.get('/api/chart/heatmap-hourly-activity', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const data = await ClientData.aggregate([
      { $match: match },
      {
        $project: {
          hour: { $hour: { $dateFromString: { dateString: "$start_time", format: "%Y-%m-%d %H:%M:%S" } } },
          day: { $dayOfWeek: { $dateFromString: { dateString: "$start_time", format: "%Y-%m-%d %H:%M:%S" } } },
          duration: "$duration_seconds"
        }
      },
      {
        $group: {
          _id: { hour: "$hour", day: "$day" },
          total: { $sum: "$duration" }
        }
      }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 6. Donut Grafiği – Boşta Geçen Süre Oranı
app.get('/api/chart/donut-idle-ratio', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const data = await ClientData.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$window", ""] }, "Boşta", "Aktif"] },
          total: { $sum: "$duration_seconds" }
        }
      }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 7. Calendar Heatmap – Gün Bazlı Toplam Kullanım Süresi
app.get('/api/chart/calendar-heatmap', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const data = await ClientData.aggregate([
      { $match: match },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: { $dateFromString: { dateString: "$start_time", format: "%Y-%m-%d %H:%M:%S" } } } },
          duration: "$duration_seconds"
        }
      },
      {
        $group: {
          _id: "$date",
          total: { $sum: "$duration" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 8. Sankey Diyagramı – Uygulama Geçiş Akışı
app.get('/api/chart/sankey-app-flow', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    const sessions = await ClientData.find(match, { window: 1, start_time: 1, _id: 0 }).sort({ start_time: 1 });
    let transitions = {};
    let prev = null;
    sessions.forEach(s => {
      const app = s.window.split(' - ')[1] || s.window;
      if (prev) {
        const key = prev + '→' + app;
        transitions[key] = (transitions[key] || 0) + 1;
      }
      prev = app;
    });
    const data = Object.entries(transitions).map(([k, v]) => {
      const [from, to] = k.split('→');
      return { from, to, count: v };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 9. Stacked Bar Chart – Birden Fazla Kullanıcıya Göre Uygulama Kullanımı
app.get('/api/chart/stackedbar-user-app', async (req, res) => {
  try {
    const data = await ClientData.aggregate([
      {
        $group: {
          _id: { user: "$user", app: { $ifNull: [{ $arrayElemAt: [{ $split: ["$window", " - "] }, 1] }, "$window"] } },
          total: { $sum: "$duration_seconds" }
        }
      }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 10. Line Chart – Günlük Ortalama Oturum Süresi
app.get('/api/chart/line-daily-session', async (req, res) => {
  try {
    const user = req.query.user;
    const match = user ? { user } : {};
    // Oturum = aynı gün ve kullanıcıya ait ardışık kayıtlar (session_id yoksa)
    const data = await ClientData.aggregate([
      { $match: match },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: { $dateFromString: { dateString: "$start_time", format: "%Y-%m-%d %H:%M:%S" } } } },
          duration: "$duration_seconds"
        }
      },
      {
        $group: {
          _id: "$date",
          total: { $sum: "$duration" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Adminleri getir
app.get('/api/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}, 'name email _id');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin ekle
app.post('/api/admins', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Tüm alanlar zorunlu.' });
    }
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Bu e-posta ile kayıtlı admin zaten var.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const admin = new Admin({ name, email, password: hashed });
    await admin.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin sil
app.delete('/api/admins/:id', async (req, res) => {
  try {
    const result = await Admin.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Admin bulunamadı' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});