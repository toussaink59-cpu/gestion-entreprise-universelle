import type {NextConfig} from "next";
import createNextIntlPlugin from "next-intl/plugin";
const securityHeaders=[
{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},
{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
{key:"Strict-Transport-Security",value:"max-age=31536000"},
{key:"Content-Security-Policy",value:"base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"}];
const nextConfig:NextConfig={cacheComponents:true,partialPrefetching:true,poweredByHeader:false,
async headers(){return [{source:"/:path*",headers:securityHeaders}];},
turbopack:{root:process.cwd(),rules:{"*.css":{loaders:["@tailwindcss/turbopack"],as:"*.css"}}}};
const withNextIntl=createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
