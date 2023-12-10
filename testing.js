import fs from 'fs';
import px from 'piexifjs';

const getBase64DataFromJpegFile = filename => fs.readFileSync(filename).toString('binary');
const getExifFromJpegFile = filename => px.load(getBase64DataFromJpegFile(filename));
const palm1Exif = getExifFromJpegFile("../exif-samples-master/jpg/Kodak_CX7530.jpg");

console.log(palm1Exif.GPS)