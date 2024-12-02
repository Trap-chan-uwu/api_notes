const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');




exports.uploadMedia = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo' });
  }

  const file = req.file;
  const originalName = req.body.originalName || file.originalname; // Use provided name or fallback to original name
  const fileName = `${Date.now()}_${originalName}.webp`;

  try {
    // Transform the image
    const transformedImageBuffer = await sharp(file.buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Save the transformed image to the database
    const [result] = await db.query(
      'INSERT INTO media (file_name, original_name, mime_type, image_data) VALUES (?, ?, ?, ?)',
      [fileName, originalName, 'image/webp', transformedImageBuffer]
    );

    const fileUrl = `/api/media/${result.insertId}`;

    res.status(201).json({
      message: 'Archivo subido y transformado exitosamente',
      id: result.insertId.toString(),
      url: fileUrl,
      originalName: originalName
    });
  } catch (error) {
    console.error('Error al procesar y guardar la imagen:', error);
    res.status(500).json({ 
      message: 'Error al subir y procesar el archivo', 
      error: error.message
    });
  }
};

exports.getMedia = async (req, res) => {
  const mediaId = req.params.id;

  try {
    const [rows] = await db.query('SELECT * FROM media WHERE id = ?', [mediaId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }

    const media = rows[0];

    res.set('Content-Type', media.mime_type);
    res.send(media.image_data);
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    res.status(500).json({ message: 'Error al obtener la imagen', error: error.message });
  }
};

exports.getMedia = async (req, res) => {
  const mediaId = req.params.id;

  try {
    const [rows] = await db.query('SELECT * FROM media WHERE id = ?', [mediaId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Imagen no encontrada' });
    }

    const media = rows[0];

    res.set('Content-Type', media.mime_type);
    res.send(media.image_data);
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    res.status(500).json({ message: 'Error al obtener la imagen', error: error.message });
  }
};


exports.getNote = async (req, res) => {
  const noteId = req.params.id;

  try {
    const [noteResult] = await db.query('SELECT * FROM notes WHERE id = ?', [noteId]);
    
    if (noteResult.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const note = noteResult[0];

    const [mediaResult] = await db.query(
      'SELECT m.id, m.file_path, nm.position FROM media m ' +
      'JOIN note_media nm ON m.id = nm.media_id ' +
      'WHERE nm.note_id = ?',
      [noteId]
    );

    note.media = mediaResult;

    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Error fetching note', error: error.message });
  }
};
exports.deleteMedia = async (req, res) => {
  const mediaId = req.params.id;

  try {
    const [mediaResult] = await db.query('SELECT * FROM media WHERE id = ?', [mediaId]);
    
    if (mediaResult.length === 0) {
      return res.status(404).json({ message: 'Media not found' });
    }

    const media = mediaResult[0];

    // Delete the file from the filesystem
    await fs.unlink(media.file_path);

    // Delete the media entry from the database
    await db.query('DELETE FROM media WHERE id = ?', [mediaId]);

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ message: 'Error deleting media', error: error.message });
  }
};
exports.uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded' });
  }

  const imagePath = req.file.path;
  const description = req.body.description || '';

  try {
    const [result] = await db.query(
      'INSERT INTO media (type, path, description) VALUES (?, ?, ?)',
      ['image', imagePath, description]
    );
    
    res.status(201).json({ 
      message: 'Image uploaded successfully', 
      id: result.insertId,
      url: `/uploads/${path.basename(imagePath)}`
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
};

exports.uploadVideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No video file uploaded' });
  }

  const videoPath = req.file.path;
  const description = req.body.description || '';

  try {
    const [result] = await db.query(
      'INSERT INTO media (type, path, description) VALUES (?, ?, ?)',
      ['video', videoPath, description]
    );
    
    res.status(201).json({ 
      message: 'Video uploaded successfully', 
      id: result.insertId,
      url: `/uploads/${path.basename(videoPath)}`
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ message: 'Error uploading video' });
  }
};