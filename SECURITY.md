# Security Policy

## Scope

This is an **internal PubNub tool** and is **NOT intended for public use or deployment**. This security policy applies to the PubNub Internal Admin Framework and any applications built using this template.

---

## Deployment Restrictions

### PROHIBITED Deployments

The following deployment targets are **strictly forbidden**:

❌ **Public Cloud Hosting:**
- Netlify, Vercel, Railway, Heroku
- AWS Lambda, Azure Functions, Google Cloud Functions (without VPN tunnel)
- Any serverless platform accessible from public internet
- Any PaaS (Platform-as-a-Service) provider

❌ **Public Infrastructure:**
- AWS EC2, Azure VMs, GCP Compute Engine (without VPN configuration)
- Digital Ocean Droplets, Linode, Vultr
- Personal servers or home networks
- Shared hosting environments

❌ **Public-Facing Deployments:**
- Any infrastructure accessible from public internet
- Any deployment without VPN protection
- Any CDN-distributed builds (Cloudflare Pages, GitHub Pages, etc.)

### ALLOWED Deployments

✅ **Approved deployment environments:**

1. **Local Development Machines**
   - Developer laptops/workstations connected to PubNub VPN
   - `npm start` or `npm run dev` for local testing
   - Recommended for development and testing

2. **Docker Containers (Internal Only)**
   - Containers running on machines within PubNub VPN
   - Distributed internally to team members via private registry
   - Must not be published to public Docker Hub

3. **Internal PubNub Infrastructure**
   - Internal servers with VPN access configured
   - Kubernetes clusters within PubNub network
   - Must follow internal deployment procedures

---

## VPN Requirement

### Mandatory VPN Access

**ALL operations require active connection to PubNub VPN.**

This application accesses `internal-admin.pubnub.com`, which is:
- Only accessible within PubNub corporate VPN
- NOT reachable from public internet
- Protected by network-level access controls

### VPN Connection Verification

Before running the application:

```bash
# Test VPN connectivity
curl https://internal-admin.pubnub.com

# Expected response: 401 Unauthorized (VPN is working)
# Error response: Connection refused/timeout (VPN is NOT connected)
```

### VPN Disconnection Handling

If VPN disconnects during use:
- All API calls will fail with network errors
- User will see "Failed to fetch" errors
- Session tokens remain valid but unusable
- **Solution:** Reconnect VPN and refresh application

---

## Vulnerability Reporting

### Reporting Security Issues

If you discover a security vulnerability in this framework:

1. **DO NOT** open a public GitHub issue
2. **DO NOT** disclose the vulnerability publicly
3. **Immediately contact:** security@pubnub.com
4. **Provide detailed information:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested remediation (if any)

### Response Timeline

- **Initial acknowledgment:** Within 48 hours
- **Preliminary assessment:** Within 5 business days
- **Resolution timeline:** Depends on severity (critical issues prioritized)

### Responsible Disclosure

We request that you:
- Give us reasonable time to address the issue before disclosure
- Avoid exploiting the vulnerability beyond proof-of-concept
- Do not access or modify data beyond what's necessary to demonstrate the issue

---

## Authentication and Authorization

### Credential Management

**Internal Admin Credentials:**
- Obtained through formal internal procedures only
- Never commit to version control
- Never share via email, Slack, or other channels
- Rotate regularly according to security policy

**Session Tokens:**
- Stored in memory only (never localStorage or cookies)
- Automatically expire after inactivity
- Not persisted across browser sessions
- Transmitted only in HTTP headers (never query params or body)

**Environment Variables:**
- Never commit `.env` files containing credentials
- Use `.env.example` templates only
- Store production credentials in secure vaults (1Password, HashiCorp Vault)

### Account Ghosting (Impersonation)

**What is Ghosting:**
- Ability to impersonate customer accounts using `x-pn-delegated-account-id` header
- Allows viewing customer configurations without their credentials
- Requires valid admin session token

**Security Implications:**
- **Access to production customer data**
- All actions are attributed to the admin user (logged)
- Potential GDPR/privacy compliance implications
- Should only be used for support/troubleshooting purposes

**Best Practices:**
- Only ghost accounts when necessary for customer support
- Document reason for ghosting (ticket number, support case)
- Limit ghosting session duration
- Never modify customer data without explicit permission
- Comply with internal data access policies

---

## Data Handling

### Customer Data Access

