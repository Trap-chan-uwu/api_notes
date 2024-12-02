const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const upload = require('../middleware/upload');

router.post('/upload-media', upload.single('file'), mediaController.uploadMedia);
router.get('/:id', mediaController.getMedia);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;