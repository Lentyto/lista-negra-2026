// Admin logs webhook — all admin actions (login, logout, edits, deletions, acknowledgements)
const ADMIN_WEBHOOK = 'https://discord.com/api/webhooks/1474419573867413546/nUSP3jy2NYvV4osj0V7pF48JVBXd4G0Cfz0_dXQ1CSj-23ZwWD2hYbXKbrb8dMneeOpk';

// Tips webhook — all incoming anonymous tip submissions from the public site
const TIPS_WEBHOOK = 'https://discord.com/api/webhooks/1479502471691767859/i1fbqsLI1CtnZ7ktLoIkdSWjVSGP5XVBMzmPePXiI4BpTkHUBilVKEb5dQ6YjD20BN3L';

/**
 * Send admin action log to the admin webhook.
 */
export async function sendWebhookNotification(userEmail, action, details, fileUrl = null) {
    const timestamp = new Date().toISOString();

    const embed = {
        title: `Admin Action: ${action}`,
        color: 0xff0000,
        timestamp: timestamp,
        fields: [
            { name: 'Admin (Who)', value: userEmail || 'Unknown', inline: true },
            { name: 'Action (What)', value: action, inline: true },
            { name: 'Details', value: details || 'No details' }
        ]
    };

    if (fileUrl) {
        if (fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            embed.image = { url: fileUrl };
        }
    }

    const payload = {
        content: "⚠️ **LISTA NEGRA ADMIN ALERT** ⚠️",
        embeds: [embed]
    };

    if (fileUrl && !embed.image) {
        payload.content += `\n**Attached Media:** ${fileUrl}`;
    }

    try {
        await fetch(ADMIN_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Admin webhook failed', err);
    }
}

/**
 * Send an anonymous tip to the tips webhook.
 */
export async function sendTipToWebhook(message, imageUrl = null) {
    const timestamp = new Date().toISOString();

    const embed = {
        title: '📨 New Anonymous Tip',
        color: 0xffa500, // Orange
        timestamp: timestamp,
        fields: [
            { name: 'Message', value: message || '_No message — image only_' }
        ]
    };

    if (imageUrl) {
        if (imageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
            embed.image = { url: imageUrl };
        } else {
            embed.fields.push({ name: 'Attached Media', value: imageUrl });
        }
    }

    const payload = {
        content: "📨 **INCOMING TIP — LISTA NEGRA** 📨",
        embeds: [embed]
    };

    try {
        await fetch(TIPS_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Tips webhook failed', err);
    }
}
