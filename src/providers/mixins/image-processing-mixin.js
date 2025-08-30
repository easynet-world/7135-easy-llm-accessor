/**
 * Image Processing Mixin
 * 
 * Provides unified image processing functionality for all providers:
 * - Image format detection and validation
 * - File path, URL, and base64 handling
 * - MIME type detection with caching
 * - Image size validation
 * - Provider-specific format conversion
 */

const fs = require('fs');
const path = require('path');

class ImageProcessingMixin {
  constructor(options = {}) {
    // MIME type cache for performance
    this._mimeTypeCache = new Map([
      ['.jpg', 'image/jpeg'],
      ['.jpeg', 'image/jpeg'],
      ['.png', 'image/png'],
      ['.webp', 'image/webp'],
      ['.gif', 'image/gif'],
      ['.bmp', 'image/bmp'],
      ['.tiff', 'image/tiff'],
      ['.svg', 'image/svg+xml']
    ]);

    // Configuration
    this._maxImageSize = options.maxImageSize || 20971520; // 20MB default
    this._supportedFormats = options.supportedFormats || ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    this._defaultFormat = options.defaultFormat || 'jpeg';
  }

  // ============================================================================
  // CORE IMAGE PROCESSING METHODS
  // ============================================================================

  /**
   * Process image from various sources (URL, file path, base64)
   */
  processImage(imageSource, options = {}) {
    if (!imageSource) {
      throw new Error('Image source is required');
    }

    const maxSize = options.maxSize || this._maxImageSize;
    const targetFormat = options.targetFormat || this._defaultFormat;

    if (typeof imageSource === 'string') {
      if (imageSource.startsWith('data:image/')) {
        return this._processBase64Image(imageSource, maxSize, targetFormat);
      } else if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        return this._processUrlImage(imageSource, maxSize, targetFormat);
      } else {
        return this._processFilePathImage(imageSource, maxSize, targetFormat);
      }
    } else if (Buffer.isBuffer(imageSource)) {
      return this._processBufferImage(imageSource, maxSize, targetFormat);
    } else {
      throw new Error(`Unsupported image source type: ${typeof imageSource}`);
    }
  }

  /**
   * Process image URL (remote or local)
   */
  processImageUrl(imageUrl, options = {}) {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const maxSize = options.maxSize || this._maxImageSize;
    const targetFormat = options.targetFormat || this._defaultFormat;

    if (imageUrl.startsWith('data:image/')) {
      return this._processBase64Image(imageUrl, maxSize, targetFormat);
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return this._processUrlImage(imageUrl, maxSize, targetFormat);
    } else {
      return this._processFilePathImage(imageUrl, maxSize, targetFormat);
    }
  }

  /**
   * Validate image format and size
   */
  validateImage(image, options = {}) {
    const maxSize = options.maxSize || this._maxImageSize;
    const allowedFormats = options.allowedFormats || this._supportedFormats;

    if (!image) {
      throw new Error('Image is required for validation');
    }

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      format: null,
      size: 0,
      type: null
    };

    try {
      if (typeof image === 'string') {
        if (image.startsWith('data:image/')) {
          validation.type = 'base64';
          validation.format = this._extractFormatFromDataUrl(image);
          validation.size = this._calculateBase64Size(image);
        } else if (image.startsWith('http://') || image.startsWith('https://')) {
          validation.type = 'url';
          validation.format = this._extractFormatFromUrl(image);
          validation.size = 0; // Unknown for URLs
        } else {
          validation.type = 'file';
          validation.format = this._extractFormatFromPath(image);
          validation.size = this._getFileSize(image);
        }
      } else if (Buffer.isBuffer(image)) {
        validation.type = 'buffer';
        validation.format = this._detectFormatFromBuffer(image);
        validation.size = image.length;
      }

      // Validate format
      if (validation.format && !allowedFormats.includes(validation.format.toLowerCase())) {
        validation.isValid = false;
        validation.errors.push(`Unsupported image format: ${validation.format}`);
      }

      // Validate size
      if (validation.size > maxSize) {
        validation.isValid = false;
        validation.errors.push(`Image size ${validation.size} exceeds maximum ${maxSize}`);
      }

      // Check if format is supported
      if (!validation.format) {
        validation.warnings.push('Could not determine image format');
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  // ============================================================================
  // PROVIDER-SPECIFIC FORMAT CONVERSION
  // ============================================================================

  /**
   * Convert image to OpenAI-compatible format
   */
  processImageForOpenAI(imageSource, options = {}) {
    const processed = this.processImage(imageSource, options);
    
    if (processed.type === 'base64') {
      return { url: processed.url };
    } else if (processed.type === 'url') {
      return { url: processed.url };
    } else {
      // Convert to base64 for OpenAI
      return { url: `data:${processed.mimeType};base64,${processed.data}` };
    }
  }

  /**
   * Convert image to Anthropic-compatible format
   */
  processImageForAnthropic(imageSource, options = {}) {
    const processed = this.processImage(imageSource, options);
    
    if (processed.type === 'base64') {
      return {
        type: 'base64',
        media_type: processed.mimeType,
        data: processed.data
      };
    } else if (processed.type === 'url') {
      return {
        type: 'url',
        url: processed.url
      };
    } else {
      // Convert to base64 for Anthropic
      return {
        type: 'base64',
        media_type: processed.mimeType,
        data: processed.data
      };
    }
  }

  /**
   * Convert image to Ollama-compatible format
   */
  processImageForOllama(imageSource, options = {}) {
    const processed = this.processImage(imageSource, options);
    
    if (processed.type === 'base64') {
      return { url: processed.url };
    } else if (processed.type === 'url') {
      return { url: processed.url };
    } else {
      // Convert to base64 for Ollama
      return { url: `data:${processed.mimeType};base64,${processed.data}` };
    }
  }

  // ============================================================================
  // PRIVATE PROCESSING METHODS
  // ============================================================================

  /**
   * Process base64 image data
   */
  _processBase64Image(dataUrl, maxSize, targetFormat) {
    const format = this._extractFormatFromDataUrl(dataUrl);
    const data = dataUrl.split(',')[1];
    const size = this._calculateBase64Size(dataUrl);

    if (size > maxSize) {
      throw new Error(`Base64 image size ${size} exceeds maximum ${maxSize}`);
    }

    return {
      type: 'base64',
      format,
      mimeType: `image/${format}`,
      data,
      size,
      url: dataUrl
    };
  }

  /**
   * Process URL image
   */
  _processUrlImage(url, maxSize, targetFormat) {
    const format = this._extractFormatFromUrl(url);
    
    return {
      type: 'url',
      format,
      mimeType: format ? `image/${format}` : null,
      url,
      size: 0 // Unknown for URLs
    };
  }

  /**
   * Process file path image
   */
  _processFilePathImage(filePath, maxSize, targetFormat) {
    try {
      const stats = fs.statSync(filePath);
      const size = stats.size;
      
      if (size > maxSize) {
        throw new Error(`File size ${size} exceeds maximum ${maxSize}`);
      }

      const format = this._extractFormatFromPath(filePath);
      const mimeType = this.getMimeType(filePath);
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString('base64');

      return {
        type: 'file',
        format,
        mimeType,
        path: filePath,
        size,
        data: base64,
        buffer
      };
    } catch (error) {
      throw new Error(`Failed to process file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Process buffer image
   */
  _processBufferImage(buffer, maxSize, targetFormat) {
    const size = buffer.length;
    
    if (size > maxSize) {
      throw new Error(`Buffer size ${size} exceeds maximum ${maxSize}`);
    }

    const format = this._detectFormatFromBuffer(buffer);
    const mimeType = format ? `image/${format}` : null;
    const base64 = buffer.toString('base64');

    return {
      type: 'buffer',
      format,
      mimeType,
      size,
      data: base64,
      buffer
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this._mimeTypeCache.get(ext) || 'image/jpeg';
  }

  /**
   * Extract format from data URL
   */
  _extractFormatFromDataUrl(dataUrl) {
    const match = dataUrl.match(/data:image\/([^;]+);/);
    return match ? match[1] : null;
  }

  /**
   * Extract format from URL
   */
  _extractFormatFromUrl(url) {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Extract format from file path
   */
  _extractFormatFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext ? ext.substring(1) : null;
  }

  /**
   * Detect format from buffer (basic detection)
   */
  _detectFormatFromBuffer(buffer) {
    if (buffer.length < 4) return null;

    // Check for common image signatures
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpeg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'png';
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'gif';
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return 'webp';
    }

    return null;
  }

  /**
   * Calculate base64 size
   */
  _calculateBase64Size(dataUrl) {
    const data = dataUrl.split(',')[1];
    return Math.ceil((data.length * 3) / 4);
  }

  /**
   * Get file size
   */
  _getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }

  /**
   * Convert image to base64
   */
  convertToBase64(imageSource, options = {}) {
    const processed = this.processImage(imageSource, options);
    
    if (processed.type === 'base64') {
      return processed.data;
    } else if (processed.type === 'file' || processed.type === 'buffer') {
      return processed.data;
    } else {
      throw new Error(`Cannot convert ${processed.type} to base64`);
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return [...this._supportedFormats];
  }

  /**
   * Check if format is supported
   */
  isFormatSupported(format) {
    return this._supportedFormats.includes(format.toLowerCase());
  }

  /**
   * Add custom MIME type mapping
   */
  addMimeTypeMapping(extension, mimeType) {
    this._mimeTypeCache.set(extension.toLowerCase(), mimeType);
  }

  /**
   * Get MIME type cache
   */
  getMimeTypeCache() {
    return new Map(this._mimeTypeCache);
  }
}

module.exports = ImageProcessingMixin;
