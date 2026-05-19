export const ANTI_CAPTCHA_SCRIPT = `(function() {
    var removedCount = 0;
    
    function removeElement(el) {
        if (!el) return;
        el.style.display = 'none !important';
        el.style.visibility = 'hidden !important';
        el.style.opacity = '0 !important';
        el.style.pointerEvents = 'none !important';
        el.style.position = 'absolute !important';
        el.style.zIndex = '-9999 !important';
        if (el.parentNode && el.parentNode !== document.body) {
            try { el.parentNode.removeChild(el); removedCount++; } catch(e) {}
        }
    }
    
    var captchaSelectors = [
        '[id*="captcha"]', '[class*="captcha"]',
        '[id*="recaptcha"]', '[class*="recaptcha"]', '.g-recaptcha',
        '[id*="verify"]', '[class*="verify"]',
        '[id*="robot"]', '[class*="robot"]',
        '[id*="challenge"]', '[class*="challenge"]',
        '[id*="antibot"]', '[class*="antibot"]',
        '[id*="security"]', '[class*="security"]',
        '.modal-backdrop', '.popup-overlay', '.verify-overlay',
        'div[role="dialog"]', '.overlay', '.blockUI', '.blockOverlay',
        '#rc-imageselect', '.rc-anchor', '.rc-anchor-center',
        '[style*="position: fixed"][style*="z-index"]'
    ];
    
    captchaSelectors.forEach(function(selector) {
        try {
            document.querySelectorAll(selector).forEach(removeElement);
        } catch(e) {}
    });
    
    document.querySelectorAll('iframe').forEach(function(iframe) {
        var src = iframe.src || '';
        if (src.includes('recaptcha') || src.includes('google.com/recaptcha') || src.includes('captcha') || src.includes('challenge')) {
            removeElement(iframe);
        }
    });
    
    var checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function(cb) {
        var label = '';
        try {
            var parent = cb.closest('label, div, form');
            if (parent) label = parent.textContent.toLowerCase();
        } catch(e) {}
        
        if (label.includes('robot') || label.includes('human') || label.includes('verify') || label.includes('not a bot')) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            cb.dispatchEvent(new Event('click', { bubbles: true }));
        }
    });
    
    var forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
        var html = form.innerHTML.toLowerCase();
        if (html.includes('captcha') || html.includes('verify') || html.includes('robot') || html.includes('challenge')) {
            var hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            if (hiddenInputs.length > 0) {
                form.submit();
            }
        }
    });
    
    document.querySelectorAll('*').forEach(function(el) {
        var style = window.getComputedStyle(el);
        if (style.position === 'fixed' && parseInt(style.zIndex) > 1000) {
            var text = (el.textContent || '').toLowerCase();
            if (text.includes('captcha') || text.includes('verify') || text.includes('robot') || text.includes('challenge') || text.includes('security') || text.includes('prove')) {
                removeElement(el);
            }
        }
    });
    
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    document.querySelectorAll('[id*="ad"], [class*="ad"]').forEach(function(el) {
        if (el.id && el.id.includes('ad')) removeElement(el);
    });
    
    return "Anti-captcha: removed " + removedCount + " elements";
})();`;

export const GENERATE_USERNAME_SCRIPT = `(function() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for (var i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    var loginField = document.querySelector('input[name="login"], input[name="yp"]');
    if (loginField) {
        loginField.value = result;
        loginField.dispatchEvent(new Event('input', { bubbles: true }));
        loginField.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return result;
})();`;

export const SUBMIT_LOGIN_SCRIPT = `(function() {
    var form = document.querySelector('form');
    if (form) {
        form.submit();
        return "Form submitted";
    }
    var btn = document.querySelector('input[type="submit"], button[type="submit"]');
    if (btn) {
        btn.click();
        return "Button clicked";
    }
    return "No form or button found";
})();`;

