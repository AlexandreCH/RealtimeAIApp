export async function start(elem) {
    // Validate element
    if (!elem) {
        console.error('ContentEditable: Invalid element provided');
        return;
    }

    // Set initial value safely with sanitization
    const initialValue = elem.getAttribute('value') || '';
    elem.textContent = sanitizeText(initialValue);

    elem.addEventListener('blur', () => {
        // Sanitize before sending to Blazor
        const sanitized = sanitizeText(elem.textContent);
        elem.value = sanitized;
        elem.dispatchEvent(new Event('change', { 'bubbles': true }));
    });

    // Intercept paste events to prevent HTML injection
    elem.addEventListener('paste', (e) => {
        e.preventDefault();
        // Get plain text only from clipboard
        const text = e.clipboardData.getData('text/plain');
        const sanitized = sanitizeText(text);
        
        // Insert sanitized text at cursor position
        document.execCommand('insertText', false, sanitized);
    });

    // Watch for external attribute changes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'value') {
                const newValue = elem.getAttribute('value') || '';
                elem.textContent = sanitizeText(newValue);
            }
        });
    });
    
    observer.observe(elem, { attributes: true });
}

/**
 * Sanitizes text by removing all HTML tags and dangerous characters
 * @param {string} text - The text to sanitize
 * @returns {string} - Sanitized plain text
 */
function sanitizeText(text) {
    if (!text) {
        return '';
    }

    // Convert to string if not already
    text = String(text);

    // Create a temporary element to decode HTML entities safely
    const temp = document.createElement('div');
    temp.textContent = text;
    let sanitized = temp.innerHTML;

    // Decode common HTML entities
    sanitized = sanitized
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");

    // Remove all HTML tags including script tags
    sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, '');

    // Remove potentially dangerous characters and protocols
    sanitized = sanitized
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '');

    // Trim whitespace
    return sanitized.trim();
}
