export async function uploadToCloudinary(file) {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary not configured. Check .env variables.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    // 'auto' resource_type handles both images and videos
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || 'Cloudinary upload failed');
    }

    return data.secure_url;
}

/**
 * Upload and return both URL and public_id (needed for deletion).
 */
export async function uploadToCloudinaryFull(file) {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary not configured. Check .env variables.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || 'Cloudinary upload failed');
    }

    return { url: data.secure_url, publicId: data.public_id, resourceType: data.resource_type };
}

/**
 * Delete an asset from Cloudinary using API key + secret.
 * Note: This requires VITE_CLOUDINARY_API_KEY and VITE_CLOUDINARY_API_SECRET in .env.
 */
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        console.warn('Cloudinary delete credentials not configured, skipping remote delete.');
        return false;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;

    // Generate SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp);
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        return result.result === 'ok';
    } catch (err) {
        console.error('Cloudinary delete failed:', err);
        return false;
    }
}
