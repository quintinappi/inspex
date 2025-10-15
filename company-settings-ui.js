// Company Settings Section Component (to be added to Admin.js)
{showCompanySettings && (
  <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
      <h3 className="text-lg leading-6 font-medium text-gray-900">Company Settings</h3>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Upload and manage company logo for certificates.
      </p>
    </div>
    <div className="px-4 py-6 sm:px-6">
      <div className="space-y-6">
        {/* Current Logo Preview */}
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <h4 className="text-sm font-medium text-gray-900">Current Logo</h4>
          </div>
          <div className="flex items-center space-x-4">
            {companySettings.logo_url ? (
              <div className="relative">
                <img
                  src={companySettings.logo_url}
                  alt="Company Logo"
                  className="h-16 w-16 object-contain border border-gray-300 rounded-md"
                />
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to remove the logo?')) {
                      // Handle logo removal
                      setCompanySettings({ logo_url: null, logo_storage_path: null });
                    }
                  }}
                  className="absolute -top-2 -right-2 h-5 w-5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                <PhotoIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="text-sm text-gray-500">
              {companySettings.logo_url ? 'Logo uploaded' : 'No logo uploaded'}
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload New Logo</label>
          <div className="mt-1 flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedLogoFile(e.target.files[0])}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              disabled={!selectedLogoFile}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Upload Logo
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            PNG, JPG, or SVG. Recommended size: 200x200px. Max file size: 2MB.
          </p>
        </div>
      </div>
    </div>
  </div>
)}
