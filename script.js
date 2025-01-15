const express = require('express');
const cors = require('cors');
const tf = require('@tensorflow/tfjs');
const faceapi = require('@vladmandic/face-api');
const { Canvas, Image, ImageData, createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Configure canvas for face-api.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load models once when server starts
let modelsLoaded = false;

function ensureUploadsDirectory() {
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)){
        fs.mkdirSync(uploadsDir);
        console.log('Created uploads directory');
    }
}

async function loadModels() {
    const modelPath = './models';
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    modelsLoaded = true;
    console.log('Models loaded successfully.');
}

async function downloadImage(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const image = await loadImage(buffer);
    return image;
}

async function getFaceDescriptors(image) {
    const detection = await faceapi.detectSingleFace(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection;
}

async function compareFaces(image1Url, image2Url) {
    try {
        // Ensure models are loaded
        if (!modelsLoaded) {
            await loadModels();
        }

        // Download both images
        const [image1, image2] = await Promise.all([
            downloadImage(image1Url),
            downloadImage(image2Url)
        ]);

        // Get face descriptors for both images
        const [descriptor1, descriptor2] = await Promise.all([
            getFaceDescriptors(image1),
            getFaceDescriptors(image2)
        ]);

        // Check if faces were detected in both images
        if (!descriptor1 || !descriptor2) {
            return {
                error: 'Could not detect faces in one or both images',
                matched: false
            };
        }

        // Calculate distance between faces
        const distance = faceapi.euclideanDistance(
            descriptor1.descriptor,
            descriptor2.descriptor
        );

        // Calculate similarity score (1 - distance)
        const similarity = 1 - distance;

        return {
            matched: similarity > 0.6, // You can adjust this threshold
            similarity: similarity,
            distance: distance
        };

    } catch (error) {
        console.error('Error comparing faces:', error);
        throw error;
    }
}

async function loadImageFromFile(filePath) {
    const image = await loadImage(filePath);
    return image;
}

// API endpoint for face comparison
app.post('/api/compare-faces', async (req, res) => {
    try {
        const { image1Url, image2Url } = req.body;

        if (!image1Url || !image2Url) {
            return res.status(400).json({
                error: 'Both image URLs are required'
            });
        }

        const result = await compareFaces(image1Url, image2Url);
        res.json({
            ...result,
            percentageMatch: `${Math.round(result.similarity * 100)}%`
        });

    } catch (error) {
        res.status(500).json({
            error: 'Error processing face comparison',
            details: error.message
        });
    }
});

// API endpoint for comparing URL image with uploaded image
app.post('/api/compare-mixed', upload.single('image'), async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const uploadedFile = req.file;

        if (!imageUrl || !uploadedFile) {
            return res.status(400).json({
                error: 'Both image URL and uploaded file are required'
            });
        }
        console.log('1111');

        // Load the URL image
        const urlImage = await downloadImage(imageUrl);

        console.log('2222');

        
        // Load the uploaded file
        const uploadedImage = await loadImageFromFile(uploadedFile.path);

        console.log('3333');


        // Get face descriptors
        const [urlDescriptor, uploadedDescriptor] = await Promise.all([
            getFaceDescriptors(urlImage),
            getFaceDescriptors(uploadedImage)
        ]);

        console.log('444');


        // Check if faces were detected in both images
        if (!urlDescriptor || !uploadedDescriptor) {
            return res.json({
                error: 'Could not detect faces in one or both images',
                matched: false
            });
        }

        // Calculate distance between faces
        const distance = faceapi.euclideanDistance(
            urlDescriptor.descriptor,
            uploadedDescriptor.descriptor
        );

        // Calculate similarity score
        const similarity = 1 - distance;

        // Clean up uploaded file after successful comparison
        fs.unlink(uploadedFile.path, (err) => {
            if (err) {
                console.error('Error deleting uploaded file:', err);
            } else {
                console.log('Successfully deleted uploaded file');
            }
        });

        res.json({
            matched: similarity > 0.6,
            similarity: similarity,
            distance: distance,
            percentageMatch: `${Math.round(similarity * 100)}%`
        });

    } catch (error) {
        // Clean up uploaded file in case of error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.error('Error deleting uploaded file:', err);
                } else {
                    console.log('Successfully deleted uploaded file after error');
                }
            });
        }

        res.status(500).json({
            error: 'Error processing face comparison',
            details: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        name: 'Face Detection API',
        status: 'running',
        endpoints: {
            compareFaces: '/api/compare-faces',
            compareMixed: '/api/compare-mixed'
        },
        modelsLoaded: modelsLoaded
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    ensureUploadsDirectory(); // Create uploads directory if it doesn't exist
    loadModels(); // Load models when server starts
});
