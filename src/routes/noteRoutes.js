const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const upload = require('../middleware/upload');

router.post('/', upload.array('media'), noteController.createNote);
router.get('/:id', noteController.getNote);
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), noteController.updateNote);
router.delete('/:id', noteController.deleteNote);
router.get('/user/:userId', noteController.getNotesByUser);
router.post('/upload-media', upload.single('file'), noteController.uploadMedia);

module.exports = router;