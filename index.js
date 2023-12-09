import express from 'express';
import path from 'path';
import fs from 'fs';
import px from 'piexifjs';
import { upload } from './multer.js';
import crypto, { randomUUID } from 'crypto';

const app = express();
const port = 3000;

function encrypt(input, key, iv) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(input, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}
  
  // Function to decrypt a string
function decrypt(input, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(input, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

app.post('/upload', upload.single('file'), (req, res) => {  
    // seed = req.body('seed')

    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    const newFileName = randomUUID().toString()
    
    const len = req.body.seed.length

    const iv = crypto.randomBytes(len)
    console.log(iv, req.body.seed)

    if (fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.png') {
        const imageData = fs.readFileSync(req.file.path);
        const exifData = px.load(imageData.toString('binary'));
        
        exifData['GPS'][px.GPSIFD.GPSLatitude] = encrypt(exifData['GPS'][px.GPSIFD.GPSLatitude], req.body.seed, iv)
        exifData['GPS'][px.GPSIFD.GPSLongitude] = encrypt(exifData['GPS'][px.GPSIFD.GPSLongitude], req.body.seed, iv)
        exifData['GPS'][px.GPSIFD.GPSSatellites] = encrypt(exifData['GPS'][px.GPSIFD.GPSSatellites], req.body.seed, iv)
        exifData['0th']['306'] = encrypt(exifData['0th']['306'], req.body.seed, iv)
        exifData.Exif['36867'] = encrypt(exifData.Exif['36867'], req.body.seed, iv)
        exifData.Exif['36868'] = encrypt(exifData.Exif['36868'], req.body.seed, iv)
        exifData['0th']['271'] = encrypt(exifData['0th']['271'], req.body.seed, iv)
        exifData['0th']['272'] = encrypt(exifData['0th']['272'], req.body.seed, iv)
    
        const editedImageData = px.insert(px.dump(exifData), imageData.toString('binary'));
        fs.writeFileSync(req.file.path, editedImageData, 'binary');
    }
        
    const newFilePath = path.join('uploads/', newFileName + fileExtension);
    fs.renameSync(req.file.path, newFilePath);

    const fileLink = window.location.origin + '/upload/' + newFileName + fileExtension

    res.json({ message: 'File uploaded successfully',
                data: {
                    link: fileLink,
                    recovery_cipher: iv
                }
    });
});


app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.join(currentDir, 'uploads', filename).slice(1);

    if (fs.existsSync(filePath)) {

        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});