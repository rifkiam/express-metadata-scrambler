import express from 'express';
import path from 'path';
import fs from 'fs';
import px from 'piexifjs';
import { upload } from './multer.js';
import crypto, { randomUUID } from 'crypto';

const app = express();
const port = 3000;

function encrypt(input, key, iv, number = false) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    if (number == true) {
        let encrypted = cipher.update(input.toString(), 'utf-8', 'hex')
        encrypted += cipher.final('hex')

        let enc_copy = encrypted
        parseInt(enc_copy)
        return enc_copy
    }
    else {
        let encrypted = cipher.update(input, 'utf-8', 'hex')
        encrypted += cipher.final('hex')

        return encrypted
    }

}
  
  // Function to decrypt a string
function decrypt(input, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(input, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')
    return decrypted
}



app.post('/upload', upload.single('file'), (req, res) => {  
    // seed = req.body('seed')

    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    const newFileName = randomUUID().toString()

    let iv
    let key
    
    const prov_or_not = req.body.provide
    
    if (prov_or_not === 'true') {
        iv = crypto.randomBytes(16)
        key = crypto.randomBytes(32)
    }
    else if (prov_or_not === 'false') {
        iv = req.body.iv
        key = req.body.key
    }

    if (fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.png') {
        const imageData = fs.readFileSync(req.file.path);
        const exifData = px.load(imageData.toString('binary'));

        try {
            // let exif_arr = [exifData['GPS'][px.GPSIFD.GPSLatitude], exifData['GPS'][px.GPSIFD.GPSLongitude], exifData['GPS'][px.GPSIFD.GPSSatellites], exifData['0th']['306'], exifData.Exif['36867'], exifData.Exif['36868'], exifData['0th']['271'], exifData['0th']['272']]
            
            // let exif_arr = [
            //     {
            //         new: newExif['GPS'][px.GPSIFD.GPSLatitude],
            //         old: exifData['GPS'][px.GPSIFD.GPSLatitude]
            //     }, 
            //     {
            //         new: newExif['GPS'][px.GPSIFD.GPSLongitude],
            //         old: exifData['GPS'][px.GPSIFD.GPSLongitude]
            //     }, 
            //     {
            //         new: newExif['GPS'][px.GPSIFD.GPSSatellites],
            //         old: exifData['GPS'][px.GPSIFD.GPSSatellites]
            //     }, 
            //     {
            //         new: newExif['0th']['306'],
            //         old: exifData['0th']['306']
            //     }, 
            //     {
            //         new: newExif.Exif['36867'],
            //         old: exifData.Exif['36867']
            //     }, 
            //     {
            //         new: newExif.Exif['36868'],
            //         old: exifData.Exif['36868']
            //     }, 
            //     {
            //         new: newExif['0th']['271'],
            //         old: exifData['0th']['271']
            //     }, 
            //     {
            //         new: newExif['0th']['272'],
            //         old: exifData['0th']['272']
            //     }
            // ]

            // for(let exif of exif_arr) {
            //     console.log(exif + "\n")

            //     if (!exif) {
            //         continue
            //     }
            //     else {
            //         exif = encrypt(exif, key, iv).toString()        
            //     }
            //     console.log(exif + "\n")
            // }
            
            // exifData['GPS'][px.GPSIFD.GPSLatitude] = encrypt(exifData['GPS'][px.GPSIFD.GPSLatitude], key, iv)
            // exifData['GPS'][px.GPSIFD.GPSLongitude] = encrypt(exifData['GPS'][px.GPSIFD.GPSLongitude], key, iv)
            // exifData['GPS'][px.GPSIFD.GPSSatellites] = encrypt(exifData['GPS'][px.GPSIFD.GPSSatellites], key, iv)
            if (exifData.GPS) {
                console.log(exifData.GPS['2'][0][0], exifData.GPS['4'][0][0])
                exifData.GPS['2'][0][0] = encrypt(exifData.GPS['2'][0][0] + 3, key, iv, true)
                exifData.GPS['4'][0][0] = encrypt(exifData.GPS['4'][0][0] + 3, key, iv, true)
                // exifData['GPS'][px.GPSIFD.GPSSatellites] = encrypt(exifData['GPS'][px.GPSIFD.GPSSatellites], key, iv)
            }

            exifData['0th']['306'] = encrypt(exifData['0th']['306'], key, iv)
            exifData.Exif['36867'] = encrypt(exifData.Exif['36867'], key, iv)
            exifData.Exif['36868'] = encrypt(exifData.Exif['36868'], key, iv)
            exifData['0th']['271'] = encrypt(exifData['0th']['271'], key, iv)
            exifData['0th']['272'] = encrypt(exifData['0th']['272'], key, iv)
        }
        catch (e) {
            console.log(e)
            res.json({
                message: 'internal server error',
                error: e
            })
            return;
        }

        const editedImageData = px.insert(px.dump(exifData), imageData.toString('binary'));
        fs.writeFileSync(req.file.path, editedImageData, 'binary');
    }
        
    const newFilePath = path.join('uploads/', newFileName + fileExtension);
    fs.renameSync(req.file.path, newFilePath);

    const fileLink = 'http://localhost:3000/download/' + newFileName + fileExtension

    res.json({ message: 'File uploaded successfully',
                data: {
                    link: fileLink,
                    recovery_key: key,
                    recovery_vector: iv
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