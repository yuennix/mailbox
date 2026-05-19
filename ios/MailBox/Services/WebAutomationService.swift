import Foundation
import WebKit

@Observable
final class WebAutomationService {
    private var webView: WKWebView?
    
    func injectAntiCaptchaScript() -> String {
        """
        (function() {
            // Hide captcha overlays
            var overlays = document.querySelectorAll('[id*="captcha"], [class*="captcha"], [id*="recaptcha"], [class*="recaptcha"], [id*="verify"], [class*="verify"]');
            overlays.forEach(function(el) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
            });
            
            // Auto-fill login if field exists
            var loginField = document.querySelector('input[name="login"], input[name="yp"]');
            if (loginField) {
                loginField.focus();
            }
            
            // Remove ad banners
            var ads = document.querySelectorAll('[id*="ad"], [class*="ad"], iframe');
            ads.forEach(function(el) {
                if (el.src && (el.src.includes('ad') || el.src.includes('google'))) {
                    el.style.display = 'none';
                }
            });
            
            return "Scripts injected successfully";
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
            var indicators = ['captcha', 'CAPTCHA', 'recaptcha', 'g-recaptcha', 'robot', 'verify'];
            var hasCaptcha = indicators.some(function(term) {
                return document.body.innerHTML.toLowerCase().includes(term.toLowerCase());
            });
            return hasCaptcha ? "CAPTCHA_DETECTED" : "NO_CAPTCHA";
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
