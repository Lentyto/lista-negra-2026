export async function sendWebhookNotification(userEmail, action, details, fileUrl = null) {
    const webhookUrl = 'https://discord.com/api/webhooks/1479473831226900501/Ltf4VPsHk4Q1jAL9q80XgqjiTmwnUZNOAQNPIYhN2qnmw_v36eJ_4FHAU7G7lPgBhqOw';
    const timestamp = new Date().toISOString();

    const embed = {
        title: `Admin Action: ${action}`,
        color: 0xff0000, // Red
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
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('Webhook failed', err);
    }
}
