// Vercel serverless function — sends a transactional email (devis/contrat) via Brevo.
// Keeps the Brevo API key server-side; the browser never sees it.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Service d'email non configuré (BREVO_API_KEY manquante)" });
    return;
  }

  const { toEmail, toName, fromEmail, fromName, subject, htmlContent, attachmentBase64, attachmentName } = req.body || {};

  if (!toEmail || !subject || !htmlContent) {
    res.status(400).json({ error: 'Champs requis manquants (toEmail, subject, htmlContent)' });
    return;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'contact.quotly@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Quotly';

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail, name: toName || undefined }],
    subject,
    htmlContent
  };

  if (fromEmail) {
    payload.replyTo = { email: fromEmail, name: fromName || undefined };
  }

  if (attachmentBase64 && attachmentName) {
    payload.attachment = [{ content: attachmentBase64, name: attachmentName }];
  }

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.status(r.status).json({ error: data.message || 'Erreur Brevo', details: data });
      return;
    }
    res.status(200).json({ success: true, messageId: data.messageId });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
};
