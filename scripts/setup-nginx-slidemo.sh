#!/bin/bash
# Setup nginx config for slidemo.opcgobal.cn → 127.0.0.1:8765
# Usage: ssh opchom 'bash /opt/slidemo/setup-nginx-slidemo.sh'
# Run on the server.

set -e
DOMAIN="slidemo.opcgobal.cn"
UPSTREAM="http://127.0.0.1:8765"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"

echo "=== Setting up nginx site: ${DOMAIN} ==="

# Write the nginx config
cat > "${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Allow certbot to do ACME challenge
    location /.well-known/acme-challenge/ { root /var/www/html; }

    location / {
        return 301 https://\$host\$request_uri;
    }

    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log  /var/log/nginx/${DOMAIN}_error.log;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10M;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/css
        text/javascript
        application/javascript
        application/json
        image/svg+xml;

    location / {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 30s;
        proxy_buffering off;
    }

    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log  /var/log/nginx/${DOMAIN}_error.log;
}
EOF

# Enable the site
ln -sf "${NGINX_SITE}" "/etc/nginx/sites-enabled/${DOMAIN}"

# Test config
echo "Testing nginx config..."
nginx -t

# Reload nginx
echo "Reloading nginx..."
systemctl reload nginx

# Get SSL cert (assumes DNS A record is already set)
echo "Getting SSL cert..."
certbot certonly --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ops@opcglobal.cn --cert-name ${DOMAIN} 2>&1 | tail -10

# Reload nginx again
systemctl reload nginx

echo "=== Done. Site live at: https://${DOMAIN}/ ==="
