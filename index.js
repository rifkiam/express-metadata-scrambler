import express from 'express';
import path from 'path';
import fs from 'fs';
import px from 'piexifjs';
import { upload } from './multer.js';
import crypto, { randomUUID } from 'crypto';

const app = express();
const port = 3000;

function encrypt(input, key, iv) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let encrypted = cipher.update(input, 'utf-8', 'hex')
    encrypted += cipher.final('hex')
    console.log(encrypted)
    return encrypted

}

function addFromLength(input, length) {
    input += length
    return input
}

function subtractFromLength(input, length) {
    input -= length
    return input
}

  // Function to decrypt a string
function decrypt(input, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(input, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')
    return decrypted
}


app.post('/upload', upload.single('file'), (req, res) => {  
    if (req.body.shift > 10 && typeof(req.body.shift) !== 'number') {
        res.json({
            status: 400,
            message: 'bad request',
            error: 'input a number between 1-10'
        })
        return;
    }

    const coordAdd = req.body.shift
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
            if (exifData.GPS) {
                exifData.GPS['2'][0][0] = addFromLength(exifData.GPS['2'][0][0], parseInt(coordAdd))
                exifData.GPS['4'][0][0] = addFromLength(exifData.GPS['4'][0][0], parseInt(coordAdd))
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

    const keyString = key.toString('hex').match(/.{1,2}/g).join(' ')
    const ivString = iv.toString('hex').match(/.{1,2}/g).join(' ')

    res.json({ message: 'File uploaded successfully',
                data: {
                    link: fileLink,
                    filename: newFileName + fileExtension,
                    recovery_shift_number: coordAdd,
                    recovery_key: keyString,
                    recovery_vector: ivString
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

app.post('/original/:filename', upload.single('file'), (req, res) => {
    console.log(req.params.filename, '\n', req.body.shift)
    if (req.body.shift > 10 && typeof(req.body.shift) !== 'number') {
        res.json({
            status: 400,
            message: 'bad request',
            error: 'input a number between 1-10'
        })
        return;
    }

    const filename = req.params.filename
    const coordAdd = req.body.shift
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const filePath = path.join(currentDir, '/uploads/', filename).slice(1);

    if (fs.existsSync(filePath)) {
        
        let iv = req.body.iv;
        let key = req.body.key;

        const cleanedIV = iv.replace(/\s/g, '');
        const cleanedKey = key.replace(/\s/g, '');

        const ivBuffer = Buffer.from(cleanedIV, 'hex');
        const keyBuffer = Buffer.from(cleanedKey, 'hex');

        console.log(ivBuffer);
        console.log(keyBuffer);

        const fileExtension = path.extname(filePath).toLowerCase();

        if (fileExtension === '.jpg' || fileExtension === '.jpeg' || fileExtension === '.png') {
            const imageData = fs.readFileSync(filePath)
            const exifData = px.load(imageData.toString('binary'));

            try {
                if (exifData.GPS) {
                    exifData.GPS['2'][0][0] = subtractFromLength(exifData.GPS['2'][0][0], parseInt(coordAdd))
                    exifData.GPS['4'][0][0] = subtractFromLength(exifData.GPS['4'][0][0], parseInt(coordAdd))
                }
    
                exifData['0th']['306'] = decrypt(exifData['0th']['306'], keyBuffer, ivBuffer)
                exifData.Exif['36867'] = decrypt(exifData.Exif['36867'], keyBuffer, ivBuffer)
                exifData.Exif['36868'] = decrypt(exifData.Exif['36868'], keyBuffer, ivBuffer)
                exifData['0th']['271'] = decrypt(exifData['0th']['271'], keyBuffer, ivBuffer)
                exifData['0th']['272'] = decrypt(exifData['0th']['272'], keyBuffer, ivBuffer)
            }
            catch (e) {
                console.log(e)
                res.json({
                    status: 500,
                    message: 'internal server error',
                    error: e
                })
                return;
            }

            const editedImageData = px.insert(px.dump(exifData), imageData.toString('binary'));
            fs.writeFileSync(filePath, editedImageData, 'binary');
        }
        
        res.json({
            status: 200,
            message: 'File exists',
            data: {
                link: "http://localhost:3000/download/" + filename,
            }
        });
    } else {
        res.json({
            status: 404,
            message: 'Not Found',
            error: 'File not found'
        });
    }
})


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