This framework provides access to sensitive customer data:
- Account IDs and email addresses
- Usage metrics and transaction volumes
- App and keyset configurations
- Feature enablement status

**Data Protection Requirements:**
- Do not export customer data to unsecured locations
- Do not share customer data outside approved channels
- Follow PubNub data classification policies
- Comply with GDPR, SOC2, and other regulations

### Data Storage

**In-Memory Only:**
- Session tokens stored in React state (memory)
- No persistence to disk or browser storage
- Data cleared on logout or browser refresh

**Temporary Caching:**
- Usage data cached temporarily for performance
- Cache cleared on logout
- Cache stored in memory only (not persisted)

**No Local Storage:**
- Do not persist session tokens to localStorage
- Do not persist customer data to browser storage
- Do not cache credentials in any form

### Data in Transit

- All communication to `internal-admin.pubnub.com` over HTTPS
- VPN provides encrypted tunnel
- Session tokens in headers (not query params to avoid logging)

---

## Compliance

### Regulatory Requirements

This tool handles data subject to:

**GDPR (General Data Protection Regulation):**
- Customer email addresses (PII)
- Account identifiers (pseudonymous data)
- Usage patterns (behavioral data)

**SOC2 (System and Organization Controls):**
- Access controls (VPN, admin credentials)
- Audit logging (session tokens, ghosting actions)
- Data encryption (HTTPS, VPN tunnel)

**Internal Policies:**
- PubNub data access policies
- Internal security standards
- Acceptable use policies

### Audit Logging

**What is Logged:**
- Authentication attempts (success/failure)
- Account ghosting actions (delegated account IDs)
- API requests to internal-admin.pubnub.com

**Where Logs are Stored:**
- Internal admin portal logs
- Backend server console logs (in production)
- NOT logged locally in development

**Log Retention:**
- Follow PubNub log retention policies
- Comply with regulatory requirements
- Available for security audits

---

## Network Security

### CORS Configuration

**Development:**
- CORS origin: `*` (localhost only)
- Allows requests from Vite dev server
- **Never deploy with open CORS in production**

**Production:**
- Configure specific allowed origins
- Restrict to internal PubNub domains only
- Never allow public origins

### HTTPS/TLS

**External Communication:**
- All API calls to `internal-admin.pubnub.com` over HTTPS
- TLS 1.2 or higher required
- Certificate validation enforced

**VPN Tunnel:**
- Provides additional encryption layer
- Protects against network-level attacks
- Required for all operations

### No Client-Side Secrets

- API keys never exposed to frontend
- Admin credentials proxied through backend
- Session tokens generated server-side
- No secrets in frontend JavaScript bundle

---

## Secure Coding Practices

### Input Validation

**User Inputs:**
- Email addresses validated on frontend and backend
- Account IDs sanitized before API calls
- Date ranges validated for reasonable limits
- No user input directly interpolated into API URLs

**API Responses:**
- Validate response structure before processing
- Handle unexpected data gracefully
- Don't trust external API data implicitly

### Authentication Checks

**Every API Request:**
- Verify session token presence
- Include session token in headers
- Handle 401/403 responses (logout user)
- Redirect to login on authentication failure

**Frontend Protection:**
- AuthContext wraps entire application
- Unauthenticated users redirected to login
- Session token checked before rendering protected routes

### Error Handling

**User-Facing Errors:**
- Don't expose internal error details
- Generic error messages ("Authentication failed")
- Log detailed errors server-side only

**Sensitive Information:**
- Never log session tokens
- Never log customer passwords
- Redact PII in error logs

---

## Security Checklist for New Deployments

Before deploying any application built from this framework:

- [ ] Verified deployment target is VPN-protected
- [ ] Removed all hardcoded credentials from code
- [ ] Configured `.env` files properly (never committed)
- [ ] Updated CORS settings for production
- [ ] Enabled HTTPS for all endpoints
- [ ] Tested VPN disconnect behavior
- [ ] Reviewed audit logging configuration
- [ ] Documented ghosting procedures
- [ ] Obtained security review approval (if required)
- [ ] Followed internal deployment procedures

---

## Contact Information

### Security Team
- Email: security@pubnub.com
- Slack: #security (internal)

### Framework Maintainers
- DevOps Team
- Platform Team

### Emergency Contacts
- For production incidents: Follow internal incident response procedures
- For security breaches: Contact security@pubnub.com immediately

---

**Last Updated:** February 2026
**Review Frequency:** Quarterly or upon significant changes
