#!/bin/bash

# MCP Chrome Extension Installation Helper
# This script helps verify and guide installation of the Chrome MCP extension

set -e

EXTENSION_DIR="$HOME/chrome-mcp-extension"
EXTENSION_ID="hbdgbgagpkpjffpklnamcljpakneikee"

echo "=== MCP Chrome Extension Installation Helper ==="
echo ""

# Check if extension directory exists
if [ ! -d "$EXTENSION_DIR" ]; then
    echo "❌ Extension directory not found: $EXTENSION_DIR"
    echo "   The extension files should have been downloaded to this location."
    exit 1
fi

echo "✅ Extension directory found: $EXTENSION_DIR"
echo ""

# Check if extension is installed in Chrome
CHROME_EXTENSION_PATH="$HOME/Library/Application Support/Google/Chrome/Default/Extensions/$EXTENSION_ID"

if [ -d "$CHROME_EXTENSION_PATH" ]; then
    echo "✅ Extension is installed in Chrome!"
    echo "   Path: $CHROME_EXTENSION_PATH"

    # Check if it's enabled
    PREFS_FILE="$HOME/Library/Application Support/Google/Chrome/Default/Preferences"
    if [ -f "$PREFS_FILE" ]; then
        if grep -q "\"$EXTENSION_ID\"" "$PREFS_FILE" 2>/dev/null; then
            echo "✅ Extension is configured in Chrome"
        fi
    fi
else
    echo "❌ Extension NOT installed in Chrome"
    echo ""
    echo "To install the extension:"
    echo "1. Open Chrome and go to: chrome://extensions/"
    echo "2. Enable 'Developer mode' (toggle in top-right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select this directory: $EXTENSION_DIR"
    echo "5. Verify the extension ID is: $EXTENSION_ID"
    echo ""
    echo "Opening Chrome extensions page..."
    open "chrome://extensions/" 2>/dev/null || echo "   (You may need to open Chrome manually)"
    exit 1
fi

echo ""
echo "=== Native Messaging Host Status ==="

# Check if native messaging host is registered
NM_CONFIG="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.chromemcp.nativehost.json"

if [ -f "$NM_CONFIG" ]; then
    echo "✅ Native messaging host is registered"

    # Check if it points to the right extension ID
    if grep -q "$EXTENSION_ID" "$NM_CONFIG"; then
        echo "✅ Native messaging host configured for correct extension ID"
    else
        echo "⚠️  Warning: Extension ID mismatch in native messaging config"
    fi
else
    echo "❌ Native messaging host NOT registered"
    echo "   Run: mcp-chrome-bridge register"
fi

echo ""
echo "=== MCP Bridge Server Status ==="

# Check if mcp-chrome-bridge is running
if pgrep -f "mcp-chrome-bridge" > /dev/null; then
    echo "✅ MCP Chrome bridge server is running"

    # Check if port 12306 is listening
    if lsof -i :12306 > /dev/null 2>&1; then
        echo "✅ Server is listening on port 12306"

        # Test HTTP connection
        if curl -s http://127.0.0.1:12306/ > /dev/null 2>&1; then
            echo "✅ Server is responding to HTTP requests"
        fi
    fi
else
    echo "❌ MCP Chrome bridge server is NOT running"
    echo "   Start it with: mcp-chrome-bridge"
fi

echo ""
echo "=== Claude Desktop Configuration ==="

CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

if [ -f "$CLAUDE_CONFIG" ]; then
    echo "✅ Claude Desktop config exists"

    if grep -q "streamable-mcp-server" "$CLAUDE_CONFIG"; then
        echo "✅ MCP server configured in Claude Desktop"

        if grep -q "http://127.0.0.1:12306/mcp" "$CLAUDE_CONFIG"; then
            echo "✅ Correct MCP server URL configured"
        fi
    else
        echo "❌ MCP server NOT configured in Claude Desktop"
    fi
else
    echo "❌ Claude Desktop config not found"
fi

echo ""
echo "=== Next Steps ==="
echo ""

if [ -d "$CHROME_EXTENSION_PATH" ]; then
    echo "Extension is installed! To use MCP Chrome tools:"
    echo "1. Ensure Claude Desktop is completely closed"
    echo "2. Restart Claude Desktop"
    echo "3. MCP Chrome tools should be available in new sessions"
    echo "4. Test with: mcp__chrome_get_current_tab or mcp__chrome_screenshot"
else
    echo "Install the Chrome extension first (see instructions above)"
fi

echo ""
