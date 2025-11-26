# Security & Performance Test Cases

## ?? Security Tests

### Test Case 1: XSS via Direct Injection
**Component:** ContentEditable.razor  
**Severity:** CRITICAL

**Steps:**
1. Open the application
2. Click in any "Condition / features" text field
3. Type or paste: `<script>alert('XSS')</script>`
4. Click outside the field (blur event)
5. Inspect the field value

**Expected Result:** ?
- Text displays as plain text
- No alert popup appears
- Console shows sanitized text
- No `<script>` tag in DOM

**Actual Result:** ___________

---

### Test Case 2: XSS via Image Error Handler
**Component:** ContentEditable.razor  
**Severity:** CRITICAL

**Steps:**
1. Open the application
2. Click in any text field
3. Paste: `<img src=x onerror=alert('XSS')>`
4. Click outside the field

**Expected Result:** ?
- Only plain text appears
- No alert popup
- No broken image
- `onerror` handler removed

**Actual Result:** ___________

---

### Test Case 3: XSS via Formatted HTML Paste
**Component:** ContentEditable.razor  
**Severity:** CRITICAL

**Steps:**
1. Open Word/Google Docs
2. Create formatted text with bold, links, etc.
3. Copy the formatted text
4. Paste into the app's text field
5. Check what appears

**Expected Result:** ?
- Only plain text retained
- All formatting stripped
- No HTML tags in DOM
- No styles applied

**Actual Result:** ___________

---

### Test Case 4: JavaScript Protocol Injection
**Component:** ContentEditable.razor  
**Severity:** HIGH

**Steps:**
1. Paste: `<a href="javascript:alert('XSS')">Click me</a>`
2. Or paste: `<iframe src="javascript:alert('XSS')"></iframe>`

**Expected Result:** ?
- `javascript:` protocol removed
- No clickable link with malicious code
- Plain text only

**Actual Result:** ___________

---

### Test Case 5: Speaker Privacy - No Mic Permission
**Component:** Speaker.razor  
**Severity:** HIGH

**Steps:**
1. Open the application fresh (clear site data)
2. Observe page load
3. Wait for speaker to initialize
4. Check browser's permission indicator

**Expected Result:** ?
- NO microphone permission prompt appears
- Browser does NOT show mic icon in address bar
- Audio can still play output
- Console shows no permission errors

**Actual Result:** ___________

---

### Test Case 6: Microphone Error Handling
**Component:** Home.razor  
**Severity:** MEDIUM

**Steps:**
1. Block microphone permission in browser
2. Click the microphone button
3. Observe error handling

**Expected Result:** ?
- Friendly error message appears in red banner
- Message says "Please grant microphone permission in your browser"
- NO browser alert() popup
- Mic button returns to disconnected state
- Error can be dismissed with X button

**Actual Result:** ___________

---

## ? Performance Tests

### Test Case 7: Memory Leak - Extended Session
**Component:** Speaker.razor  
**Severity:** HIGH

**Setup:**
- Open Chrome DevTools ? Memory tab
- Start recording heap snapshots

**Steps:**
1. Play audio continuously for 10 minutes
2. Take heap snapshot every 2 minutes
3. Stop audio
4. Force garbage collection (DevTools)
5. Take final snapshot

**Expected Result:** ?
- Initial memory: ~8-10 MB
- After 10 min: ~8-12 MB (stable, not growing)
- No detached DOM nodes
- Blob URLs properly cleaned up
- Audio buffers released

**Measurements:**
- 0 min: _____ MB
- 2 min: _____ MB
- 4 min: _____ MB
- 6 min: _____ MB
- 8 min: _____ MB
- 10 min: _____ MB
- After GC: _____ MB

**Actual Result:** ___________

---

### Test Case 8: Audio Queue Management
**Component:** Speaker.razor  
**Severity:** MEDIUM

**Steps:**
1. Open DevTools ? Console
2. Rapidly send 100 audio chunks
3. Observe console warnings
4. Check queue behavior

**Expected Result:** ?
- Queue limited to max 50 buffers
- Console warns: "Audio queue full, dropping oldest buffer"
- No browser crash
- Audio plays smoothly without gaps
- Memory stays bounded

**Actual Result:** ___________

---

### Test Case 9: Audio Processing Latency
**Component:** Home.razor.js + Speaker.razor.js  
**Severity:** MEDIUM

**Setup:**
- Use DevTools Performance tab
- Record timeline

**Steps:**
1. Speak into microphone
2. Measure time until audio feedback
3. Take multiple measurements

