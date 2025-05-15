sap.ui.define([], function() {
    "use strict";
    
    return {
        /**
         * Uploads a file to Cloudinary
         * @param {File} file - The file object to upload
         * @param {string} preset - The Cloudinary upload preset (optional)
         * @returns {Promise} A promise that resolves with the Cloudinary response
         */
        uploadToCloudinary: function(file, preset) {
            return new Promise(function(resolve, reject) {
                // Create a FormData object
                var formData = new FormData();
                
                // Add the file to the form data
                formData.append('file', file);
                
                // Add the upload preset if provided
                if (preset) {
                    formData.append('upload_preset', preset);
                }
                
                // Create XMLHttpRequest
                var xhr = new XMLHttpRequest();
                
                // Cloudinary upload URL - replace 'your_cloud_name' with your actual cloud name
                xhr.open('POST', 'https://api.cloudinary.com/v1_1/dpx8zy9gp/image/upload', true);
                
                // Handle the response
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        var response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } else {
                        reject('Upload failed with status: ' + xhr.status);
                    }
                };
                
                // Handle upload errors
                xhr.onerror = function() {
                    reject('Upload failed due to network error');
                };
                
                // Send the form data to Cloudinary
                xhr.send(formData);
            });
        }
    };
});