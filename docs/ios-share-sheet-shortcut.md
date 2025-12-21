# iOS Share Sheet Shortcut for Windows15 Handoff

This guide explains how to set up and use iOS Shortcuts to send content from any iOS app directly into your Windows15 Handoff queue with a single tap.

## Overview

The iOS Share Sheet integration allows you to:

- Share URLs from Safari, Chrome, or any app
- Share text from Notes, Messages, ChatGPT, or any app
- One-tap sending without copy/paste
- Automatic device sync via Dexie Cloud
- Category targeting (Work/Private/Any)

## Prerequisites

- iOS 13 or later (iOS 14+ recommended)
- Windows15 open in Safari or installed as a PWA
- Dexie Cloud sync configured (optional but recommended for cross-device sync)

## Installation

### Option 1: One-Tap Install (Recommended)

Click one of these iCloud links to install the shortcut:

1. **[Send to Windows15 Handoff](https://www.icloud.com/shortcuts/YOUR_SHORTCUT_ID)**  
   Default category: Any

2. **[Send to Windows15 Handoff (Work)](https://www.icloud.com/shortcuts/YOUR_WORK_SHORTCUT_ID)**  
   Pre-set to Work category

3. **[Send to Windows15 Handoff (Private)](https://www.icloud.com/shortcuts/YOUR_PRIVATE_SHORTCUT_ID)**  
   Pre-set to Private category

> **Note**: The iCloud links above will be updated once the shortcuts are published. For now, use Option 2 to create manually.

### Option 2: Manual Creation

1. Open the **Shortcuts** app on your iPhone/iPad
2. Tap the **+** button to create a new shortcut
3. Follow the steps below for your desired variant

#### Base Shortcut: "Send to Windows15 Handoff"

**Shortcut Configuration:**

- Name: `Send to Windows15 Handoff`
- Icon: Share icon (optional)
- Color: Blue (optional)
- **Show in Share Sheet**: ON
- **Accepted Types**: URLs and Text

**Shortcut Actions:**

1. **Receive [Shortcut Input] from Share Sheet**
    - Types: URLs and Text

2. **Set Variable**
    - Variable Name: `Content`
    - Value: `Shortcut Input`

3. **Get URLs from [Content]**

4. **If [URLs] has any value**
    - Then:
        - **Set Variable**
            - Variable Name: `Kind`
            - Value: `url`
        - **Set Variable**
            - Variable Name: `Target`
            - Value: `URLs` (first item)
        - **Get [Content] as Text**
        - **Set Variable**
            - Variable Name: `TextValue`
            - Value: `Text from Get Details of Content`
    - Otherwise:
        - **Set Variable**
            - Variable Name: `Kind`
            - Value: `text`
        - **Set Variable**
            - Variable Name: `Target`
            - Value: (empty)
        - **Get [Content] as Text**
        - **Set Variable**
            - Variable Name: `TextValue`
            - Value: `Text from Get Details of Content`
    - End If

5. **Get Current Date**

6. **Get [Current Date] as Number** (format: Unix timestamp)

7. **Generate Random Number** (between 100000 and 999999)

8. **Text**
    - Value: `Random Number``Current Date` (concatenate)
    - Set as Variable: `Nonce`

9. **URL Encode [Target]**
    - Set as Variable: `EncodedTarget`

10. **URL Encode [TextValue]**
    - Set as Variable: `EncodedText`

11. **Text** - Build the deep link URL:

    ```
    https://thomasrohde.github.io/windows15/?handoff=1&nonce=[Nonce]&kind=[Kind]&target=[EncodedTarget]&text=[EncodedText]&targetCategory=any&open=handoff&source=iOS%20Shortcut
    ```

    Replace `[Variables]` with the corresponding shortcut variables

12. **Open URL**
    - URL: `Text from step 11`
    - Show Safari Reader: OFF

**That's it!** The shortcut will now appear in the Share Sheet.

#### Work Variant

Same as above, but change `targetCategory=any` to `targetCategory=work` in step 11.
Optionally rename to "Send to Windows15 Handoff (Work)".

#### Private Variant

Same as above, but change `targetCategory=any` to `targetCategory=private` in step 11.
Optionally rename to "Send to Windows15 Handoff (Private)".

## Usage

### From Any App with Share Sheet

1. Tap the **Share** button in any app
2. Scroll down and tap **"Send to Windows15 Handoff"**
3. Windows15 will open in Safari (or your PWA)
4. The content will appear in your Handoff inbox
5. A success notification will appear

### Supported Content Types

- **URLs**: Web links, app store links, file URLs
- **Text**: Notes, messages, ChatGPT responses, copied text
- **Mixed**: URLs with accompanying text/notes

### Examples

**Safari → Handoff**

1. Browse to example.com
2. Tap Share → "Send to Windows15 Handoff"
3. URL appears in Handoff inbox

**Notes → Handoff**

1. Write a note
2. Select text → Share → "Send to Windows15 Handoff"
3. Text appears in Handoff inbox

**ChatGPT → Handoff**

1. Generate a response
2. Tap Share → "Send to Windows15 Handoff"
3. Response text appears in Handoff inbox

## How It Works

### Technical Flow

1. **iOS Shortcut** receives content from Share Sheet
2. **Normalizes** input (detects URL vs text)
3. **Generates nonce** for idempotency (prevents duplicates)
4. **Builds deep link** with encoded parameters
5. **Opens Windows15** with the deep link URL
6. **ShareReceiver component** parses and validates parameters
7. **useHandoff hook** adds item to the Handoff queue
8. **Dexie Cloud** syncs to other devices (if configured)
9. **URL cleanup** removes share parameters from browser history

### Deep Link Parameters

| Parameter        | Required | Description                                  |
| ---------------- | -------- | -------------------------------------------- |
| `handoff`        | Yes      | Must be `1` to enable receiver               |
| `nonce`          | Yes      | 6-128 char unique ID for idempotency         |
| `kind`           | Auto     | `url` or `text` (inferred if omitted)        |
| `target`         | For URLs | The URL to share (max 4096 chars)            |
| `text`           | For text | Text content or note (max 20000 chars)       |
| `targetCategory` | No       | `work`, `private`, or `any` (default: `any`) |
| `source`         | No       | Attribution text (e.g., "ChatGPT iOS")       |
| `title`          | No       | Optional title for the item                  |
| `open`           | No       | Set to `handoff` to auto-open app            |

### Idempotency

The system prevents duplicate imports:

- Each share generates a unique `nonce`
- Processed nonces are stored in localStorage
- Ring buffer keeps last 50 nonces
- Duplicate nonces are silently ignored
- Refreshing the page won't create duplicates

## Troubleshooting

### "Nothing to send" message

- Check that the URL/text is valid
- Ensure the nonce is 6-128 characters
- Try again with different content

### Windows15 doesn't open

- Make sure Safari is your default browser
- Check that the shortcut URL is correct
- Try opening Windows15 manually first

### No item appears in Handoff

- Check that the Handoff app is installed (desktop icon)
- Wait a few seconds for processing
- Check the notification for any errors

### Duplicate items appearing

- This shouldn't happen due to idempotency
- Try clearing Safari's cache
- Check that the shortcut generates unique nonces

### Content is cut off

- URLs longer than 4096 chars will be rejected
- Text longer than 20000 chars will be rejected
- Consider splitting large content into multiple shares

### iOS PWA mode issues

- Open with Safari instead of the installed PWA
- Safari handles deep links more reliably
- The PWA may not register the share intent correctly

## Limitations

### Phase 1 Limitations

- **No encryption from Shortcut**: Use Windows15's built-in "Sensitive Mode" instead
- **No file/image support**: URLs and text only
- **URL length limits**: Very long content may fail (iOS/browser URL limits)
- **No offline queuing**: Requires active internet connection

### Security Notes

- Share parameters appear in URL (visible in browser history)
- Recommend sharing non-sensitive content only
- For sensitive data: use "Sensitive Mode" in Windows15 app
- Dexie Cloud sync uses your configured security settings

## Future Enhancements (Planned)

- Encryption support initiated from Shortcut
- File and image upload support
- Offline queue with background sync
- Batch sharing (multiple items at once)
- Siri integration ("Hey Siri, send this to Windows15")

## Support

For issues or questions:

- **Documentation**: [Windows15 README](../README.md)
- **PRD**: [HANDOFF.md](../HANDOFF.md)
- **GitHub Issues**: [windows15/issues](https://github.com/thomasrohde/windows15/issues)

## Privacy

- Content is sent directly to your Windows15 instance
- No intermediate servers or third-party services
- Data stored in your Dexie Cloud database only
- You control where your data lives

---

**Tip**: Install all three variants (Any/Work/Private) to quickly categorize content with one tap!
