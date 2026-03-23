import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Configuración de MySQL con soporte SSL para RDS
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false // Permite la conexión a RDS sin verificar certificado CA
  }
});

// Configuración de S3
const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true
});

// Configuración de Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Obtener todos los alumnos
app.get('/api/alumnos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM alumno ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error de base de datos:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener alumnos',
      details: error.message 
    });
  }
});

// 2. Agregar un alumno
app.post('/api/alumnos', upload.single('imagen'), async (req, res) => {
  try {
    const { nombre, apellidos, localidad } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'La imagen es obligatoria' });
    }

    const extension = path.extname(file.originalname);
    const key = `${uuidv4()}${extension}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const [result] = await pool.query(
      'INSERT INTO alumno (nombre, apellidos, localidad, imagen) VALUES (?, ?, ?, ?)',
      [nombre, apellidos, localidad, key]
    );

    res.status(201).json({ id: result.insertId, message: 'Alumno creado correctamente' });
  } catch (error) {
    console.error('Error en el POST:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Proxy de imagen desde S3
app.get('/api/imagen/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    res.setHeader('Content-Type', response.ContentType);
    
    const stream = response.Body;
    stream.pipe(res);
  } catch (error) {
    console.error('Error Proxy Imagen:', error.message);
    res.status(404).send('Imagen no encontrada');
  }
});

// 4. Eliminar un alumno
app.delete('/api/alumnos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Primero obtenemos la key de la imagen para borrarla de S3
    const [rows] = await pool.query('SELECT imagen FROM alumno WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const key = rows[0].imagen;

    // Borramos de S3
    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };
    await s3Client.send(new DeleteObjectCommand(deleteParams));

    // Borramos de la BD
    await pool.query('DELETE FROM alumno WHERE id = ?', [id]);

    res.json({ message: 'Alumno e imagen eliminados correctamente' });
  } catch (error) {
    console.error('Error en el DELETE:', error.message);
    res.status(500).json({ error: 'Error al eliminar el alumno', details: error.message });
  }
});

// Solo escuchar si no estamos en Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Servidor local ejecutándose en http://localhost:${port}`);
  });
}

export default app;
