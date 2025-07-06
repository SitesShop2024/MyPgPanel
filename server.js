// Импорт зависимостей
const bodyParser = require("body-parser");
const express = require("express");
const session = require("express-session");
const { Client } = require("pg");
const path = require("path");
require("dotenv").config(); // Добавлено для использования переменных окружения

const app = express();
const PORT = process.env.PORT || 3000;

// Конфигурация базы данных (лучше вынести в переменные окружения)
const dbConfig = {
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
};


const client = new Client(dbConfig);

// Подключение к PostgreSQL
client
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Connection error", err.stack));

// Асинхронная функция для инициализации базы данных
async function initializeDatabase() {
  try {
    // Создание таблицы админов
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role INTEGER DEFAULT 1
      )
    `);

    // Создание таблицы контента главной страницы
    await client.query(`
      CREATE TABLE IF NOT EXISTS MainPageContent (
        id SERIAL PRIMARY KEY,
        navlink1 TEXT,
        navlink2 TEXT,
        navlink3 TEXT,
        navlink4 TEXT,
        slide1 TEXT,
        slide2 TEXT,
        slide3 TEXT,
        abouth1 TEXT,
        aboutp TEXT,
        servicesh1 TEXT,
        servicecardh2_1 TEXT,
        servicecardp1 TEXT,
        servicecardh2_2 TEXT,
        servicecardp2 TEXT,
        servicecardh2_3 TEXT,
        servicecardp3 TEXT,
        seemorebtn TEXT,
        advantagesh1 TEXT,
        advantagecardh1_1 TEXT,
        advantagecardp1 TEXT,
        advantagecardh1_2 TEXT,
        advantagecardp2 TEXT,
        advantagecardh1_3 TEXT,
        advantagecardp3 TEXT,
        qualityh1 TEXT,
        contacth1 TEXT,
        email TEXT,
        phone TEXT,
        calluslink TEXT,
        callustext TEXT,
        newsh1 TEXT,
        newcardh2_1 TEXT,
        newcardp1 TEXT,
        newcardh2_2 TEXT,
        newcardp2 TEXT,
        newcardh2_3 TEXT,
        newcardp3 TEXT,
        footerh1 TEXT,
        footerp TEXT,
        img1 TEXT,
        img2 TEXT,
        img3 TEXT,
        img4 TEXT,
        img5 TEXT,
        img6 TEXT,
        img7 TEXT,
        video TEXT
      )
    `);

    // Создание таблицы контента страницы "О нас"
    await client.query(`
      CREATE TABLE IF NOT EXISTS AboutPageContent (
        id SERIAL PRIMARY KEY,
        h1About TEXT,
        p1About TEXT,
        p2About TEXT
      )
    `);

    // Создание главного админа, если его нет
    const adminsCount = await client.query("SELECT COUNT(*) FROM admins");
    if (adminsCount.rows[0].count === "0") {
      await client.query(
        `INSERT INTO admins (username, password, role) VALUES ($1, $2, $3)`,
        ["SoltanAlikhan", "Lenovo135!", 3]
      );
    }

    // Добавление начального контента для главной страницы
    const MainPageCount = await client.query(
      "SELECT COUNT(*) FROM MainPageContent"
    );
    if (MainPageCount.rows[0].count === "0") {
      await client.query(
        `INSERT INTO MainPageContent (
          navlink1, navlink2, navlink3, navlink4,
          slide1, slide2, slide3,
          abouth1, aboutp,
          servicesh1, servicecardh2_1, servicecardp1,
          servicecardh2_2, servicecardp2,
          servicecardh2_3, servicecardp3,
          seemorebtn,
          advantagesh1, advantagecardh1_1, advantagecardp1,
          advantagecardh1_2, advantagecardp2,
          advantagecardh1_3, advantagecardp3,
          qualityh1,
          contacth1, email, phone,
          calluslink, callustext,
          newsh1, newcardh2_1, newcardp1,
          newcardh2_2, newcardp2,
          newcardh2_3, newcardp3,
          footerh1, footerp, img1, img2, img3, img4, img5, img6, img7, video
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8, $9,
          $10, $11, $12,
          $13, $14,
          $15, $16,
          $17,
          $18, $19, $20,
          $21, $22,
          $23, $24,
          $25,
          $26, $27, $28,
          $29, $30,
          $31, $32, $33,
          $34, $35,
          $36, $37,
          $38, $39, $40, $41, $42, $43, $44, $45, $46, $47
        )`,
        new Array(47).fill("TEXT") // Вставим временные текстовые значения
      );
    }

    // Добавление начального контента для AboutPageContent
    const aboutPageCount = await client.query(
      "SELECT COUNT(*) FROM AboutPageContent"
    );
    if (aboutPageCount.rows[0].count === "0") {
      await client.query(
        `INSERT INTO AboutPageContent (h1About, p1About, p2About) VALUES ($1, $2, $3)`,
        [
          "About Us",
          "I created this website and my name is Soltan Alikhan...",
          "There is testing text in About Page",
        ]
      );
    }

    console.log("База данных успешно инициализирована!");
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
    cookie: { secure: process.env.NODE_ENV === "development" },
  })
);
app.use(express.urlencoded({ limit: "10mb", extended: true }));


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
    res.render("index", {
      title: "Main Page",
      MainPageContent: result.rows[0],
    });
  });
});

app.get("/about", (req, res) => {
  client.query("SELECT * FROM AboutPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("about", {
      title: "About Us",
      AboutPageContent: result.rows[0],
    });
  });
});
// Добавьте этот временный маршрут для проверки данных
app.get("/debug/about", (req, res) => {
  client.query("SELECT * FROM AboutPageContent", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }
    res.json({
      rowCount: result.rowCount,
      rows: result.rows,
    });
  });
});

app.get("/login", (req, res) => {
  client.query("SELECT * FROM MainPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("login", {
      title: "Login Page",
      MainPageContent: result.rows[0],
      error: null,
    });
  });
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
  const { navlink1, navlink2, navlink3, navlink4,
    slide1, slide2, slide3,
    abouth1, aboutp,
    servicesh1, servicecardh2_1, servicecardp1,
    servicecardh2_2, servicecardp2,
    servicecardh2_3, servicecardp3,
    seemorebtn,
    advantagesh1, advantagecardh1_1, advantagecardp1,
    advantagecardh1_2, advantagecardp2,
    advantagecardh1_3, advantagecardp3,
    qualityh1,
    contacth1, email, phone,
    calluslink, callustext,
    newsh1, newcardh2_1, newcardp1,
    newcardh2_2, newcardp2,
    newcardh2_3, newcardp3,
    footerh1, footerp, img1, img2, img3, img4, img5, img6, img7, video } = req.body;
  client.query(
    `UPDATE MainPageContent SET 
      navlink1 = $1, navlink2 = $2, navlink3 = $3, navlink4 = $4,
      slide1 = $5, slide2 = $6, slide3 = $7,
      abouth1 = $8, aboutp = $9,
      servicesh1 = $10, servicecardh2_1 = $11, servicecardp1 = $12,
      servicecardh2_2 = $13, servicecardp2 = $14,
      servicecardh2_3 = $15, servicecardp3 = $16,
      seemorebtn = $17,
      advantagesh1 = $18, advantagecardh1_1 = $19, advantagecardp1 = $20,
      advantagecardh1_2 = $21, advantagecardp2 = $22,
      advantagecardh1_3 = $23, advantagecardp3 = $24,
      qualityh1 = $25,
      contacth1 = $26, email = $27, phone = $28,
      calluslink = $29, callustext = $30,
      newsh1 = $31, newcardh2_1 = $32, newcardp1 = $33,
      newcardh2_2 = $34, newcardp2 = $35,
      newcardh2_3 = $36, newcardp3 = $37,
      footerh1 = $38, footerp = $39, img1 = $40, img2 = $41, img3 = $42, img4 = $43, img5 = $44, img6 = $45, img7 = $46, video = $47 WHERE id = 1
    `, [navlink1, navlink2, navlink3, navlink4,
      slide1, slide2, slide3,
      abouth1, aboutp,
      servicesh1, servicecardh2_1, servicecardp1,
      servicecardh2_2, servicecardp2,
      servicecardh2_3, servicecardp3,
      seemorebtn,
      advantagesh1, advantagecardh1_1, advantagecardp1,
      advantagecardh1_2, advantagecardp2,
      advantagecardh1_3, advantagecardp3,
      qualityh1,
      contacth1, email, phone,
      calluslink, callustext,
      newsh1, newcardh2_1, newcardp1,
      newcardh2_2, newcardp2,
      newcardh2_3, newcardp3,
      footerh1, footerp, img1, img2, img3, img4, img5, img6, img7, video],
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
  client.query("SELECT * FROM MainPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("addAdmin", {
      title: "Add New Admin",
      MainPageContent: result.rows[0],
      error: null,
    });
  });
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
  client.query("SELECT * FROM MainPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
    res.render("deleteAdmin", {
      title: "Delete Admin",
      MainPageContent: result.rows[0],
      error: null,
    });
  });
});

app.post("/deleteAdmin", checkAuth, checkRole(3), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render("deleteAdmin", {
      error: "Username and password are required",
    });
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
        return res.render("deleteAdmin", {
          error: "Admin not found or password incorrect",
        });
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
    client.query("SELECT * FROM MainPageContent LIMIT 1", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }
      res.render("admins", { admins: result.rows, 
      MainPageContent: result.rows[0],
      error: null, });
  });
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
