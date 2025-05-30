// Импорт зависимостей
const bodyParser = require("body-parser");
const express = require("express");
const session = require("express-session");
const { Client } = require("pg");
const path = require("path");
require('dotenv').config(); // Добавлено для использования переменных окружения

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация базы данных (лучше вынести в переменные окружения)
const dbConfig = {
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnautorized: false }
};

const client = new Client(dbConfig);

// Подключение к PostgreSQL
client.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("Connection error", err.stack));

// Асинхронная функция для инициализации базы данных
async function initializeDatabase() {
  try {
    // Создание таблиц
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role INTEGER DEFAULT 1
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS MainPageContent (
        id SERIAL PRIMARY KEY,
        h1 TEXT,
        p1 TEXT,
        p2 TEXT,
        p3 TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS AboutPageContent (
        id SERIAL PRIMARY KEY,
        h1About TEXT,
        p1About TEXT,
        p2About TEXT
      )
    `);

    // Проверка и создание начальных данных
    const adminsCount = await client.query("SELECT COUNT(*) FROM admins");
    if (adminsCount.rows[0].count === "0") {
      await client.query(
        `INSERT INTO admins (username, password, role) VALUES ($1, $2, $3)`,
        ["SoltanAlikhan", "Lenovo135!", 3]
      );
    }

    const mainPageCount = await client.query("SELECT COUNT(*) FROM MainPageContent");
    if (mainPageCount.rows[0].count === "0") {
      await client.query(
        `INSERT INTO MainPageContent (h1, p1, p2, p3) VALUES ($1, $2, $3, $4)`,
        ["Main Page It is №2", "This is test site. Version 1.0.0 .", "It is last version", "Testing"]
      );
    }

    const aboutPageCount = await client.query("SELECT COUNT(*) FROM AboutPageContent");
    if (aboutPageCount.rows[0].count === "0") {
      await client.query(
        `INSERT INTO AboutPageContent (h1About, p1About, p2About) VALUES ($1, $2, $3)`,
        [
          "About Us",
          "I created this website and my name is Soltan Alikhan...",
          "There is testing text in About Page"
        ]
      );
    }
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

initializeDatabase();

// Настройка Express
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Указание пути к шаблонам
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Мидлвары для проверки аутентификации и ролей
function checkAuth(req, res, next) {
  if (req.session.admin) return next();
  res.redirect("/login");
}

function checkRole(minRole) {
  return (req, res, next) => {
    if (req.session.admin?.role >= minRole) return next();
    res.status(403).render("errorRole");
  };
}

// Роуты
app.get("/", (req, res) => {
  client.query("SELECT * FROM MainPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("index", { title: "Main Page", MainPageContent: result.rows[0] });
  });
});

app.get("/about", (req, res) => {
  client.query("SELECT * FROM AboutPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("about", { title: "About Us", AboutPageContent: result.rows[0] });
  });
});
// Добавьте этот временный маршрут для проверки данных
app.get('/debug/about', (req, res) => {
  client.query("SELECT * FROM AboutPageContent", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }
    res.json({
      rowCount: result.rowCount,
      rows: result.rows
    });
  });
});

app.get("/login", (req, res) => {
  if (req.session.admin) return res.redirect("/admin");
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render("login", { error: "Username and password are required" });
  }

  client.query(
    "SELECT * FROM admins WHERE username = $1 AND password = $2",
    [username, password],
    (err, result) => {
      if (err || result.rows.length === 0) {
        return res.render("login", { error: "Invalid credentials" });
      }
      req.session.admin = result.rows[0];
      res.redirect("/admin");
    }
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/admin", checkAuth, (req, res) => {
  client.query("SELECT * FROM MainPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("adminPanel", { MainPageContent: result.rows[0] });
  });
});

// Группа роутов, требующих роли >= 2
app.get("/editMainPage", checkAuth, checkRole(2), (req, res) => {
  client.query("SELECT * FROM MainPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("editMainPage", { MainPageContent: result.rows[0] });
  });
});

app.post("/editMainPage", checkAuth, checkRole(2), (req, res) => {
  const { h1, p1, p2, p3 } = req.body;
  client.query(
    `UPDATE MainPageContent SET h1 = $1, p1 = $2, p2 = $3, p3 = $4 WHERE id = 1`,
    [h1, p1, p2, p3],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Server error");
      }
      res.redirect("/editMainPage");
    }
  );
});

app.get("/editAboutPage", checkAuth, checkRole(2), (req, res) => {
  client.query("SELECT * FROM AboutPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("editAboutPage", { AboutPageContent: result.rows[0] });
  });
});

app.post("/editAboutPage", checkAuth, checkRole(2), (req, res) => {
  const { h1About, p1About, p2About } = req.body;
  client.query(
    `UPDATE AboutPageContent SET h1About = $1, p1About = $2, p2About = $3 WHERE id = 1`,
    [h1About, p1About, p2About],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Server error");
      }
      res.redirect("/editAboutPage");
    }
  );
});

// Группа роутов, требующих роли 3 (главный админ)
app.get("/addAdmin", checkAuth, checkRole(3), (req, res) => {
  res.render("addAdmin");
});

app.post("/addAdmin", checkAuth, checkRole(3), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.render("addAdmin", { error: "All fields are required" });
  }

  client.query(
    `INSERT INTO admins (username, password, role) VALUES ($1, $2, $3)`,
    [username, password, role],
    (err) => {
      if (err) {
        console.error(err);
        return res.render("addAdmin", { error: "Failed to add admin" });
      }
      res.redirect("/addAdmin");
    }
  );
});

app.get("/deleteAdmin", checkAuth, checkRole(3), (req, res) => {
  res.render("deleteAdmin");
});

app.post("/deleteAdmin", checkAuth, checkRole(3), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render("deleteAdmin", { error: "Username and password are required" });
  }

  // Не позволяем удалить самого себя
  if (req.session.admin.username === username) {
    return res.render("deleteAdmin", { error: "You cannot delete yourself" });
  }

  client.query(
    `DELETE FROM admins WHERE username = $1 AND password = $2`,
    [username, password],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.render("deleteAdmin", { error: "Database error" });
      }
      if (result.rowCount === 0) {
        return res.render("deleteAdmin", { error: "Admin not found or password incorrect" });
      }
      res.redirect("/deleteAdmin");
    }
  );
});

app.get("/admins", checkAuth, checkRole(3), (req, res) => {
  client.query("SELECT * FROM admins", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("admins", { admins: result.rows });
  });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).render("404");
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("500");
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
