import React, { useRef, useEffect, useState } from 'react';
import { ArrowDownTrayIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useNotification } from '../context/NotificationContext';

function EngravingPlateGenerator({ door, onClose }) {
  const canvasRef = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const { showSuccess, showError } = useNotification();

  // Manufab logo - embedded as base64
  const manufabLogo = '/logo.png'; // We'll save the logo as a public asset

  useEffect(() => {
    generatePlateImage();
  }, [door]);

  const generatePlateImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to match your example (wider format)
    canvas.width = 800;
    canvas.height = 400;

    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and draw logo
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw logo at top center in oval shape area
      const logoWidth = 400;
      const logoHeight = 150;
      const logoX = (canvas.width - logoWidth) / 2;
      const logoY = 20;

      ctx.drawImage(img, logoX, logoY, logoWidth, logoHeight);

      // Add text content below logo
      drawText(ctx);
      setImageReady(true);
    };
    img.onerror = () => {
      // If logo fails to load, draw placeholder and continue
      ctx.fillStyle = '#8B1538';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MANUFAB', canvas.width / 2, 80);
      drawText(ctx);
      setImageReady(true);
    };
    img.src = manufabLogo;
  };

  const drawText = (ctx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    const centerX = canvas.width / 2;

    // Convert size to mm format for display (e.g., "1.5" -> "1500")
    const sizeMap = {
      '1.5': '1500',
      '1.8': '1800',
      '2.0': '2000',
      '1500': '1500',
      '1800': '1800',
      '2000': '2000'
    };
    const sizeDisplay = sizeMap[door.size] || door.size || '1500';

    // Main title - "1500 REFUGE BAY DOOR" style
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`${sizeDisplay} REFUGE BAY DOOR`, centerX, 210);

    // Pressure - "140 kPa" style
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${door.pressure} kPa`, centerX, 250);

    // Serial Number - "SERIAL NO : MF42-15-1056" style
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`SERIAL NO : ${door.serial_number}`, centerX, 290);

    // Drawing Number - Fixed value as per client requirement
    ctx.font = 'bold 24px Arial';
    ctx.fillText('DWG NO : 001MUFSO54RD1514', centerX, 325);

    // Address at bottom
    ctx.font = '16px Arial';
    ctx.fillText('36 Industria Cres, Emalahleni', centerX, 365);
  };

  const uploadToFirebase = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setUploading(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      // Create storage reference
      const fileName = `engraving-plates/${door.serial_number}-${Date.now()}.png`;
      const storageRef = ref(storage, fileName);

      // Upload file
      await uploadBytes(storageRef, blob);

      // Get download URL
      const url = await getDownloadURL(storageRef);

      setUploadedUrl(url);
      showSuccess('Image uploaded to Firebase Storage successfully!');
      console.log('Uploaded URL:', url);

      return url;
    } catch (error) {
      console.error('Upload error:', error);
      showError('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `engraving-plate-${door.serial_number}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Generate Engraving Plate - {door.serial_number}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 max-w-full h-auto bg-white"
                style={{ maxHeight: '400px' }}
              />
            </div>
          </div>

          {/* Upload Status */}
          {uploadedUrl && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Uploaded successfully!</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p className="break-all">{uploadedUrl}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={uploadToFirebase}
              disabled={!imageReady || uploading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                  Upload to Cloud
                </>
              )}
            </button>
            <button
              onClick={downloadImage}
              disabled={!imageReady}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EngravingPlateGenerator;