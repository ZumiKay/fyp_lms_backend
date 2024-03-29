import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import Storage from './firebase';

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const excelmaker = require('exceljs');
require('dotenv').config();







export const jwtconfig = {
    secret: process.env.JWT_SECRET,
    option: {
        expiresIn: '1h'
    }
};
export const dbconfig = {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    db: process.env.DB_NAME
};



export const initalrole = async (role, book) => {
    const allrole = await role.findAll();
    const data = [
        {
            role_id: uuidv4(),
            role: 'librarian',
            role_description: ''
        },
        {
            role_id: uuidv4(),
            role: 'student',
            role_description: ''
        },
        {
            role_id: uuidv4(),
            role: 'headdepartment',
            role_description: ''
        }
    ];
    if (allrole.length < 0) {
        role.bulkCreate(data)
            .then(() => {
                console.log('role created');
            })
            .catch((err) => console.log(err));
        // getgooglebook('Business & Economics',book)
    } else {
        data.map((i) =>
            role
                .findOne({ where: { role: i.role } })
                .then((rl) => {
                    if (rl) return;
                    else {
                        role.create(i);
                    }
                })
                .catch((err) => console.log(err))
        );
    }
};
export const getgooglebook = (categories, db) => {
    const subject = categories;
    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${subject}&printType=books&orderBy=relevance&maxResults=10&key=${process.env.GOOGLEBOOK_APIKEY}`;
    let book = [];
    fetch(url)
        .then((response) => response.json())
        .then((data) => {
            data.items.map((i) =>
                book.push({
                    ISBN: i.volumeInfo.industryIdentifiers,
                    title: i.volumeInfo.title,
                    description: i.volumeInfo.description,
                    cover_img: i.volumeInfo.imageLinks.thumbnail,
                    author: i.volumeInfo.authors,
                    publisher_date: i.volumeInfo.publishedDate,
                    categories: i.volumeInfo.categories,
                    status: 'available'
                })
            );
            db.bulkCreate(book)
                .then(() => console.log('book saved'))
                .catch((err) => console.log(err));
        })
        .catch((err) => {
            console.log(err);
        });
};



//GENERATE REPORT


export const generateExcel = (data, information, informationtypes, generateddate) => {
    const workbook = new excelmaker.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    workbook.created = new Date();
    
    worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Name', key: 'name', width: 15 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Email', key: 'email', width: 15 },
        { header: 'Library Entry (Times)', key: 'entry', width: 40 },
        information !== 'entry' && { header: 'Borrowed Book (books)', key: 'borrow_book', width: 40 }
    ];
   

    data.forEach((i) => {
        worksheet.addRow({
            id: i.ID,
            name: i.fullname,
            department: i.department,
            email: i.email,
            entry: informationtypes !== 'short' ? i.library_entry.map((j) => `${new Date(j.createdAt).getDate()}/${new Date(j.createdAt).getMonth() + 1}/${new Date(j.createdAt).getFullYear()}/\n${new Date(j.createdAt).getHours()}:${new Date(j.createdAt).getMinutes().toString().padStart(2, '0')}:${new Date(j.createdAt).getSeconds().toString().padStart(2, '0')}`).join(', ') : i.library_entry.length,
            borrow_book: information !== 'entry' ? i.borrowedbook.reduce((totalLength, obj) => totalLength + obj.Books.length, 0) : null
        });
    });

    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    return workbook;
};


//Firebase Storage


export const generateQRCodeAndUploadToFirebase = async (text) => {
    try {
      
      const qrCodeBuffer = await QRCode.toBuffer(text, { type: 'png' });
  
      console.log('QR Code Buffer:', qrCodeBuffer);
  
      
      if (!qrCodeBuffer || qrCodeBuffer.byteLength === undefined) {
        throw new Error('QR Code Buffer is undefined or invalid format');
      }
  
      
      const filename = `qrcodes/${text}.png`;
  
      
      const storageRef = ref(Storage, filename);
  
      
      await uploadBytes(storageRef, qrCodeBuffer, {
        contentType: 'image/png',
      });
  
      // Get the public URL of the uploaded file
      const downloadURL = await getDownloadURL(storageRef);
  
      return downloadURL;
    } catch (error) {
      console.error('Error uploading QR code to Firebase:', error);
      throw error; // Re-throw the error for handling elsewhere
    }
  };
 export const deleteQRCodeFirebase = async (file) => {
    const storageRef = ref(Storage , file)

    try {
        await deleteObject(storageRef)

    } catch (error) {

        throw error
        
    }
 }
  