**Expected Result:** ?
- Latency: 5-10ms per audio chunk
- No jank or stuttering
- Smooth audio playback
- CPU usage: 3-5%

**Measurements:**
- Sample 1: _____ ms
- Sample 2: _____ ms
- Sample 3: _____ ms
- Average: _____ ms
- CPU Usage: _____ %

**Actual Result:** ___________

---

### Test Case 10: Sample Rate Optimization
**Component:** Home.razor.js  
**Severity:** MEDIUM

**Steps:**
1. Open DevTools ? Console
2. Enable mic
3. Check AudioContext and MediaStream sample rates
4. Monitor CPU usage

**Expected Result:** ?
- Mic requests 24kHz
- AudioContext created at 24kHz
- No resampling overhead
- Lower CPU usage than before

**Verification:**
```javascript
// In console after mic connected:
console.log(micStream.getAudioTracks()[0].getSettings().sampleRate);
// Should log: 24000
```

**Actual Result:** ___________

---

## ?? Cross-Browser Tests

### Test Case 11: Chrome/Edge Compatibility
**Browser:** Chrome/Edge (Chromium)  
**Version:** _______

**Tests to Run:**
- [ ] Test Case 1 (XSS)
- [ ] Test Case 5 (Privacy)
- [ ] Test Case 6 (Errors)
- [ ] Test Case 7 (Memory)

**Notes:** ___________

---

### Test Case 12: Firefox Compatibility
**Browser:** Firefox  
**Version:** _______

**Tests to Run:**
- [ ] Test Case 1 (XSS)
- [ ] Test Case 5 (Privacy)
- [ ] Test Case 6 (Errors)
- [ ] Test Case 9 (Latency)

**Notes:** ___________

---

### Test Case 13: Safari Compatibility
**Browser:** Safari  
**Version:** _______

**Important:** Safari has stricter autoplay policies

**Tests to Run:**
- [ ] Test Case 1 (XSS)
- [ ] Test Case 5 (Privacy)
- [ ] AudioContext resumes after user interaction
- [ ] No autoplay policy errors

**Notes:** ___________

---

## ?? Edge Cases

### Test Case 14: Microphone Not Available
**Steps:**
1. Use device with no microphone
2. Click mic button

**Expected Result:** ?
- Error: "No microphone found. Please connect a microphone."

---

### Test Case 15: Microphone In Use
**Steps:**
1. Open app in one tab (use mic)
2. Open app in another tab
3. Try to use mic in second tab

**Expected Result:** ?
- Error: "Microphone is in use by another application."

---

### Test Case 16: Network Interruption
**Steps:**
1. Start conversation
2. Disable network
3. Re-enable network

**Expected Result:** ?
- Graceful error handling
- No JavaScript exceptions
- Can recover when network returns

---

### Test Case 17: Empty/Null Audio Data
**Component:** Speaker.razor  
**Steps:**
1. Send null/undefined to enqueue()
2. Send empty buffer

**Expected Result:** ?
- Console warns: "Invalid audio data received, skipping"
- No crash
- No audio glitches

---

## ? Test Summary Template

**Tester:** ___________  
**Date:** ___________  
**Build Version:** ___________

| Test # | Component | Result | Notes |
|--------|-----------|--------|-------|
| 1 | ContentEditable | ? Pass ? Fail | |
| 2 | ContentEditable | ? Pass ? Fail | |
| 3 | ContentEditable | ? Pass ? Fail | |
| 4 | ContentEditable | ? Pass ? Fail | |
| 5 | Speaker | ? Pass ? Fail | |
| 6 | Home | ? Pass ? Fail | |
| 7 | Speaker | ? Pass ? Fail | |
| 8 | Speaker | ? Pass ? Fail | |
| 9 | Home/Speaker | ? Pass ? Fail | |
| 10 | Home | ? Pass ? Fail | |
| 11 | Chrome | ? Pass ? Fail | |
| 12 | Firefox | ? Pass ? Fail | |
| 13 | Safari | ? Pass ? Fail | |

---

## ?? Critical Test Failures

If any of these tests fail, DO NOT DEPLOY:
- ? Test 1, 2, 3, 4 (XSS vulnerabilities)
- ? Test 5 (Privacy violation)
- ? Test 7 (Memory leak)

---

## ?? Issues Found?

**Report issues with:**
1. Test case number
2. Browser/version
3. Console errors
4. Screenshots
5. Steps to reproduce

**Example:**
```
Test 5 FAILED
Browser: Chrome 120
Error: Mic permission prompt appeared
Screenshot: [attach]
```

---

**Test Plan Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for execution
