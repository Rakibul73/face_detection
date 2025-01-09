// const tf = require('@tensorflow/tfjs-node');
const faceapi = require('face-api.js');
const { Canvas, Image, ImageData, createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Configure canvas for face-api.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function loadModels() {
    const modelPath = './models'; // Download pre-trained models and save here
    // await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.mtcnn.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    console.log('Models loaded successfully.');
}

async function getFaceDescriptors(imagePath) {
    const image = await loadImage(imagePath);
    // const detection = await faceapi.detectSingleFace(image, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    //     .withFaceLandmarks()
    //     .withFaceDescriptor()
    const detection = await faceapi.detectSingleFace(image, new faceapi.MtcnnOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
    
    return detection;
}

async function matchFaces(referenceFolder, queryImagePath, threshold = 0.4) {
    const labeledDescriptors = [];
    const files = fs.readdirSync(referenceFolder).filter(file => /\.(jpg|jpeg|png)$/.test(file));
    
    // Process reference images
    for (const file of files) {
        const filePath = path.join(referenceFolder, file);
        const detection = await getFaceDescriptors(filePath);
        if (detection) {
            labeledDescriptors.push(
                new faceapi.LabeledFaceDescriptors(
                    path.parse(file).name,
                    [detection.descriptor]
                )
            );
        }
    }

    console.log(`  111111   `);

    const queryDetection = await getFaceDescriptors(queryImagePath);
    if (!queryDetection) {
        console.log('No face detected in query image');
        return [];
    }

    console.log(`  222222   `);

    // Find matches for all reference images
    const matches = [];
    for (const descriptor of labeledDescriptors) {
        // Calculate distance directly using euclidean distance
        const distance = faceapi.euclideanDistance(
            queryDetection.descriptor,
            descriptor.descriptors[0]
        );
        
        matches.push({
            file: `${descriptor.label}.jpg`,
            // distance: distance,
            confidence: 1 - distance
        });
    }

    console.log(`  333333   `);

    // Sort matches by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
}

(async () => {
    const referenceFolder = './faces';
    const queryImagePath = './query.jpg';

    await loadModels();
    const matches = await matchFaces(referenceFolder, queryImagePath);
    
    // Optional: filter matches above a certain confidence threshold
    const highConfidenceMatches = matches.filter(match => match.confidence > 0.6);
    
    console.log('All matches:', matches);
    console.log('High confidence matches:', highConfidenceMatches);
})();
