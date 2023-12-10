HOW TO USE

POST ```/upload```

This endpoint serves as the main feature of the app, which it will scramble the metadata of the image file you provide. The ```shift``` number will be used for the purpose of geolocation coordinates scrambling.
body:
```
file: file
shift: number (range 1-10)
provide: ENUM ('true' or 'false')
```

if provide === 'true', it will autogenerate a 16 bytes of initialization vector (IV) and 32 bytes of key for you. If not, you will have to provide additional data in the body below:
```
iv: 16 hexadecimal bytes (example: b8 0a a3 65 5a 18 bd ba ca 7e d7 df 11 f9 bf 66)
key: 32 hexadecimal bytes (example: c1 dc ca 9e f0 78 96 08 b1 8d 57 8e d4 43 ad b4 7d af 9b c5 4a 7b 06 93 8e 30 fd 0c bf bc 2f 49)
```

example response:
```
{
    "message": "File uploaded successfully",
    "data": {
        "link": "http://localhost:3000/download/3453ca53-2b90-4049-a8be-5eaf26c46e9f.jpg",
        "filename": "3453ca53-2b90-4049-a8be-5eaf26c46e9f.jpg",
        "recovery_shift_number": "8",
        "recovery_key": "c1 dc ca 9e f0 78 96 08 b1 8d 57 8e d4 43 ad b4 7d af 9b c5 4a 7b 06 93 8e 30 fd 0c bf bc 2f 49",
        "recovery_vector": "b8 0a a3 65 5a 18 bd ba ca 7e d7 df 11 f9 bf 66"
    }
}
```


POST ```/original/:filename```

This endpoint will return the original version of the image file you scrambled in the app, and the metadata in it will be its initial version from when you first uploaded it in the app. It needs the EXACT SAME IV, KEY, AND SHIFT NUMBER you provided when the image is uploaded here for scrambling.

```
shift: number (range 1-10)
iv: 16 hexadecimal bytes (example: b8 0a a3 65 5a 18 bd ba ca 7e d7 df 11 f9 bf 66)
key: 32 hexadecimal bytes (example: c1 dc ca 9e f0 78 96 08 b1 8d 57 8e d4 43 ad b4 7d af 9b c5 4a 7b 06 93 8e 30 fd 0c bf bc 2f 49)
```

example response:
```
{
    "status": 200,
    "message": "File exists",
    "data": {
        "link": "http://localhost:3000/download/3453ca53-2b90-4049-a8be-5eaf26c46e9f.jpg"
    }
}
```

GET ```/download/:filename```

Endpoint to download the file

example request:
```
http://localhost:3000/download/3453ca53-2b90-4049-a8be-5eaf26c46e9f.jpg
```
