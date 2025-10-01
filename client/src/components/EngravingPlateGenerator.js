import React, { useRef, useEffect, useState } from 'react';
import { PhotoIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

function EngravingPlateGenerator({ door, onClose }) {
  const canvasRef = useRef(null);
  const [imageReady, setImageReady] = useState(false);
  const [logoImage, setLogoImage] = useState(null);

  // Default logo placeholder - you can replace this with actual logo
  const defaultLogo = `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60">
      <rect width="100" height="60" fill="#2563eb" rx="5"/>
      <text x="50" y="35" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">LOGO</text>
    </svg>
  `)}`;

  useEffect(() => {
    generatePlateImage();
  }, [door]);

  const generatePlateImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size (typical engraving plate dimensions)
    canvas.width = 600;
    canvas.height = 200;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Load and draw logo
    const img = new Image();
    img.onload = () => {
      // Draw logo on the left
      ctx.drawImage(img, 30, 30, 80, 50);

      // Add text content
      drawText(ctx);
      setImageReady(true);
    };
    img.src = logoImage || defaultLogo;
  };

  const drawText = (ctx) => {
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';

    // Main title
    ctx.font = 'bold 18px Arial';
    ctx.fillText('REFUGE BAY DOOR', 140, 50);

    // Serial number
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Serial: ${door.serial_number}`, 140, 75);

    // Drawing number
    ctx.fillText(`Drawing: ${door.drawing_number}`, 140, 95);

    // Specifications
    ctx.font = '12px Arial';
    ctx.fillText(`Size: ${door.size}M`, 140, 115);
    ctx.fillText(`Pressure: ${door.pressure} kPa`, 250, 115);
    ctx.fillText(`Type: ${door.door_type || 'V1'}`, 350, 115);

    // Description
    ctx.font = '10px Arial';
    ctx.fillText(door.description || 'Refuge Bay Door', 140, 135);

    // Bottom info
    ctx.font = '8px Arial';
    ctx.fillText('Manufactured by Your Company Name', 140, 160);
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 140, 175);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoImage(e.target.result);
        setImageReady(false);
      };
      reader.readAsDataURL(file);
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

  const downloadSVG = () => {
    const svgContent = generateSVGPlate();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `engraving-plate-${door.serial_number}.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  };

  const generateSVGPlate = () => {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200">
        <!-- Border -->
        <rect x="10" y="10" width="580" height="180" fill="white" stroke="black" stroke-width="2"/>

        <!-- Logo placeholder -->
        <rect x="30" y="30" width="80" height="50" fill="#2563eb" rx="5"/>
        <text x="70" y="60" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">LOGO</text>

        <!-- Main text -->
        <text x="140" y="50" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="black">REFUGE BAY DOOR</text>

        <!-- Serial and Drawing -->
        <text x="140" y="75" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="black">Serial: ${door.serial_number}</text>
        <text x="140" y="95" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="black">Drawing: ${door.drawing_number}</text>

        <!-- Specifications -->
        <text x="140" y="115" font-family="Arial, sans-serif" font-size="12" fill="black">Size: ${door.size}M</text>
        <text x="250" y="115" font-family="Arial, sans-serif" font-size="12" fill="black">Pressure: ${door.pressure} kPa</text>
        <text x="350" y="115" font-family="Arial, sans-serif" font-size="12" fill="black">Type: ${door.door_type || 'V1'}</text>

        <!-- Description -->
        <text x="140" y="135" font-family="Arial, sans-serif" font-size="10" fill="black">${door.description || 'Refuge Bay Door'}</text>

        <!-- Footer -->
        <text x="140" y="160" font-family="Arial, sans-serif" font-size="8" fill="black">Manufactured by Your Company Name</text>
        <text x="140" y="175" font-family="Arial, sans-serif" font-size="8" fill="black">Date: ${new Date().toLocaleDateString()}</text>
      </svg>
    `;
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
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Company Logo (optional)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <PhotoIcon className="h-5 w-5 mr-2" />
                Upload Logo
              </label>
              {logoImage && (
                <span className="text-sm text-green-600">Logo uploaded</span>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 max-w-full h-auto"
                style={{ maxHeight: '300px' }}
              />
            </div>
          </div>

          {/* Download Options */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-gray-500">
              Recommended for engraving: SVG format for scalability
            </div>
            <div className="flex space-x-3">
              <button
                onClick={downloadSVG}
                disabled={!imageReady}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download SVG
              </button>
              <button
                onClick={downloadImage}
                disabled={!imageReady}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EngravingPlateGenerator;