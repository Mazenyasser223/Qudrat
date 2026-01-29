# Deploy Qudrat

## 1. On your machine (push code)

```bash
cd m:\Projects\Qudrat
git add -A
git status
git commit -m "Deploy: student exam submit + score sheet, build fix"
git push origin main
```

## 2. On the server (build and go live)

SSH in, then run the deploy script:

```bash
ssh root@62.72.29.136
cd /root/Qudrat
git pull origin main
bash server/deploy-optimized.sh
```

That script will:

- Pull latest code
- Remove old client build
- Install client deps (if needed)
- Build React app (`DISABLE_ESLINT_PLUGIN=true`, no source maps)
- Copy `client/build/*` to `/var/www/qudrat/`
- Restart pm2 and nginx

## 3. After deploy

1. Hard refresh the site: **Ctrl+F5** (or Cmd+Shift+R on Mac).
2. Test: https://www.quantitative-qudrat.cloud/student — take an exam, submit, and confirm the **score sheet** appears.

## If something fails

- **Build fails on server:**  
  `cd /root/Qudrat/client && npm run build` and check the error.
- **App/API down:**  
  `pm2 logs` and `pm2 restart all`
- **Nginx/static:**  
  `systemctl status nginx` and `tail -f /var/log/nginx/error.log`
