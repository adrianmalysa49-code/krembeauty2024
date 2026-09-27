export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const name = (body.name || '').toString().trim().slice(0, 120);
  const contact = (body.contact || '').toString().trim().slice(0, 160);
  const message = (body.message || '').toString().trim().slice(0, 2000);

  if (!name || !contact || !message) {
    return res.status(400).json({ error: 'Brak wymaganych pól' });
  }

  // Konfiguracja e-mail (zmienne środowiskowe w Vercel):
  //   RESEND_API_KEY  – klucz z resend.com (darmowy plan wystarczy)
  //   CONTACT_TO      – adres odbiorcy (domyślnie krembeauty2024@gmail.com)
  //   CONTACT_FROM    – nadawca zweryfikowany w Resend (np. "Krem Beauty <kontakt@twojadomena.pl>")
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO || 'krembeauty2024@gmail.com';
  const from = process.env.CONTACT_FROM || 'Krem Beauty <onboarding@resend.dev>';

  if (!apiKey) {
    return res.status(501).json({ error: 'E-mail nie został jeszcze skonfigurowany (brak RESEND_API_KEY).' });
  }

  const payload = {
    from,
    to: [to],
    subject: `Nowa wiadomość z formularza — ${name}`,
    text: `Imię: ${name}\nKontakt: ${contact}\n\nWiadomość:\n${message}`
  };
  if (contact.includes('@')) payload.reply_to = contact;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('Resend error:', err);
      return res.status(502).json({ error: 'Nie udało się wysłać wiadomości' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('contact handler error:', e);
    return res.status(500).json({ error: 'Błąd serwera' });
  }
}
