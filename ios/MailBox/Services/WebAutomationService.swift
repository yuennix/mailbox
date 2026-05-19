import Foundation
import WebKit

@Observable
final class WebAutomationService {
    private var webView: WKWebView?
    
    func injectAntiCaptchaScript() -> String {
        """
        (function() {
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
            
            // Aggressively hide/remove CAPTCHA and verification overlays
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
            
            // Remove all iframes that might contain recaptcha
            document.querySelectorAll('iframe').forEach(function(iframe) {
                var src = iframe.src || '';
                if (src.includes('recaptcha') || src.includes('google.com/recaptcha') || src.includes('captcha') || src.includes('challenge')) {
                    removeElement(iframe);
                }
            });
            
            // Auto-click simple "I'm not a robot" or verification checkboxes
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
            
            // Auto-submit hidden verification forms on Yopmail
            var forms = document.querySelectorAll('form');
            forms.forEach(function(form) {
                var html = form.innerHTML.toLowerCase();
                if (html.includes('captcha') || html.includes('verify') || html.includes('robot') || html.includes('challenge')) {
                    var hiddenInputs = form.querySelectorAll('input[type="hidden"]');
                    if (hiddenInputs.length > 0) {
                        // Try to submit forms that only have hidden inputs (no real challenge)
                        form.submit();
                    }
                }
            });
            
            // Remove fixed-position overlays that block interaction
            document.querySelectorAll('*').forEach(function(el) {
                var style = window.getComputedStyle(el);
                if (style.position === 'fixed' && parseInt(style.zIndex) > 1000) {
                    var text = (el.textContent || '').toLowerCase();
                    if (text.includes('captcha') || text.includes('verify') || text.includes('robot') || text.includes('challenge') || text.includes('security') || text.includes('prove')) {
                        removeElement(el);
                    }
                }
            });
            
            // Unlock body scroll if it was disabled
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
            
            // Remove ad banners
            document.querySelectorAll('[id*="ad"], [class*="ad"]').forEach(function(el) {
                if (el.id && el.id.includes('ad')) removeElement(el);
            });
            
            return "Anti-captcha: removed " + removedCount + " elements";
        })();
        """
    }
    
    func generateUsernameScript() -> String {
        """
        (function() {
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
        })();
        """
    }
    
    func submitLoginScript() -> String {
        """
        (function() {
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
        })();
        """
    }
    
    func checkForCaptchaScript() -> String {
        """
        (function() {
            var html = document.body ? document.body.innerHTML.toLowerCase() : '';
            var indicators = ['captcha', 'recaptcha', 'g-recaptcha', 'robot', 'verify', 'challenge', 'antibot', 'security check', 'prove you', 'human verification', 'i\'m not a robot'];
            var hasCaptcha = indicators.some(function(term) {
                return html.includes(term);
            });
            
            // Also check for visible overlay elements
            var overlays = document.querySelectorAll('[style*="position: fixed"], .modal, .overlay, [role="dialog"]');
            var hasOverlay = overlays.length > 0 && Array.from(overlays).some(function(el) {
                var text = (el.textContent || '').toLowerCase();
                return indicators.some(function(t) { return text.includes(t); });
            });
            
            // Check for reCAPTCHA iframe
            var recaptchaIframe = document.querySelector('iframe[src*="recaptcha"]') !== null;
            
            return (hasCaptcha || hasOverlay || recaptchaIframe) ? "CAPTCHA_DETECTED" : "NO_CAPTCHA";
        })();
        """
    }
    
    func bypassYopmailVerificationScript() -> String {
        """
        (function() {
            // Yopmail specific: when opening an email, there may be a verification redirect
            // Try to extract the actual email URL and navigate directly
            var links = document.querySelectorAll('a[href*="mail.php"], a[href*="read.php"], a[href*="inbox.php"]');
            links.forEach(function(link) {
                var href = link.getAttribute('href') || '';
                // Remove any verification parameters
                if (href.includes('verify') || href.includes('captcha') || href.includes('challenge')) {
                    var cleanHref = href.replace(/[?&](verify|captcha|challenge|token)=[^&]*/g, '');
                    link.setAttribute('href', cleanHref);
                }
            });
            
            // If we're on a verification page, try to redirect to inbox
            if (window.location.href.includes('verify') || window.location.href.includes('captcha')) {
                var loginMatch = window.location.href.match(/[?&]login=([^&]+)/);
                if (loginMatch && loginMatch[1]) {
                    window.location.href = '/en/inbox.php?login=' + loginMatch[1];
                    return "REDIRECTED_TO_INBOX";
                }
            }
            
            // Remove click-interceptors on email rows
            document.querySelectorAll('.m, .mail_row, tr[class*="mail"]').forEach(function(row) {
                row.style.pointerEvents = 'auto';
                var clone = row.cloneNode(true);
                row.parentNode.replaceChild(clone, row);
            });
            
            return "YOPMAIL_BYPASS_APPLIED";
        })();
        """
    }
    
    func extractEmailsScript() -> String {
        """
        (function() {
            var emails = [];
            var rows = document.querySelectorAll('.m, .mail_row, tr[class*="mail"]');
            rows.forEach(function(row, index) {
                var sender = row.querySelector('.lmf, .from, .sender')?.textContent?.trim() || '';
                var subject = row.querySelector('.lms, .subject')?.textContent?.trim() || '';
                var time = row.querySelector('.lmh, .time, .date')?.textContent?.trim() || '';
                var preview = row.querySelector('.lmexcerpt, .preview, .snippet')?.textContent?.trim() || '';
                emails.push({id: index, sender: sender, subject: subject, time: time, preview: preview});
            });
            return JSON.stringify(emails);
        })();
        """
    }
    
    func clickRefreshScript() -> String {
        """
        (function() {
            var refreshBtn = document.querySelector('#refresh, .refresh, [onclick*="refresh"], input[value*="refresh" i]');
            if (refreshBtn) {
                refreshBtn.click();
                return "Refresh clicked";
            }
            // Try to find any reload button
            var buttons = document.querySelectorAll('button, input[type="button"]');
            for (var i = 0; i < buttons.length; i++) {
                var text = buttons[i].textContent || buttons[i].value || '';
                if (text.toLowerCase().includes('refresh') || text.toLowerCase().includes('reload')) {
                    buttons[i].click();
                    return "Refresh found and clicked";
                }
            }
            return "No refresh button found";
        })();
        """
    }
}
