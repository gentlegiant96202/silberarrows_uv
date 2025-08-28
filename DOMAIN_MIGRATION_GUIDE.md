# Domain Migration Guide: uv.silberarrows.com → portal.silberarrows.com

## 🎯 Overview
This guide outlines the surgical steps to migrate from `uv.silberarrows.com` to `portal.silberarrows.com` with a deprecation notice.

## 📋 Implementation Checklist

### ✅ Code Changes (Completed)
- [x] Created deprecated page component (`/app/deprecated/page.tsx`)
- [x] Added middleware for domain-based routing (`/middleware.ts`)
- [x] Updated Supabase redirect URLs in AuthProvider
- [x] Auto-redirect functionality (10-second timer)

### 🔧 Supabase Configuration Updates

#### 1. Update Site URL
```sql
-- In Supabase Dashboard > Authentication > URL Configuration
Site URL: https://portal.silberarrows.com
```

#### 2. Update Redirect URLs
```sql
-- In Supabase Dashboard > Authentication > URL Configuration
Redirect URLs:
- https://portal.silberarrows.com/**
- https://portal.silberarrows.com/login?confirmed=true
- https://portal.silberarrows.com/update-password
- http://localhost:3000/** (for development)
- http://localhost:3000/login?confirmed=true (for development)
- http://localhost:3000/update-password (for development)
```

#### 3. Keep Old URLs Temporarily
Keep these URLs for transition period (they'll show deprecation notice):
- https://uv.silberarrows.com/** (shows deprecation page)
- Remove old specific URLs:
  - https://uv.silberarrows.com/login?confirmed=true
  - https://uv.silberarrows.com/update-password

### 🚀 Deployment Steps

#### 1. Vercel Configuration
```bash
# Deploy to new domain
npx vercel --prod

# Add custom domain in Vercel Dashboard:
# 1. Go to Project Settings > Domains
# 2. Add: portal.silberarrows.com
# 3. Configure DNS records as instructed
```

#### 2. DNS Configuration
```dns
# Add these DNS records:
Type: CNAME
Name: portal
Value: cname.vercel-dns.com

# Keep existing UV domain for deprecation notice:
Type: CNAME  
Name: uv
Value: cname.vercel-dns.com
```

#### 3. Environment Variables
Ensure these are set in Vercel:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 📱 Testing Checklist

#### Test on uv.silberarrows.com:
- [ ] Shows deprecation page
- [ ] Auto-redirect works after 10 seconds
- [ ] Manual redirect button works
- [ ] Logo and styling display correctly

#### Test on portal.silberarrows.com:
- [ ] Normal login flow works
- [ ] Signup email confirmation redirects correctly
- [ ] Password reset redirects correctly
- [ ] All existing functionality intact

### 🔄 Migration Timeline

#### Phase 1: Preparation (Day 1)
- Deploy code changes
- Configure new domain
- Update Supabase settings
- Test both domains

#### Phase 2: Communication (Day 2-7)
- Notify users about domain change
- Update bookmarks/documentation
- Monitor for issues

#### Phase 3: Full Migration (Day 8+)
- All traffic uses portal.silberarrows.com
- Keep deprecation page active for 30 days
- Monitor analytics for UV domain usage

### 🛠 Rollback Plan
If issues arise:
1. Revert Supabase redirect URLs
2. Remove middleware domain check
3. Update AuthProvider to use dynamic origin
4. Redeploy with original configuration

### 📊 Monitoring
- Monitor Vercel analytics for both domains
- Track deprecation page visits
- Watch for authentication errors
- Monitor user feedback

## 🚨 Important Notes

1. **Supabase Changes**: Update redirect URLs BEFORE deploying to production
2. **Email Links**: All existing email confirmation/reset links will redirect to new domain
3. **Bookmarks**: Users need to update their bookmarks
4. **API Calls**: Ensure all API endpoints work with new domain
5. **CORS**: Verify CORS settings if using external APIs

## 🆘 Troubleshooting

### Common Issues:
1. **Infinite Redirect**: Check middleware matcher config
2. **Auth Errors**: Verify Supabase redirect URLs
3. **CSS Issues**: Ensure all assets load on new domain
4. **Email Links**: Check Supabase email templates

### Quick Fixes:
```bash
# Clear Vercel cache
npx vercel --prod --force

# Check domain configuration
npx vercel domains ls

# View deployment logs
npx vercel logs
```

## 📞 Support
If you encounter issues during migration:
1. Check Vercel deployment logs
2. Verify Supabase configuration
3. Test in incognito mode
4. Contact system administrator if needed