export const BYPASS_YOPMAIL_SCRIPT = `(function() {
    var links = document.querySelectorAll('a[href*="mail.php"], a[href*="read.php"], a[href*="inbox.php"]');
    links.forEach(function(link) {
        var href = link.getAttribute('href') || '';
        if (href.includes('verify') || href.includes('captcha') || href.includes('challenge')) {
            var cleanHref = href.replace(/[?&](verify|captcha|challenge|token)=[^&]*/g, '');
            link.setAttribute('href', cleanHref);
        }
    });
    
    if (window.location.href.includes('verify') || window.location.href.includes('captcha')) {
        var loginMatch = window.location.href.match(/[?&]login=([^&]+)/);
        if (loginMatch && loginMatch[1]) {
            window.location.href = '/en/inbox.php?login=' + loginMatch[1];
            return "REDIRECTED_TO_INBOX";
        }
    }
    
    document.querySelectorAll('.m, .mail_row, tr[class*="mail"]').forEach(function(row) {
        row.style.pointerEvents = 'auto';
        var clone = row.cloneNode(true);
        row.parentNode.replaceChild(clone, row);
    });
    
    return "YOPMAIL_BYPASS_APPLIED";
})();`;

export const EXTRACT_EMAILS_SCRIPT = `(function() {
    var emails = [];
    var rows = document.querySelectorAll('.m, .mail_row, tr[class*="mail"]');
    rows.forEach(function(row, index) {
        var sender = '';
        var subject = '';
        var time = '';
        var preview = '';
        var senderEl = row.querySelector('.lmf, .from, .sender');
        if (senderEl) sender = senderEl.textContent.trim();
        var subjectEl = row.querySelector('.lms, .subject');
        if (subjectEl) subject = subjectEl.textContent.trim();
        var timeEl = row.querySelector('.lmh, .time, .date');
        if (timeEl) time = timeEl.textContent.trim();
        var previewEl = row.querySelector('.lmexcerpt, .preview, .snippet');
        if (previewEl) preview = previewEl.textContent.trim();
        emails.push({id: index, sender: sender, subject: subject, time: time, preview: preview});
    });
    return JSON.stringify(emails);
})();`;

export const CLICK_REFRESH_SCRIPT = `(function() {
    var refreshBtn = document.querySelector('#refresh, .refresh, [onclick*="refresh"], input[value*="refresh" i]');
    if (refreshBtn) {
        refreshBtn.click();
        return "Refresh clicked";
    }
    var buttons = document.querySelectorAll('button, input[type="button"]');
    for (var i = 0; i < buttons.length; i++) {
        var text = buttons[i].textContent || buttons[i].value || '';
        if (text.toLowerCase().includes('refresh') || text.toLowerCase().includes('reload')) {
            buttons[i].click();
            return "Refresh found and clicked";
        }
    }
    return "No refresh button found";
})();`;

export const DOMAINS = [
  "yopmail.com",
  "yopmail.fr",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
];

export interface ScriptItem {
  name: string;
  description: string;
  code: string;
}

export const AUTOMATION_SCRIPTS: ScriptItem[] = [
  {
    name: "Anti-Captcha Injection",
    description: "Hides captcha overlays and removes ad banners from the page",
    code: ANTI_CAPTCHA_SCRIPT,
  },
  {
    name: "Auto-Fill Username",
    description: "Generates a random username and fills the login field automatically",
    code: GENERATE_USERNAME_SCRIPT,
  },
  {
    name: "Form Submission",
    description: "Attempts to find and submit the login form programmatically",
    code: SUBMIT_LOGIN_SCRIPT,
  },
  {
    name: "Email Extraction",
    description: "Parses the inbox page to extract email metadata",
    code: EXTRACT_EMAILS_SCRIPT,
  },
  {
    name: "Refresh Inbox",
    description: "Clicks the refresh button to reload the inbox contents",
    code: CLICK_REFRESH_SCRIPT,
  },
  {
    name: "Yopmail Bypass",
    description: "Bypasses Yopmail verification redirects and cleans email links",
    code: BYPASS_YOPMAIL_SCRIPT,
  },
];
