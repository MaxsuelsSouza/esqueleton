/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpila o pacote compartilhado do monorepo — ele exporta .ts puro
  // (sem build step), então o Next.js precisa compilá-lo junto
  transpilePackages: ['@esqueleton/shared'],
}

export default nextConfig
