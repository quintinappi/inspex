# 🚨 SECURITY INCIDENT - EXPOSED FIREBASE API KEY

## ⚠️ IMMEDIATE ACTION REQUIRED

A Firebase API key was accidentally exposed in the Git repository and has been pushed to GitHub.

### Exposed Key Details
- **API Key**: `AIzaSyCv3YaxHhB-aZnNg5gr-kXtkvz7j6GNyXo`
- **Project**: inspex001
- **Location**: `client/src/firebase.js` (now fixed)
- **GitHub Repo**: https://github.com/quintinappi/inspex

---

## ✅ What I've Already Done

1. ✅ Removed hardcoded API key from code
2. ✅ Moved all Firebase config to environment variables
3. ✅ Updated `.gitignore` to prevent future exposure
4. ✅ Created `client/.env` (local only, not in Git)
5. ✅ Created `client/.env.example` (template)

---

## 🔴 CRITICAL: You Must Do This NOW

### Step 1: Revoke the Compromised API Key

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/apis/credentials?project=inspex001
   - Or: https://console.firebase.google.com/project/inspex001/settings/general/

2. **Delete the exposed API key**:
   - Find: `AIzaSyCv3YaxHhB-aZnNg5gr-kXtkvz7j6GNyXo`
   - Click **Delete** or **Regenerate**

3. **Create a new API key**:
   - Click "Create Credentials" → "API Key"
   - **Important**: Add restrictions:
     - HTTP referrers: `localhost:3000`, `localhost:9876`, `yourdomain.com`
     - API restrictions: Only Firebase services you use

4. **Update your local `.env` file** with the new key:
   ```bash
   # In /Volumes/Q/Coding/inspex/client/.env
   REACT_APP_FIREBASE_API_KEY=YOUR_NEW_API_KEY_HERE
   ```

---

### Step 2: Clean Git History (Remove Exposed Key)

The key is still in Git history. You have two options:

#### Option A: Force Push (Destructive - Rewrites History)

⚠️ **WARNING**: This will rewrite Git history. Coordinate with team if others have cloned the repo.

```bash
# 1. Create a backup branch first
git branch backup-before-history-rewrite

# 2. Use BFG Repo-Cleaner to remove the key from history
# Install BFG: brew install bfg (on macOS)
bfg --replace-text <(echo "AIzaSyCv3YaxHhB-aZnNg5gr-kXtkvz7j6GNyXo==>REDACTED") .git

# 3. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Force push to GitHub (⚠️ DESTRUCTIVE)
git push origin --force --all
git push origin --force --tags
```

#### Option B: Keep History, Revoke Key (Recommended)

If others have cloned the repo or you don't want to rewrite history:

```bash
# Just revoke the old key and use the new one
# The old key will remain in history but be unusable
```

**Then notify GitHub**:
- Report at: https://github.com/quintinappi/inspex/security/advisories
- GitHub will help scan for the exposed key

---

### Step 3: Verify Security

After revoking the old key:

```bash
# Test that the old key no longer works
curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCv3YaxHhB-aZnNg5gr-kXtkvz7j6GNyXo" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"test123","returnSecureToken":true}'

# Should return: "API key not valid" or 400 error
```

---

## 📋 Prevention Checklist

- [x] Remove hardcoded secrets from code
- [x] Use environment variables
- [x] Update .gitignore
- [ ] Revoke compromised API key
- [ ] Create new restricted API key
- [ ] Update local .env with new key
- [ ] Clean Git history (optional but recommended)
- [ ] Enable API key restrictions in Google Cloud
- [ ] Set up Firebase App Check (optional, extra security)
- [ ] Enable billing alerts in Google Cloud

---

## 🔒 Future Prevention

1. **Pre-commit hook** to scan for secrets:
   ```bash
   npm install --save-dev @commitlint/cli husky
   # Add git-secrets or similar tool
   ```

2. **Use Firebase App Check** for additional security

3. **Never commit**:
   - API keys
   - Passwords
   - Private keys
   - OAuth tokens
   - Database credentials

4. **Always use**:
   - Environment variables
   - `.env` files (in `.gitignore`)
   - Secret management tools (Firebase Config, AWS Secrets Manager, etc.)

---

## 📞 Support

- Firebase Support: https://firebase.google.com/support
- GitHub Security: https://github.com/quintinappi/inspex/security

---

**Status**: 🔴 CRITICAL - Action Required
**Fixed in Code**: ✅ Yes
**Key Revoked**: ❌ You need to do this
**Git History Clean**: ❌ Optional (but recommended)

---

**Last Updated**: $(date)
