# Face Detection API

A Node.js API for face comparison using TensorFlow.js and face-api.js.

## Prerequisites

- Node.js (v14.15.4)
- npm (v6.14.10)

## Installation

### CPU Version (Tested on CPU)
1. Run `npm install` to install the dependencies
2. Run `npm start` to start the server

### GPU Version (Not tested) (NVIDIA GPUs only)
1. Install CUDA and cuDNN according to TensorFlow requirements
2. Run `npm install @tensorflow/tfjs-node-gpu` to install GPU-enabled TensorFlow
3. Replace the TensorFlow import in script.js:
   ```javascript
   const tf = require('@tensorflow/tfjs-node-gpu');
   ```
4. Run `npm start` to start the server