const db = require('../config/database');
const fs = require('fs');
const path = require('path');

exports.createNote = async (req, res) => {
  console.log('Received request body:', req.body);
  console.log('Received files:', req.files);

  let title, content, formatting, mediaPositions;

  try {
    // Verifica si `notes` está presente y parsea el contenido de la nota
    if (req.body.notes) {
      const noteData = JSON.parse(req.body.notes);  // Parseamos los datos de la nota
      title = noteData.title;
      content = noteData.content;
      formatting = noteData.formatting;
      mediaPositions = noteData.mediaPositions;
    } else {
      // Si no existe `notes`, usa directamente los campos en `req.body`
      title = req.body.title+"con medios";
      content = req.body.content;
      formatting = req.body.formatting;
      mediaPositions = req.body.mediaPositions;
      console.log('Subiendo con medios');
    }

    console.log('Parsed note data:', { title, content, formatting, mediaPositions });

    // Validación de los campos obligatorios
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Asegúrate de que `formatting` sea una cadena JSON válida
    formatting = formatting ? JSON.stringify(formatting) : '{}';

    // Obtener una conexión del pool
    const connection = await db.getConnection();

    try {
      // Iniciar la transacción en la conexión
      await connection.beginTransaction();

      // Insertar la nota en la base de datos (sin media_positions)
      const [noteResult] = await db.query(
        'INSERT INTO notes (user_id, title, content, formatting) VALUES (?, ?, ?, ?)',
        [userId, title, content, JSON.stringify(formatting)]
      );
  
      const noteId = noteResult.insertId;

      // Manejar las posiciones de los medios
      if (mediaPositions && mediaPositions.length > 0) {
        for (let position of mediaPositions) {
          await connection.query(
            'INSERT INTO note_media (note_id, media_id, position) VALUES (?, ?, ?)',
            [noteId, position.mediaId, position.position]
          );
        }
      }

      // Manejar los archivos multimedia (si existen)
      if (req.files && req.files.media) {
        for (let file of req.files.media) {
          await connection.query(
            'INSERT INTO media (note_id, file_name, file_path, mime_type) VALUES (?, ?, ?, ?)',
            [noteId, file.filename, file.path, file.mimetype]
          );
        }
      }

      // Commit de la transacción
      await connection.commit();

      console.log('Note created successfully:', noteId);
      res.status(201).json({ message: 'Note created successfully', noteId: noteId });
    } catch (error) {
      // Rollback si ocurre un error
      await connection.rollback();
      throw error;
    } finally {
      // Liberar la conexión
      connection.release();
    }

  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Error creating note', error: error.message });
  }
};

exports.getNotesByUser = async (req, res) => {
  const userId = req.params.userId;

  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Error fetching notes' });
  }
};

exports.createNote = async (req, res) => {
  console.log('Cuerpo de la solicitud recibido:', req.body);

  const { title, content, formatting, mediaPositions, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId es requerido' });
  }

  try {
    // Validación de los campos obligatorios
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Asegúrate de que `formatting` sea una cadena JSON válida
    const formattingJSON = formatting ? JSON.stringify(formatting) : '{}';

    // Obtener una conexión del pool
    const connection = await db.getConnection();

    try {
      // Iniciar la transacción en la conexión
      await connection.beginTransaction();

      // Insertar la nota en la base de datos
      const [noteResult] = await connection.query(
        'INSERT INTO notes (user_id, title, content, formatting) VALUES (?, ?, ?, ?)',
        [userId, title, content, formattingJSON]
      );

      const noteId = noteResult.insertId;

      // Manejar las posiciones de los medios
      if (mediaPositions && mediaPositions.length > 0) {
        for (let position of mediaPositions) {
          await connection.query(
            'INSERT INTO note_media (note_id, media_id, position) VALUES (?, ?, ?)',
            [noteId, position.mediaId, position.position]
          );
        }
      }

      // Commit de la transacción
      await connection.commit();

      console.log('Note created successfully:', noteId);
      res.status(201).json({ message: 'Note created successfully', noteId: noteId });
    } catch (error) {
      // Rollback si ocurre un error
      await connection.rollback();
      throw error;
    } finally {
      // Liberar la conexión
      connection.release();
    }

  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Error creating note', error: error.message });
  }
};

exports.getNote = async (req, res) => {
  const noteId = req.params.id;
  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE id = ?', [noteId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Error fetching note' });
  }
};

exports.updateNote = async (req, res) => {
  const noteId = req.params.id;
  const { title, content } = req.body;
  let imagePath = null;
  let videoPath = null;

  try {
    const [existingNote] = await db.query('SELECT * FROM notes WHERE id = ?', [noteId]);
    if (existingNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (req.files) {
      if (req.files.image) {
        imagePath = req.files.image[0].path;
        if (existingNote[0].image_path) {
          fs.unlinkSync(existingNote[0].image_path);
        }
      }
      if (req.files.video) {
        videoPath = req.files.video[0].path;
        if (existingNote[0].video_path) {
          fs.unlinkSync(existingNote[0].video_path);
        }
      }
    }

    await db.query(
      'UPDATE notes SET title = ?, content = ?, image_path = COALESCE(?, image_path), video_path = COALESCE(?, video_path) WHERE id = ?',
      [title, content, imagePath, videoPath, noteId]
    );
    res.json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Error updating note' });
  }
};

exports.deleteNote = async (req, res) => {
  const noteId = req.params.id;
  try {
    const [existingNote] = await db.query('SELECT * FROM notes WHERE id = ?', [noteId]);
    if (existingNote.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (existingNote[0].image_path) {
      fs.unlinkSync(existingNote[0].image_path);
    }
    if (existingNote[0].video_path) {
      fs.unlinkSync(existingNote[0].video_path);
    }

    await db.query('DELETE FROM notes WHERE id = ?', [noteId]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Error deleting note' });
  }
};

exports.uploadMedia = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const file = req.file;
  const fileExtension = path.extname(file.originalname);
  const fileName = `${Date.now()}${fileExtension}`;
  const filePath = path.join('uploads', fileName);

  try {
    await fs.promises.rename(file.path, filePath);

    const [result] = await db.query(
      'INSERT INTO media (file_name, original_name, file_path, mime_type) VALUES (?, ?, ?, ?)',
      [fileName, file.originalname, filePath, file.mimetype]
    );

    const fileUrl = `/uploads/${fileName}`;

    res.status(201).json({
      message: 'File uploaded successfully',
      id: result.insertId,
      url: fileUrl,
      originalName: file.originalname
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
};

exports.getNotesByUser = async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (isNaN(userId) || userId < 0) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Error fetching notes' });
  }
};

exports.getRecentNotes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notes ORDER BY created_at DESC LIMIT 10'); // Limitamos a 10 notas recientes
    res.json(rows);
  } catch (error) {
    console.error('Error fetching recent notes:', error);
    res.status(500).json({ message: 'Error fetching recent notes' });
  }
};