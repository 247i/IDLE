// Speedscope Viewer JavaScript
(function() {
    'use strict';

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    function initialize() {
        // This file is loaded but the main initialization happens in the HTML file
        // We just provide utility functions here
        console.log('Speedscope viewer JavaScript loaded');
    }

    // Utility function to format file sizes
    window.formatFileSize = function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Utility function to format duration
    window.formatDuration = function(microseconds) {
        if (microseconds < 1000) {
            return microseconds.toFixed(2) + ' μs';
        } else if (microseconds < 1000000) {
            return (microseconds / 1000).toFixed(2) + ' ms';
        } else {
            return (microseconds / 1000000).toFixed(2) + ' s';
        }
    };

    // Utility function to truncate text
    window.truncateText = function(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

})();