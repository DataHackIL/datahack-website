function doPost(e) {
  const respond = (ok) => ContentService.createTextOutput(JSON.stringify({ ok }))
    .setMimeType(ContentService.MimeType.JSON);
  let lock;
  try {
    if (!e || !e.postData || e.postData.length > 24000) return respond(false);
    const input = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('CONTACT_TOKEN');
    if (!secret || !tokensMatch_(secret, input.token)) return respond(false);
    const { name, email, message } = input;
    if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof email !== 'string' || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof message !== 'string' || !message.trim() || message.length > 4000) return respond(false);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1500)) return respond(false);
    const day = new Date().toISOString().slice(0, 10);
    const counter = JSON.parse(props.getProperty('DAILY_LIMIT') || '{}');
    const sent = counter.day === day ? counter.count : 0;
    if (sent >= 35) return respond(false);
    props.setProperty('DAILY_LIMIT', JSON.stringify({ day, count: sent + 1 }));
    MailApp.sendEmail({
      to: 'contact@datahack.org.il',
      subject: 'DataHack website inquiry',
      body: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message,
      replyTo: email,
    });
    return respond(true);
  } catch (_) {
    return respond(false);
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function tokensMatch_(expected, received) {
  if (typeof received !== 'string' || expected.length !== received.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return difference === 0;
}
