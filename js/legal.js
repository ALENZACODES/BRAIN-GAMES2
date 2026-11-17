// Fills the app name, operator and contact email on privacy.html and terms.html from config.js.
import { CONFIG } from './config.js';
const set = (sel, text) => document.querySelectorAll(sel).forEach((el) => { el.textContent = text; });
set('[data-app]', `${CONFIG.brandName} · ${CONFIG.sub}`);
set('[data-operator]', CONFIG.operator || 'ALENZA CODES');
document.querySelectorAll('[data-contact]').forEach((el) => {
  if (CONFIG.contact) el.replaceChildren(Object.assign(document.createElement('a'), { href: `mailto:${CONFIG.contact}`, textContent: CONFIG.contact }));
  else el.textContent = '[contact email to be added]';
});
