const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',         // Host de la base de datos
  user: 'root',              // Usuario root
  password: '',              // Sin contraseña
  database: 'notes_app',     // Nombre de la base de datos
  port: 3306,                // Puerto de la base de datos (por defecto es 3306)
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const db = pool.promise(); // Usamos el pool con promesas

// Ahora puedes usar 'db.query' directamente
db.query('SELECT 1') // Prueba para ver si el pool funciona
  .then(([rows, fields]) => {
    console.log("Conexión exitosa");
  })
  .catch(err => {
    console.error("Error en la consulta:", err);
  });

module.exports = db; // Exportamos para usar en otros archivos
