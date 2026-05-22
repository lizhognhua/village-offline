/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,  // TODO: 修复所有类型错误后改为 false
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'zc.lizhonghua.vip' },
      { protocol: 'https', hostname: 'paperless.lizhonghua.vip' },
      { protocol: 'https', hostname: 't0.tianditu.gov.cn' },
      { protocol: 'https', hostname: 't1.tianditu.gov.cn' },
      { protocol: 'https', hostname: 't2.tianditu.gov.cn' },
      { protocol: 'https', hostname: 't3.tianditu.gov.cn' },
      { protocol: 'https', hostname: 't4.tianditu.gov.cn' },
      { protocol: 'https', hostname: 't5.tianditu.gov.cn' },
      { protocol: 'https', hostname: 't6.tianditu.gov.cn' },
      { protocol: 'https', hostname: 't7.tianditu.gov.cn' },
      { protocol: 'https', hostname: 'server.arcgisonline.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-src 'self' https://*.lizhonghua.vip http://222.171.139.234:*;" },
        ],
      },
    ];
  },
};
export default nextConfig;
