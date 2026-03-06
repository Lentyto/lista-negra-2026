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
