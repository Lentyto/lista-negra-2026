// Permission constants and helper
export const PERMISSIONS = ['image', 'video', 'edit', 'pin', 'lockdown']

export const PERMISSION_LABELS = {
    god: 'GOD',
    image: 'Image',
    video: 'Video',
    edit: 'Edit',
    pin: 'PIN',
    lockdown: 'Lockdown',
}

export const PERMISSION_DESCRIPTIONS = {
    image: 'Upload/delete photos',
    video: 'Upload/delete videos',
    edit: 'Add/edit/delete profiles & announcements',
    pin: 'Change PIN codes',
    lockdown: 'Toggle lockdown mode',
}

/**
 * Check if an admin row has a specific permission.
 * God role bypasses all checks.
 */
export function hasPermission(adminRow, permission) {
    if (!adminRow?.permissions) return false
    if (adminRow.permissions.god === true) return true
    return adminRow.permissions[permission] === true
}

export function isGod(adminRow) {
    return adminRow?.permissions?.god === true
}
