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

    let sanitizeTimeout;
    elem.addEventListener('input', () => {
        clearTimeout(sanitizeTimeout);
        sanitizeTimeout = setTimeout(() => {
            const sanitized = sanitizeText(elem.textContent);
            // Update value
        }, 150); // Wait for user to stop typing
    });
}

// Module-level constants
const REGEX_PATTERNS = {
    script: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    style: /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    tags: /<[^>]+>/g,
    dangerous: /(javascript:|data:|vbscript:|on\w+\s*=)/gi
};

const parser = new DOMParser();
const sanitizeCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * Optimized sanitization with caching and early exits
 */
function sanitizeText(text) {
    if (!text) return '';
    
    text = String(text);
    
    // Check cache
    if (sanitizeCache.has(text)) {
        return sanitizeCache.get(text);
    }
    
    // Fast path for safe input
    if (!/[<>&"']/.test(text)) {
        const result = text.trim();
        cacheResult(text, result);
        return result;
    }
    
    // Full sanitization
    const doc = parser.parseFromString(text, 'text/html');
    let sanitized = doc.body.textContent || '';
    
    // Remove script/style tags first (most dangerous)
    sanitized = sanitized
        .replace(REGEX_PATTERNS.script, '')
        .replace(REGEX_PATTERNS.style, '')
        .replace(REGEX_PATTERNS.tags, '');
    
    // Remove dangerous patterns (combined)
    sanitized = sanitized.replace(REGEX_PATTERNS.dangerous, '');
    
    const result = sanitized.trim();
    cacheResult(text, result);
    return result;
}

function cacheResult(key, value) {
    if (sanitizeCache.size >= MAX_CACHE_SIZE) {
        const firstKey = sanitizeCache.keys().next().value;
        sanitizeCache.delete(firstKey);
    }
    sanitizeCache.set(key, value);
}
